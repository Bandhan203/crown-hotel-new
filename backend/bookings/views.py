from datetime import date

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models, transaction
from django.db.models import Sum
from django.http import HttpResponse, HttpResponseRedirect
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsStaffUser
from rooms.models import Room
from .models import Booking, FolioCharge, Payment, RatePlan
from .serializers import (
    AdminBookingCreateSerializer,
    AdminBookingUpdateSerializer,
    AdminPaymentCreateSerializer,
    BookingCreateSerializer,
    BookingDetailSerializer,
    BookingListSerializer,
    BookingStatusSerializer,
    CalendarBookingSerializer,
    CheckAvailabilitySerializer,
    CheckInSerializer,
    CheckOutSerializer,
    FolioChargeCreateSerializer,
    FolioChargeSerializer,
    GuestRegistrationSerializer,
    InvoiceSerializer,
    PaymentSerializer,
    RatePlanSerializer,
    WalkInSerializer,
    ReservationCreateSerializer,
)
from .services import assign_room, check_availability, sync_booking_payment_status

User = get_user_model()


# ── Public ───────────────────────────────────

class CheckAvailabilityView(APIView):
    """POST /api/check-availability/"""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = CheckAvailabilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        available = check_availability(data['room_type'], data['check_in_date'], data['check_out_date'])
        return Response({
            'available': available.exists(),
            'available_count': available.count(),
        })


# ── Guest ────────────────────────────────────

class CreateBookingView(generics.CreateAPIView):
    """POST /api/bookings/ — create a booking (authenticated user)."""
    serializer_class = BookingCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        room_type = serializer.validated_data['room_type']
        check_in = serializer.validated_data['check_in_date']
        check_out = serializer.validated_data['check_out_date']
        nights = (check_out - check_in).days
        total_price = room_type.price_per_night * nights

        available = check_availability(room_type.id, check_in, check_out)
        if not available.exists():
            raise ValidationError({'detail': 'No rooms available for the selected dates.'})

        room = available.first()
        booking = serializer.save(
            guest=self.request.user,
            room=room,
            total_price=total_price,
            payment_status=Booking.PaymentStatus.UNPAID,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # Return full detail so frontend gets id, booking_ref, etc.
        detail = BookingDetailSerializer(serializer.instance).data
        return Response(detail, status=status.HTTP_201_CREATED)


class MyBookingsListView(generics.ListAPIView):
    """GET /api/bookings/my/ — list own bookings."""
    serializer_class = BookingListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(guest=self.request.user).select_related('room_type', 'room')


class MyBookingDetailView(generics.RetrieveAPIView):
    """GET /api/bookings/my/{id}/ — own booking detail."""
    serializer_class = BookingDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(guest=self.request.user).select_related('room_type', 'room')


class CancelBookingView(APIView):
    """PATCH /api/bookings/my/{id}/cancel/"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            booking = Booking.objects.select_related('room').get(pk=pk, guest=request.user)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status not in ('PENDING', 'CONFIRMED'):
            return Response({'detail': 'Cannot cancel this booking.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            booking.status = 'CANCELLED'
            booking.save(update_fields=['status', 'updated_at'])
            if booking.room:
                booking.room.status = 'AVAILABLE'
                booking.room.save(update_fields=['status'])

        return Response(BookingDetailSerializer(booking).data)


# ── Admin ────────────────────────────────────

class AdminBookingListView(generics.ListAPIView):
    """GET /api/admin/bookings/"""
    queryset = Booking.objects.select_related('guest', 'room_type', 'room').prefetch_related('payments')
    serializer_class = BookingDetailSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['status', 'room_type', 'guest']
    search_fields = ['booking_ref', 'guest__email', 'guest__full_name', 'guest__phone']
    ordering_fields = ['created_at', 'check_in_date', 'total_price']


class AdminBookingDetailView(generics.RetrieveAPIView):
    """GET /api/admin/bookings/{id}/"""
    queryset = Booking.objects.select_related('guest', 'room_type', 'room').prefetch_related('payments')
    serializer_class = BookingDetailSerializer
    permission_classes = [IsAdmin]


class AdminCreateBookingView(generics.CreateAPIView):
    """POST /api/admin/bookings/ — admin manually creates a booking."""
    serializer_class = AdminBookingCreateSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        room_type = serializer.validated_data['room_type']
        check_in = serializer.validated_data['check_in_date']
        check_out = serializer.validated_data['check_out_date']
        nights = (check_out - check_in).days
        total_price = room_type.price_per_night * nights

        available = check_availability(room_type.id, check_in, check_out)
        room = available.first()  # admin can create even if no room auto-assigned

        serializer.save(
            room=room,
            total_price=total_price,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        booking = serializer.instance
        return Response(
            BookingDetailSerializer(booking, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class AdminUpdateBookingView(generics.UpdateAPIView):
    """PATCH /api/admin/bookings/{id}/ — admin edits booking details."""
    queryset = Booking.objects.select_related('room_type')
    serializer_class = AdminBookingUpdateSerializer
    permission_classes = [IsAdmin]
    http_method_names = ['patch']

    def update(self, request, *args, **kwargs):
        booking = self.get_object()
        serializer = self.get_serializer(booking, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Recalculate price if dates changed and no manual override
        check_in = serializer.validated_data.get('check_in_date', booking.check_in_date)
        check_out = serializer.validated_data.get('check_out_date', booking.check_out_date)
        if 'total_price' not in serializer.validated_data:
            nights = (check_out - check_in).days
            serializer.validated_data['total_price'] = booking.room_type.price_per_night * nights

        serializer.save()
        return Response(BookingDetailSerializer(booking, context={'request': request}).data)


class AdminDeleteBookingView(generics.DestroyAPIView):
    """DELETE /api/admin/bookings/{id}/"""
    queryset = Booking.objects.select_related('room')
    permission_classes = [IsAdmin]

    def perform_destroy(self, instance):
        with transaction.atomic():
            # Release room if booking was active
            if instance.room and instance.status in ('CONFIRMED', 'CHECKED_IN'):
                instance.room.status = 'AVAILABLE'
                instance.room.save(update_fields=['status'])
            instance.delete()


class AdminBookingStatusView(APIView):
    """PATCH /api/admin/bookings/{id}/status/ — update booking status with room sync."""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            booking = Booking.objects.select_related('room').get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        valid_statuses = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']
        if new_status not in valid_statuses:
            return Response(
                {'detail': f'Invalid status. Must be one of: {valid_statuses}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            booking.status = new_status
            booking.save(update_fields=['status', 'updated_at'])

            if booking.room:
                if new_status == 'CHECKED_IN':
                    booking.room.status = 'OCCUPIED'
                    booking.room.save(update_fields=['status'])
                elif new_status in ('CHECKED_OUT', 'CANCELLED'):
                    booking.room.status = 'AVAILABLE'
                    booking.room.save(update_fields=['status'])

        booking.refresh_from_db()
        return Response(BookingDetailSerializer(booking, context={'request': request}).data)


class AdminAssignRoomView(APIView):
    """PATCH /api/admin/bookings/{id}/assign-room/ — manually assign a room."""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            booking = Booking.objects.select_related('room', 'room_type').get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        room_id = request.data.get('room_id')
        if not room_id:
            return Response({'detail': 'room_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            room = Room.objects.get(pk=room_id)
        except Room.DoesNotExist:
            return Response({'detail': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        if room.room_type_id != booking.room_type_id:
            return Response(
                {'detail': 'Room type does not match booking room type.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check no conflicting active bookings on this room
        conflict = Booking.objects.filter(
            room=room,
            check_in_date__lt=booking.check_out_date,
            check_out_date__gt=booking.check_in_date,
            status__in=['PENDING', 'CONFIRMED', 'CHECKED_IN'],
        ).exclude(pk=booking.pk)

        if conflict.exists():
            return Response(
                {'detail': 'Room has conflicting bookings for these dates.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.room = room
        booking.save(update_fields=['room', 'updated_at'])
        return Response(BookingDetailSerializer(booking, context={'request': request}).data)


# ── Payments ─────────────────────────────────

class AdminPaymentListView(generics.ListAPIView):
    """GET /api/admin/payments/"""
    queryset = Payment.objects.select_related('booking__guest').order_by('-created_at')
    serializer_class = PaymentSerializer
    permission_classes = [IsAdmin]


# ── Walk-in ──────────────────────────────────

class WalkInBookingView(APIView):
    """POST /api/admin/reservations/walk-in/ — create walk-in reservation + check-in."""
    permission_classes = [IsStaffUser]

    def post(self, request):
        serializer = WalkInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from rooms.models import RoomType
        try:
            room_type = RoomType.objects.get(pk=data['room_type'])
        except RoomType.DoesNotExist:
            return Response({'detail': 'Room type not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Get or create guest user — build full_name from first+last
        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        full_name = f"{first_name} {last_name}".strip() or first_name or 'Guest'

        guest, created = User.objects.get_or_create(
            email=data['guest_email'],
            defaults={
                'full_name': full_name,
                'phone': data.get('guest_phone', ''),
                'role': 'GUEST',
            }
        )
        if created:
            guest.set_unusable_password()
            guest.save()
        else:
            guest.full_name = full_name
            if data.get('guest_phone'):
                guest.phone = data['guest_phone']
            guest.save(update_fields=['full_name', 'phone'])

        nights = (data['check_out_date'] - data['check_in_date']).days
        rack = data.get('rack_rate') or room_type.price_per_night
        offer = data.get('offer_rate') or rack
        discount = data.get('discount_amount', 0)
        total_price = max(0, (float(offer) * nights) - float(discount))
        if total_price <= 0:
            total_price = float(rack) * nights

        with transaction.atomic():
            # Save / update guest profile
            from accounts.models import GuestProfile
            profile, _ = GuestProfile.objects.get_or_create(user=guest)
            profile_updates = {
                'first_name': data.get('first_name', ''),
                'last_name': data.get('last_name', ''),
                'designation': data.get('designation', ''),
                'date_of_birth': data.get('date_of_birth'),
                'gender': data.get('gender', ''),
                'nationality': data.get('nationality', ''),
                'country': data.get('country', ''),
                'address_line1': data.get('address', ''),
                'occupation': data.get('occupation', ''),
                'place_of_issue': data.get('place_of_issue', ''),
                'visa_no': data.get('visa_no', ''),
                'id_type': data.get('id_type', ''),
                'id_number': data.get('id_number', ''),
            }
            for field, value in profile_updates.items():
                if value is not None and value != '':
                    setattr(profile, field, value)
            profile.save()
            # Find/assign room (date-aware availability)
            room = None
            if data.get('room_id'):
                room = check_availability(
                    room_type.id, data['check_in_date'], data['check_out_date']
                ).filter(pk=data['room_id']).first()
                if not room:
                    return Response(
                        {'detail': 'Selected room is not available for these dates.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                room = assign_room(room_type.id, data['check_in_date'], data['check_out_date'])
                if not room:
                    return Response({'detail': 'No rooms available.'}, status=status.HTTP_400_BAD_REQUEST)

            booking = Booking.objects.create(
                guest=guest,
                room=room,
                room_type=room_type,
                check_in_date=data['check_in_date'],
                check_out_date=data['check_out_date'],
                arrival_time=data.get('arrival_time'),
                adults=data['adults'],
                children=data['children'],
                total_price=total_price,
                grand_total=total_price,
                rack_rate=rack,
                offer_rate=offer,
                discount_amount=discount,
                status='CHECKED_IN',
                booking_source=data.get('booking_source', 'WALK_IN'),
                id_type=data.get('id_type', ''),
                id_number=data.get('id_number', ''),
                deposit_amount=data.get('deposit_amount', 0),
                special_requests=data.get('special_requests', ''),
                company_name=data.get('company_name', ''),
                guest_type=data.get('guest_type', ''),
                purpose_of_visit=data.get('purpose_of_visit', ''),
                coming_from=data.get('coming_from', ''),
                extra_bed=data.get('extra_bed', 0),
                actual_check_in=timezone.now(),
                checked_in_by=request.user,
            )

            room.status = 'OCCUPIED'
            room.save(update_fields=['status'])

            # Post deposit to folio if provided
            if booking.deposit_amount > 0:
                FolioCharge.objects.create(
                    booking=booking,
                    charge_type='DEPOSIT',
                    description='Security deposit',
                    amount=-booking.deposit_amount,
                    quantity=1,
                    total=-booking.deposit_amount,
                    charge_date=data['check_in_date'],
                    posted_by=request.user,
                )

        return Response(BookingDetailSerializer(booking).data, status=status.HTTP_201_CREATED)


# ── Reservation Create (future booking, not checked-in) ──────────────────

class ReservationCreateView(APIView):
    """POST /api/admin/reservations/create/ — create a future reservation (CONFIRMED/PENDING)."""
    permission_classes = [IsStaffUser]

    def post(self, request):
        serializer = ReservationCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from rooms.models import RoomType
        try:
            room_type = RoomType.objects.get(pk=data['room_type'])
        except RoomType.DoesNotExist:
            return Response({'detail': 'Room type not found.'}, status=status.HTTP_404_NOT_FOUND)

        first_name = data.get('first_name', '').strip()
        last_name = data.get('last_name', '').strip()
        full_name = f"{first_name} {last_name}".strip() or 'Guest'

        guest, created = User.objects.get_or_create(
            email=data['guest_email'],
            defaults={
                'full_name': full_name,
                'phone': data.get('guest_phone', ''),
                'role': 'GUEST',
            }
        )
        if created:
            guest.set_unusable_password()
            guest.save()
        else:
            guest.full_name = full_name
            if data.get('guest_phone'):
                guest.phone = data['guest_phone']
            guest.save(update_fields=['full_name', 'phone'])

        nights = (data['check_out_date'] - data['check_in_date']).days
        rack = data.get('rack_rate') or room_type.price_per_night
        offer = data.get('offer_rate') or rack
        discount = data.get('discount_amount', 0)
        total_price = max(0, (float(offer) * nights) - float(discount))
        if total_price <= 0:
            total_price = float(rack) * nights

        with transaction.atomic():
            from accounts.models import GuestProfile
            profile, _ = GuestProfile.objects.get_or_create(user=guest)
            for field, value in {
                'first_name': data.get('first_name', ''),
                'last_name': data.get('last_name', ''),
                'designation': data.get('designation', ''),
                'date_of_birth': data.get('date_of_birth'),
                'gender': data.get('gender', ''),
                'nationality': data.get('nationality', ''),
                'country': data.get('country', ''),
                'address_line1': data.get('address', ''),
                'occupation': data.get('occupation', ''),
                'place_of_issue': data.get('place_of_issue', ''),
                'visa_no': data.get('visa_no', ''),
                'id_type': data.get('id_type', ''),
                'id_number': data.get('id_number', ''),
            }.items():
                if value is not None and value != '':
                    setattr(profile, field, value)
            profile.save()

            # Optionally pre-assign room if provided (must be available for dates)
            room = None
            if data.get('room_id'):
                room = check_availability(
                    room_type.id, data['check_in_date'], data['check_out_date']
                ).filter(pk=data['room_id']).first()
                if not room:
                    return Response(
                        {'detail': 'Selected room is not available for these dates.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Resolve rate plan FK
            from bookings.models import RatePlan
            rate_plan_obj = None
            if data.get('rate_plan'):
                try:
                    rate_plan_obj = RatePlan.objects.get(pk=data['rate_plan'])
                except RatePlan.DoesNotExist:
                    pass

            # Build grand total with service charge + VAT
            svc_pct = float(data.get('service_charge_pct', 0) or 0)
            vat_pct_val = float(data.get('vat_pct', 0) or 0)
            service_charge_amount = total_price * svc_pct / 100
            vat_amount = total_price * vat_pct_val / 100
            grand = total_price + service_charge_amount + vat_amount

            booking = Booking.objects.create(
                guest=guest,
                room=room,
                room_type=room_type,
                rate_plan=rate_plan_obj,
                check_in_date=data['check_in_date'],
                check_out_date=data['check_out_date'],
                arrival_time=data.get('arrival_time'),
                adults=data['adults'],
                children=data['children'],
                infants=data.get('infants', 0),
                extra_bed=data.get('extra_bed', 0),
                num_rooms=data.get('num_rooms', 1),
                total_price=total_price,
                grand_total=grand,
                rack_rate=rack,
                offer_rate=offer,
                discount_pct=data.get('discount_pct', 0),
                discount_amount=discount,
                service_charge_pct=svc_pct,
                vat_pct=vat_pct_val,
                tax_amount=round(service_charge_amount + vat_amount, 2),
                deposit_amount=data.get('deposit_amount', 0),
                status=data.get('status', 'CONFIRMED'),
                booking_source=data.get('booking_source', 'PHONE'),
                id_type=data.get('id_type', ''),
                id_number=data.get('id_number', ''),
                company_name=data.get('company_name', ''),
                contact_person=data.get('contact_person', ''),
                guest_type=data.get('guest_type', ''),
                purpose_of_visit=data.get('purpose_of_visit', ''),
                coming_from=data.get('coming_from', ''),
                special_requests=data.get('special_requests', ''),
                profile_note=data.get('profile_note', ''),
                dnm=data.get('dnm', False),
                no_post=data.get('no_post', False),
                is_travel_agency=data.get('is_travel_agency', False),
                non_smoking=data.get('non_smoking', False),
                pickup_required=data.get('pickup_required', 'NO'),
                flight_pickup_no=data.get('flight_pickup_no', ''),
                flight_eta=data.get('flight_eta', ''),
                drop_required=data.get('drop_required', 'NO'),
                flight_drop_no=data.get('flight_drop_no', ''),
                flight_etd=data.get('flight_etd', ''),
                meal_plan=data.get('meal_plan', 'EP'),
                arrival_mode=data.get('arrival_mode', ''),
                vehicle_assigned=data.get('vehicle_assigned', ''),
            )

            # Record advance payment if provided
            payment_amount = float(data.get('payment_amount', 0) or 0)
            if payment_amount > 0:
                Payment.objects.create(
                    booking=booking,
                    amount=payment_amount,
                    payment_method=data.get('payment_method', 'CASH'),
                    status='COMPLETED',
                    paid_at=timezone.now(),
                )
                sync_booking_payment_status(booking)

            # Post security deposit to folio
            if booking.deposit_amount > 0:
                FolioCharge.objects.create(
                    booking=booking,
                    charge_type='DEPOSIT',
                    description='Security deposit',
                    amount=-booking.deposit_amount,
                    quantity=1,
                    total=-booking.deposit_amount,
                    charge_date=data['check_in_date'],
                    posted_by=request.user,
                )

        return Response(BookingDetailSerializer(booking).data, status=status.HTTP_201_CREATED)


# ── Check-in ─────────────────────────────────

class CheckInView(APIView):
    """POST /api/admin/reservations/{id}/check-in/"""
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            booking = Booking.objects.select_related('room', 'room_type').get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status not in ('PENDING', 'CONFIRMED'):
            return Response(
                {'detail': f'Cannot check in a booking with status {booking.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            # Assign room if provided or auto-assign (exclude this booking from overlap check)
            if data.get('room_id'):
                room = check_availability(
                    booking.room_type_id,
                    booking.check_in_date,
                    booking.check_out_date,
                    exclude_booking_id=booking.id,
                ).filter(pk=data['room_id']).first()
                if not room:
                    return Response(
                        {'detail': 'Selected room is not available for these dates.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                booking.room = room
            elif not booking.room:
                room = assign_room(
                    booking.room_type_id,
                    booking.check_in_date,
                    booking.check_out_date,
                    exclude_booking_id=booking.id,
                )
                if not room:
                    return Response({'detail': 'No rooms available for auto-assignment.'}, status=status.HTTP_400_BAD_REQUEST)
                booking.room = room
            elif booking.room:
                # Pre-assigned room: ensure still available
                still_ok = check_availability(
                    booking.room_type_id,
                    booking.check_in_date,
                    booking.check_out_date,
                    exclude_booking_id=booking.id,
                ).filter(pk=booking.room_id).exists()
                if not still_ok:
                    return Response(
                        {'detail': 'Pre-assigned room is no longer available.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            booking.status = 'CHECKED_IN'
            booking.actual_check_in = timezone.now()
            booking.checked_in_by = request.user
            if data.get('id_type'):
                booking.id_type = data['id_type']
            if data.get('id_number'):
                booking.id_number = data['id_number']
            if data.get('deposit_amount'):
                booking.deposit_amount = data['deposit_amount']
            if data.get('notes_internal'):
                booking.notes_internal = data['notes_internal']
            if data.get('guest_type'):
                booking.guest_type = data['guest_type']
            if data.get('purpose_of_visit'):
                booking.purpose_of_visit = data['purpose_of_visit']
            if data.get('coming_from'):
                booking.coming_from = data['coming_from']
            if data.get('extra_bed'):
                booking.extra_bed = data['extra_bed']
            # Store rack rate from room type
            booking.rack_rate = booking.room_type.price_per_night
            booking.offer_rate = booking.room_type.price_per_night
            booking.save()

            # Set room to occupied
            booking.room.status = 'OCCUPIED'
            booking.room.save(update_fields=['status'])

            # Post deposit to folio
            if booking.deposit_amount > 0:
                FolioCharge.objects.create(
                    booking=booking,
                    charge_type='DEPOSIT',
                    description='Security deposit',
                    amount=-booking.deposit_amount,
                    quantity=1,
                    total=-booking.deposit_amount,
                    charge_date=booking.check_in_date,
                    posted_by=request.user,
                )

        booking.refresh_from_db()
        return Response(BookingDetailSerializer(booking).data)


# ── Check-out ────────────────────────────────

class CheckOutView(APIView):
    """POST /api/admin/reservations/{id}/check-out/"""
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            booking = Booking.objects.select_related('room', 'room_type', 'guest').get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status != 'CHECKED_IN':
            return Response(
                {'detail': f'Cannot check out a booking with status {booking.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CheckOutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            # Calculate folio balance
            folio_total = FolioCharge.objects.filter(
                booking=booking, is_void=False
            ).aggregate(total=Sum('total'))['total'] or 0

            payments_total = Payment.objects.filter(
                booking=booking, status='COMPLETED'
            ).aggregate(total=Sum('amount'))['total'] or 0

            room_charges = float(booking.total_price)
            balance = room_charges + float(folio_total) - float(payments_total)

            # Record payment if provided
            payment_amount = float(data.get('payment_amount', 0))
            if payment_amount > 0:
                Payment.objects.create(
                    booking=booking,
                    amount=payment_amount,
                    payment_method=data.get('payment_method', 'CASH'),
                    status='COMPLETED',
                    paid_at=timezone.now(),
                )
                payments_total = float(payments_total) + payment_amount
                balance = room_charges + float(folio_total) - float(payments_total)

            if balance > 0.01:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'detail': 'Payment not clear. Full payment must be completed before check-out.'})

            # Update booking
            booking.status = 'CHECKED_OUT'
            booking.actual_check_out = timezone.now()
            booking.checked_out_by = request.user
            if data.get('notes_internal'):
                booking.notes_internal = (booking.notes_internal + '\n' + data['notes_internal']).strip()
            booking.save()

            # Release room and mark dirty
            if booking.room:
                booking.room.status = 'AVAILABLE'
                booking.room.housekeeping_status = 'DIRTY'
                booking.room.save(update_fields=['status', 'housekeeping_status'])

        booking.refresh_from_db()

        # Send checkout invoice email
        from common.email import send_checkout_invoice
        send_checkout_invoice(booking)

        return Response({
            'booking': BookingDetailSerializer(booking).data,
            'folio_balance': round(balance, 2),
            'total_charges': round(room_charges + float(folio_total), 2),
            'total_payments': round(float(payments_total), 2),
        })


# ── No-show ──────────────────────────────────

class NoShowView(APIView):
    """PATCH /api/admin/reservations/{id}/no-show/"""
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        try:
            booking = Booking.objects.select_related('room').get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status not in ('PENDING', 'CONFIRMED'):
            return Response({'detail': 'Cannot mark as no-show.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            booking.no_show = True
            booking.status = 'CANCELLED'
            booking.cancelled_at = timezone.now()
            booking.cancellation_reason = 'No-show'
            booking.save()
            if booking.room:
                booking.room.status = 'AVAILABLE'
                booking.room.save(update_fields=['status'])

        return Response(BookingDetailSerializer(booking).data)


# ── Arrivals / Departures / In-house ─────────

class ArrivalsListView(generics.ListAPIView):
    """GET /api/admin/reservations/arrivals/ — today's expected arrivals."""
    serializer_class = BookingDetailSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        target_date = self.request.query_params.get('date', date.today().isoformat())
        return Booking.objects.filter(
            check_in_date=target_date,
            status__in=['PENDING', 'CONFIRMED'],
        ).select_related('guest', 'room_type', 'room').prefetch_related('payments')


class DeparturesListView(generics.ListAPIView):
    """GET /api/admin/reservations/departures/ — today's expected departures."""
    serializer_class = BookingDetailSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        target_date = self.request.query_params.get('date', date.today().isoformat())
        return Booking.objects.filter(
            check_out_date=target_date,
            status='CHECKED_IN',
        ).select_related('guest', 'room_type', 'room').prefetch_related('payments')


class InHouseListView(generics.ListAPIView):
    """GET /api/admin/reservations/in-house/ — currently checked-in guests."""
    serializer_class = BookingDetailSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return Booking.objects.filter(
            status='CHECKED_IN',
        ).select_related('guest', 'room_type', 'room').prefetch_related('payments')


# ── Available rooms (reservation / check-in picker) ─────

class AvailableRoomsView(APIView):
    """GET /api/admin/reservations/available-rooms/?room_type=&check_in_date=&check_out_date=&exclude_booking="""
    permission_classes = [IsStaffUser]

    def get(self, request):
        room_type_id = request.query_params.get('room_type')
        check_in = request.query_params.get('check_in_date')
        check_out = request.query_params.get('check_out_date')
        exclude_booking = request.query_params.get('exclude_booking')

        if not all([room_type_id, check_in, check_out]):
            return Response(
                {'detail': 'room_type, check_in_date, and check_out_date are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            exclude_id = int(exclude_booking) if exclude_booking else None
        except (TypeError, ValueError):
            exclude_id = None

        try:
            check_in_date = date.fromisoformat(check_in)
            check_out_date = date.fromisoformat(check_out)
        except ValueError:
            return Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if check_in_date >= check_out_date:
            return Response({'rooms': [], 'count': 0})

        available = check_availability(
            int(room_type_id), check_in_date, check_out_date, exclude_booking_id=exclude_id
        )
        rooms_data = [
            {
                'id': r.id,
                'room_number': r.room_number,
                'floor': r.floor,
                'status': r.status,
                'room_type': r.room_type.name,
                'room_type_id': r.room_type_id,
            }
            for r in available
        ]
        return Response({'rooms': rooms_data, 'count': len(rooms_data)})


# ── Calendar ─────────────────────────────────

class CalendarView(APIView):
    """GET /api/admin/reservations/calendar/?start_date=...&end_date=..."""
    permission_classes = [IsStaffUser]

    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date or not end_date:
            return Response(
                {'detail': 'start_date and end_date are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rooms = Room.objects.select_related('room_type').all()
        bookings = Booking.objects.filter(
            check_in_date__lte=end_date,
            check_out_date__gte=start_date,
            status__in=['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'],
        ).select_related('guest', 'room')

        rooms_data = [
            {
                'id': r.id,
                'room_number': r.room_number,
                'room_type': r.room_type.name,
                'room_type_id': r.room_type_id,
                'floor': r.floor,
                'status': r.status,
                'housekeeping_status': r.housekeeping_status,
            }
            for r in rooms
        ]

        bookings_data = CalendarBookingSerializer(bookings, many=True).data

        maintenance_rooms = rooms.filter(status='MAINTENANCE')
        maintenance_data = [
            {
                'room_id': r.id,
                'room_number': r.room_number,
                'reason': r.notes or 'Maintenance',
            }
            for r in maintenance_rooms
        ]

        return Response({
            'rooms': rooms_data,
            'bookings': bookings_data,
            'maintenance': maintenance_data,
        })


# ── Folio ────────────────────────────────────

class FolioListCreateView(APIView):
    """
    GET  /api/admin/bookings/{id}/folio/ — list charges
    POST /api/admin/bookings/{id}/folio/ — add charge
    """
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        charges = FolioCharge.objects.filter(booking=booking).select_related('posted_by')
        folio_total = charges.filter(is_void=False).aggregate(total=Sum('total'))['total'] or 0
        payments_total = Payment.objects.filter(
            booking=booking, status='COMPLETED'
        ).aggregate(total=Sum('amount'))['total'] or 0
        room_charges = float(booking.total_price)

        return Response({
            'charges': FolioChargeSerializer(charges, many=True).data,
            'summary': {
                'room_charges': room_charges,
                'folio_total': float(folio_total),
                'payments_total': float(payments_total),
                'balance': round(room_charges + float(folio_total) - float(payments_total), 2),
            },
        })

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = FolioChargeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        charge = FolioCharge.objects.create(
            booking=booking,
            posted_by=request.user,
            **data,
        )
        return Response(FolioChargeSerializer(charge).data, status=status.HTTP_201_CREATED)


class FolioVoidView(APIView):
    """PATCH /api/admin/folio/{charge_id}/void/"""
    permission_classes = [IsAdmin]

    def patch(self, request, charge_id):
        try:
            charge = FolioCharge.objects.get(pk=charge_id)
        except FolioCharge.DoesNotExist:
            return Response({'detail': 'Charge not found.'}, status=status.HTTP_404_NOT_FOUND)

        charge.is_void = True
        charge.save(update_fields=['is_void'])
        return Response(FolioChargeSerializer(charge).data)


# ── Invoice ──────────────────────────────────

class InvoiceView(APIView):
    """GET /api/admin/bookings/{id}/invoice/"""
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        try:
            booking = Booking.objects.select_related(
                'guest', 'room_type', 'room'
            ).prefetch_related('folio_charges', 'payments').get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response(InvoiceSerializer(booking).data)


class GuestInvoiceView(APIView):
    """GET /api/bookings/my/{id}/invoice/ — guest downloads own invoice."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            booking = Booking.objects.select_related(
                'guest', 'room_type', 'room'
            ).prefetch_related('folio_charges', 'payments').get(pk=pk, guest=request.user)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status not in ('CHECKED_OUT', 'CANCELLED'):
            return Response({'detail': 'Invoice available after checkout.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response(InvoiceSerializer(booking).data)


class InvoicePDFView(APIView):
    """GET /api/admin/bookings/{id}/invoice/pdf/ — download invoice PDF."""
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        try:
            booking = Booking.objects.select_related(
                'guest', 'room_type', 'room'
            ).get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        from .invoice import generate_invoice_pdf
        pdf_bytes = generate_invoice_pdf(booking)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{booking.booking_ref}.pdf"'
        return response


class GuestInvoicePDFView(APIView):
    """GET /api/bookings/my/{id}/invoice/pdf/ — guest downloads own invoice PDF."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            booking = Booking.objects.select_related(
                'guest', 'room_type', 'room'
            ).get(pk=pk, guest=request.user)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status not in ('CHECKED_OUT', 'CANCELLED'):
            return Response({'detail': 'Invoice available after checkout.'}, status=status.HTTP_400_BAD_REQUEST)

        from .invoice import generate_invoice_pdf
        pdf_bytes = generate_invoice_pdf(booking)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{booking.booking_ref}.pdf"'
        return response


# ── Guest Registration ───────────────────────

class GuestRegistrationView(APIView):
    """
    GET  /api/admin/reservations/{id}/registration/ — full registration data
    PUT  /api/admin/reservations/{id}/registration/ — update registration
    """
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        try:
            booking = Booking.objects.select_related(
                'guest', 'room_type', 'room', 'rate_plan'
            ).get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        from accounts.models import GuestProfile
        profile, _ = GuestProfile.objects.get_or_create(user=booking.guest)

        data = {
            # Read-only booking info
            'booking_id': booking.id,
            'booking_ref': booking.booking_ref,
            'status': booking.status,
            'guest_id': booking.guest_id,
            'guest_email': booking.guest.email,
            'guest_phone': booking.guest.phone,
            'room_type_name': booking.room_type.name if booking.room_type else '',
            'room_number': booking.room.room_number if booking.room else '',
            'check_in_date': booking.check_in_date,
            'check_out_date': booking.check_out_date,
            'arrival_time': booking.arrival_time,
            'nights': booking.nights,
            'adults': booking.adults,
            'children': booking.children,
            'infants': booking.infants,
            'contact_person': booking.contact_person,
            'deposit_amount': str(booking.deposit_amount),
            'total_price': str(booking.total_price),
            'created_at': booking.created_at,

            # Editable booking fields
            'guest_type': booking.guest_type,
            'purpose_of_visit': booking.purpose_of_visit,
            'coming_from': booking.coming_from,
            'extra_bed': booking.extra_bed,
            'rack_rate': str(booking.rack_rate),
            'offer_rate': str(booking.offer_rate),
            'discount_pct': str(booking.discount_pct),
            'discount_amount': str(booking.discount_amount),
            'service_charge_pct': str(booking.service_charge_pct),
            'vat_pct': str(booking.vat_pct),
            'special_requests': booking.special_requests,
            'profile_note': booking.profile_note,
            'company_name': booking.company_name,
            'booking_source': booking.booking_source,
            'id_type': booking.id_type,
            'id_number': booking.id_number,
            'registration_card': request.build_absolute_uri(booking.registration_card.url) if booking.registration_card else None,
            # Flags
            'num_rooms': booking.num_rooms,
            'dnm': booking.dnm,
            'no_post': booking.no_post,
            'is_travel_agency': booking.is_travel_agency,
            'non_smoking': booking.non_smoking,
            # Flight
            'pickup_required': booking.pickup_required,
            'flight_pickup_no': booking.flight_pickup_no,
            'flight_eta': booking.flight_eta,
            'drop_required': booking.drop_required,
            'flight_drop_no': booking.flight_drop_no,
            'flight_etd': booking.flight_etd,

            # Guest profile fields
            'first_name': profile.first_name,
            'last_name': profile.last_name,
            'designation': profile.designation,
            'date_of_birth': profile.date_of_birth,
            'gender': profile.gender,
            'nationality': profile.nationality,
            'country': profile.country,
            'address': profile.address_line1,
            'occupation': profile.occupation,
            'place_of_issue': profile.place_of_issue,
            'visa_no': profile.visa_no,
        }
        return Response(data)

    def put(self, request, pk):
        try:
            booking = Booking.objects.select_related('guest', 'room_type').get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = GuestRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        from accounts.models import GuestProfile
        profile, _ = GuestProfile.objects.get_or_create(user=booking.guest)

        # Update booking fields
        booking_fields = [
            'guest_type', 'purpose_of_visit', 'coming_from', 'extra_bed',
            'rack_rate', 'offer_rate', 'discount_pct', 'discount_amount',
            'service_charge_pct', 'vat_pct',
            'special_requests', 'profile_note',
            'company_name', 'booking_source', 'arrival_time', 'id_type', 'id_number',
            'contact_person', 'infants', 'deposit_amount', 'num_rooms',
            'dnm', 'no_post', 'is_travel_agency', 'non_smoking',
            'pickup_required', 'flight_pickup_no', 'flight_eta',
            'drop_required', 'flight_drop_no', 'flight_etd',
        ]
        for f in booking_fields:
            if f in d:
                setattr(booking, f, d[f])

        # Recalculate stay total when rates change
        if any(k in d for k in ('rack_rate', 'offer_rate', 'discount_pct', 'discount_amount', 'service_charge_pct', 'vat_pct')):
            nights = booking.nights
            offer = float(booking.offer_rate or booking.rack_rate or booking.room_type.price_per_night)
            disc = float(booking.discount_amount or 0)
            subtotal = max(0, offer * nights - disc)
            svc = subtotal * float(booking.service_charge_pct or 0) / 100
            vat = subtotal * float(booking.vat_pct or 0) / 100
            booking.total_price = subtotal
            booking.tax_amount = round(svc + vat, 2)
            booking.grand_total = round(subtotal + svc + vat, 2)

        booking.save()

        # Sync guest display name from profile
        if 'first_name' in d or 'last_name' in d:
            fn = d.get('first_name', profile.first_name)
            ln = d.get('last_name', profile.last_name)
            booking.guest.full_name = f"{fn} {ln}".strip() or fn or booking.guest.full_name
            booking.guest.save(update_fields=['full_name'])

        # Update guest profile fields
        profile_map = {
            'first_name': 'first_name',
            'last_name': 'last_name',
            'designation': 'designation',
            'date_of_birth': 'date_of_birth',
            'gender': 'gender',
            'nationality': 'nationality',
            'country': 'country',
            'address': 'address_line1',
            'occupation': 'occupation',
            'place_of_issue': 'place_of_issue',
            'visa_no': 'visa_no',
        }
        for src, dst in profile_map.items():
            if src in d:
                setattr(profile, dst, d[src])
        profile.save()

        return Response({'detail': 'Registration updated.'})


class RegistrationCardUploadView(APIView):
    """POST /api/admin/reservations/{id}/registration/upload/ — upload registration card."""
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        card_file = request.FILES.get('registration_card')
        if not card_file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type
        allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if card_file.content_type not in allowed:
            return Response(
                {'detail': 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.registration_card = card_file
        booking.save(update_fields=['registration_card'])
        url = request.build_absolute_uri(booking.registration_card.url) if booking.registration_card else None
        return Response({'registration_card': url})


# ── Rate Plans ───────────────────────────────

class RatePlanListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/rate-plans/"""
    queryset = RatePlan.objects.all()
    serializer_class = RatePlanSerializer
    permission_classes = [IsAdmin]


class RatePlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/admin/rate-plans/{id}/"""
    queryset = RatePlan.objects.all()
    serializer_class = RatePlanSerializer
    permission_classes = [IsAdmin]


class PublicRatePlanListView(generics.ListAPIView):
    """GET /api/rate-plans/available/?room_type=&check_in_date=&check_out_date="""
    serializer_class = RatePlanSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        from bookings.services import get_applicable_rate_plans

        room_type = self.request.query_params.get('room_type')
        check_in = self.request.query_params.get('check_in_date')
        check_out = self.request.query_params.get('check_out_date')

        if room_type and check_in and check_out:
            try:
                check_in_date = date.fromisoformat(check_in)
                check_out_date = date.fromisoformat(check_out)
                return get_applicable_rate_plans(int(room_type), check_in_date, check_out_date)
            except (ValueError, TypeError):
                pass

        today = date.today()
        return RatePlan.objects.filter(is_active=True).filter(
            models.Q(valid_from__isnull=True) | models.Q(valid_from__lte=today),
            models.Q(valid_to__isnull=True) | models.Q(valid_to__gte=today),
        )


class AdminPaymentCreateView(generics.CreateAPIView):
    """POST /api/admin/bookings/{booking_id}/payments/ — record a payment."""
    serializer_class = AdminPaymentCreateSerializer
    permission_classes = [IsAdmin]

    def perform_create(self, serializer):
        booking_id = self.kwargs['booking_id']
        try:
            booking = Booking.objects.get(pk=booking_id)
        except Booking.DoesNotExist:
            raise ValidationError({'detail': 'Booking not found.'})

        serializer.save(
            booking=booking,
            status=Payment.Status.COMPLETED,
            paid_at=timezone.now(),
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(PaymentSerializer(serializer.instance).data, status=status.HTTP_201_CREATED)


# ── SSLCommerz Payment Gateway ───────────────

class PaymentInitiateView(APIView):
    """POST /api/payments/initiate/ — start SSLCommerz payment session."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        if not booking_id:
            return Response({'detail': 'booking_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from .payment_gateway import _get_config
        cfg = _get_config()
        if not cfg['is_active']:
            return Response({'detail': 'Online payment is currently disabled.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            booking = Booking.objects.get(pk=booking_id, guest=request.user)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.payment_status == Booking.PaymentStatus.PAID:
            return Response({'detail': 'Booking is already paid.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .payment_gateway import initiate_payment
            response = initiate_payment(booking, request)

            if response.get('status') == 'SUCCESS':
                # Save session key on a pending payment record
                payment = Payment.objects.create(
                    booking=booking,
                    amount=booking.total_price,
                    payment_method=Payment.Method.ONLINE,
                    transaction_id=booking.booking_ref,
                    status=Payment.Status.PENDING,
                    session_key=response.get('sessionkey', ''),
                )
                return Response({
                    'payment_url': response['GatewayPageURL'],
                    'session_key': response.get('sessionkey', ''),
                    'payment_id': payment.id,
                })
            else:
                return Response({
                    'detail': 'Failed to initiate payment.',
                    'reason': response.get('failedreason', ''),
                }, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({'detail': str(e), 'trace': traceback.format_exc()}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class PaymentIPNView(APIView):
    """POST /api/payments/ipn/ — SSLCommerz IPN (source of truth)."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        from .payment_gateway import validate_ipn
        import logging
        logger = logging.getLogger(__name__)

        post_data = request.data
        tran_id = post_data.get('tran_id', '')
        ssl_status = post_data.get('status', '')

        logger.info('SSLCommerz IPN: tran_id=%s status=%s', tran_id, ssl_status)

        if ssl_status != 'VALID':
            Payment.objects.filter(
                transaction_id=tran_id, status=Payment.Status.PENDING
            ).update(status=Payment.Status.FAILED)
            return Response({'status': 'FAIL'})

        hash_ok, validation = validate_ipn(dict(post_data))
        if not hash_ok:
            logger.warning('IPN hash validation failed for tran_id=%s', tran_id)
            return Response({'status': 'FAIL'})

        try:
            payment = Payment.objects.select_related('booking').get(
                transaction_id=tran_id, status=Payment.Status.PENDING
            )
        except Payment.DoesNotExist:
            logger.warning('No pending payment found for tran_id=%s', tran_id)
            return Response({'status': 'FAIL'})

        # Update payment record
        payment.status = Payment.Status.COMPLETED
        payment.paid_at = timezone.now()
        payment.val_id = post_data.get('val_id', '')
        payment.bank_tran_id = post_data.get('bank_tran_id', '')
        payment.card_type = post_data.get('card_type', '')
        payment.card_no = post_data.get('card_no', '')
        payment.card_brand = post_data.get('card_brand', '')
        payment.card_issuer = post_data.get('card_issuer', '')
        payment.card_issuer_country = post_data.get('card_issuer_country', '')
        payment.currency = post_data.get('currency', 'BDT')
        payment.store_amount = post_data.get('store_amount', 0)
        payment.risk_level = post_data.get('risk_level', '0')
        payment.risk_title = post_data.get('risk_title', '')
        payment.save()

        # Update booking status
        booking = payment.booking
        booking.payment_status = Booking.PaymentStatus.PAID
        booking.status = Booking.Status.CONFIRMED
        booking.save(update_fields=['payment_status', 'status', 'updated_at'])

        # Send confirmation email
        try:
            from common.email import send_booking_confirmation
            send_booking_confirmation(booking)
        except Exception:
            logger.exception('Failed to send confirmation email for %s', booking.booking_ref)

        return Response({'status': 'VALID'})


@method_decorator(csrf_exempt, name='dispatch')
class PaymentSuccessView(APIView):
    """POST /api/payments/success/ — SSLCommerz redirects here on success."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        tran_id = request.data.get('tran_id', '')
        val_id = request.data.get('val_id', '')
        from .payment_gateway import _get_config
        frontend_url = _get_config()['frontend_url']

        # Mark payment completed if IPN hasn't already
        Payment.objects.filter(
            transaction_id=tran_id, status=Payment.Status.PENDING
        ).update(
            status=Payment.Status.COMPLETED,
            paid_at=timezone.now(),
            val_id=val_id,
        )

        # Mark booking paid/confirmed
        try:
            booking = Booking.objects.get(booking_ref=tran_id)
            if booking.payment_status != Booking.PaymentStatus.PAID:
                booking.payment_status = Booking.PaymentStatus.PAID
                booking.status = Booking.Status.CONFIRMED
                booking.save(update_fields=['payment_status', 'status', 'updated_at'])
        except Booking.DoesNotExist:
            pass

        return HttpResponseRedirect(f'{frontend_url}/payment/success?booking_ref={tran_id}')


@method_decorator(csrf_exempt, name='dispatch')
class PaymentFailView(APIView):
    """POST /api/payments/fail/ — SSLCommerz redirects here on failure."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        tran_id = request.data.get('tran_id', '')
        from .payment_gateway import _get_config
        frontend_url = _get_config()['frontend_url']

        Payment.objects.filter(
            transaction_id=tran_id, status=Payment.Status.PENDING
        ).update(status=Payment.Status.FAILED)

        return HttpResponseRedirect(f'{frontend_url}/payment/fail?booking_ref={tran_id}')


@method_decorator(csrf_exempt, name='dispatch')
class PaymentCancelView(APIView):
    """POST /api/payments/cancel/ — SSLCommerz redirects here on cancel."""
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        tran_id = request.data.get('tran_id', '')
        from .payment_gateway import _get_config
        frontend_url = _get_config()['frontend_url']

        Payment.objects.filter(
            transaction_id=tran_id, status=Payment.Status.PENDING
        ).update(status=Payment.Status.FAILED)

        return HttpResponseRedirect(f'{frontend_url}/payment/cancel?booking_ref={tran_id}')


# ── Admin SSLCommerz Controls ────────────────

class AdminPaymentGatewaySettingsView(APIView):
    """GET/PUT /api/admin/payment-gateway/settings/ — read or update SSLCommerz config."""
    permission_classes = [IsAdmin]

    def get(self, request):
        from .models import PaymentGatewayConfig
        from .payment_gateway import _get_config
        cfg = _get_config()
        db_cfg = PaymentGatewayConfig.load()
        return Response({
            'store_id': cfg['store_id'],
            'is_sandbox': cfg['issandbox'],
            'store_password_set': bool(cfg['store_pass']),
            'frontend_url': cfg['frontend_url'],
            'is_active': cfg['is_active'],
            'source': 'database' if db_cfg else 'env',
        })

    def put(self, request):
        from .models import PaymentGatewayConfig
        data = request.data
        store_id = data.get('store_id', '').strip()
        store_password = data.get('store_password', '').strip()
        is_sandbox = data.get('is_sandbox', True)
        frontend_url = data.get('frontend_url', '').strip()
        is_active = data.get('is_active', True)

        if not store_id:
            return Response({'detail': 'store_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not frontend_url:
            return Response({'detail': 'frontend_url is required.'}, status=status.HTTP_400_BAD_REQUEST)

        cfg = PaymentGatewayConfig.load()
        if cfg is None:
            cfg = PaymentGatewayConfig()

        cfg.store_id = store_id
        cfg.is_sandbox = is_sandbox
        cfg.frontend_url = frontend_url
        cfg.is_active = is_active

        # Only update password if a new one is provided
        if store_password:
            cfg.store_password = store_password

        if not cfg.store_password:
            return Response({'detail': 'store_password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        cfg.save()

        return Response({
            'store_id': cfg.store_id,
            'is_sandbox': cfg.is_sandbox,
            'store_password_set': True,
            'frontend_url': cfg.frontend_url,
            'is_active': cfg.is_active,
            'source': 'database',
        })


class AdminTransactionQueryView(APIView):
    """POST /api/admin/payment-gateway/query/ — query SSLCommerz transaction."""
    permission_classes = [IsAdmin]

    def post(self, request):
        tran_id = request.data.get('tran_id', '').strip()
        if not tran_id:
            return Response({'detail': 'tran_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        from .payment_gateway import query_transaction
        result = query_transaction(tran_id)
        return Response(result)


class AdminRefundPaymentView(APIView):
    """POST /api/admin/payment-gateway/refund/ — initiate SSLCommerz refund."""
    permission_classes = [IsAdmin]

    def post(self, request):
        payment_id = request.data.get('payment_id')
        refund_amount = request.data.get('refund_amount')
        refund_remarks = request.data.get('refund_remarks', 'Admin initiated refund')

        if not payment_id or not refund_amount:
            return Response(
                {'detail': 'payment_id and refund_amount are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payment = Payment.objects.select_related('booking').get(pk=payment_id)
        except Payment.DoesNotExist:
            return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if payment.status != Payment.Status.COMPLETED:
            return Response({'detail': 'Only completed payments can be refunded.'}, status=status.HTTP_400_BAD_REQUEST)

        if not payment.bank_tran_id:
            return Response(
                {'detail': 'No bank_tran_id found — manual/cash payments cannot be refunded via gateway.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .payment_gateway import initiate_refund
        result = initiate_refund(payment.bank_tran_id, refund_amount, refund_remarks)

        api_status = result.get('status', '')
        if api_status in ('success', 'refunded'):
            payment.status = Payment.Status.REFUNDED
            payment.save(update_fields=['status'])
            booking = payment.booking
            booking.payment_status = Booking.PaymentStatus.REFUNDED
            booking.save(update_fields=['payment_status', 'updated_at'])

        return Response({
            'gateway_response': result,
            'payment_id': payment.id,
            'refund_amount': str(refund_amount),
        })


# ── Police Portal Export ─────────────────────────────────────────────────────

class PoliceExportView(APIView):
    """GET /api/admin/reports/police-export/?date=YYYY-MM-DD
    Returns checked-in guests in Bangladesh Police Portal format (JSON/CSV).
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        from accounts.models import GuestProfile
        import csv
        from io import StringIO

        export_date_str = request.query_params.get('date')
        export_format = request.query_params.get('format', 'json')

        try:
            from datetime import datetime
            export_date = datetime.strptime(export_date_str, '%Y-%m-%d').date() if export_date_str else date.today()
        except (ValueError, TypeError):
            export_date = date.today()

        # Bookings active (checked-in) on the export date
        bookings = Booking.objects.filter(
            status__in=['CHECKED_IN', 'CHECKED_OUT'],
            check_in_date__lte=export_date,
            check_out_date__gte=export_date,
        ).select_related('guest', 'room', 'room_type').prefetch_related('guest__guest_profile')

        records = []
        for b in bookings:
            try:
                profile = b.guest.guest_profile
            except Exception:
                profile = None

            records.append({
                'sl_no': len(records) + 1,
                'hotel_name': 'Hotel Crown',
                'room_number': b.room.room_number if b.room else '',
                'check_in_date': str(b.check_in_date),
                'check_out_date': str(b.check_out_date),
                'guest_name': b.guest.full_name or '',
                'father_name': getattr(profile, 'father_name', '') if profile else '',
                'mother_name': getattr(profile, 'mother_name', '') if profile else '',
                'date_of_birth': str(getattr(profile, 'date_of_birth', '') or '') if profile else '',
                'gender': getattr(profile, 'gender', '') if profile else '',
                'nationality': getattr(profile, 'nationality', '') if profile else '',
                'nid_passport': b.id_number or (getattr(profile, 'id_number', '') if profile else ''),
                'id_type': b.id_type or (getattr(profile, 'id_type', '') if profile else ''),
                'phone': b.guest.phone or '',
                'address': getattr(profile, 'address_line1', '') if profile else '',
                'occupation': getattr(profile, 'occupation', '') if profile else '',
                'coming_from': b.coming_from or '',
                'purpose_of_visit': b.purpose_of_visit or '',
                'guest_type': b.guest_type or '',
                'visa_no': getattr(profile, 'visa_no', '') if profile else '',
            })

        if export_format == 'csv':
            output = StringIO()
            if records:
                writer = csv.DictWriter(output, fieldnames=records[0].keys())
                writer.writeheader()
                writer.writerows(records)
            response = HttpResponse(output.getvalue(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="police_export_{export_date}.csv"'
            return response

        return Response({
            'date': str(export_date),
            'total_guests': len(records),
            'records': records,
        })

