from datetime import date
from decimal import Decimal

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

from accounts.permissions import IsAdmin, IsStaffUser, staff_module_permission
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
    InHouseBookingSerializer,
    RegistrationCheckInSerializer,
    InvoiceSerializer,
    PaymentSerializer,
    RatePlanSerializer,
    WalkInSerializer,
    ReservationCreateSerializer,
)
from .services import (
    apply_registration_data,
    assign_room,
    check_availability,
    perform_check_in,
    sync_booking_payment_status,
)

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
        from .channels import normalize_reference_source
        from bookings.services import assert_rate_plan_applicable, calculate_rate_plan_price, check_availability

        room_type = serializer.validated_data['room_type']
        check_in = serializer.validated_data['check_in_date']
        check_out = serializer.validated_data['check_out_date']
        nights = (check_out - check_in).days
        rate_plan = serializer.validated_data.get('rate_plan')
        if rate_plan:
            rate_plan = assert_rate_plan_applicable(rate_plan.id, room_type.id, check_in, check_out)

        rack_per_night = room_type.price_per_night
        total_price, discount_amount = calculate_rate_plan_price(rack_per_night, nights, rate_plan)
        offer_per_night = total_price / nights if nights else total_price

        available = check_availability(room_type.id, check_in, check_out)
        if not available.exists():
            raise ValidationError({'detail': 'No rooms available for the selected dates.'})

        room = available.first()
        ref_raw = serializer.validated_data.pop('reference_source', '') or self.request.data.get('reference_source', '')
        reference_source = normalize_reference_source(ref_raw)
        booking = serializer.save(
            guest=self.request.user,
            room=room,
            total_price=total_price,
            rack_rate=rack_per_night,
            offer_rate=offer_per_night,
            discount_amount=discount_amount,
            rate_plan=rate_plan,
            payment_status=Booking.PaymentStatus.UNPAID,
            booking_source=Booking.BookingSource.WEBSITE,
            reference_source=reference_source,
            status=Booking.Status.PENDING,
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
    queryset = Booking.objects.select_related(
        'guest', 'room_type', 'room', 'rate_plan', 'checked_in_by', 'checked_out_by', 'parent_booking'
    ).prefetch_related(
        'payments', 'folio_charges__posted_by', 'registration_record'
    )
    serializer_class = BookingDetailSerializer
    permission_classes = [staff_module_permission('BOOKINGS')]
    filterset_fields = ['status', 'room_type', 'guest', 'booking_source']
    search_fields = ['booking_ref', 'guest__email', 'guest__full_name', 'guest__phone', 'reference_source']
    ordering_fields = ['created_at', 'check_in_date', 'total_price']
    ordering = ['-created_at']

    def get_queryset(self):
        from .channels import channel_filter_q

        qs = super().get_queryset()
        channel = self.request.query_params.get('channel')
        q = channel_filter_q(channel)
        if q is not None:
            qs = qs.filter(q)
        ref = self.request.query_params.get('reference_source')
        if ref:
            qs = qs.filter(reference_source__iexact=ref.strip())
        return qs


class AdminBookingChannelStatsView(APIView):
    """GET /api/admin/bookings/channel-stats/ — counts by online / OTA channel."""
    permission_classes = [staff_module_permission('BOOKINGS')]

    def get(self, request):
        from .channels import CHANNEL_FILTERS

        qs = Booking.objects.exclude(status='CANCELLED')
        status_filter = request.query_params.get('status')
        if status_filter and status_filter != 'ALL':
            qs = qs.filter(status=status_filter)

        stats = {'all': qs.count()}
        for key, q in CHANNEL_FILTERS.items():
            stats[key.lower()] = qs.filter(q).count()
        return Response(stats)


class AdminBookingDetailView(generics.RetrieveAPIView):
    """GET /api/admin/bookings/{id}/"""
    queryset = Booking.objects.select_related(
        'guest', 'room_type', 'room', 'rate_plan', 'checked_in_by', 'checked_out_by'
    ).prefetch_related(
        'payments', 'folio_charges__posted_by', 'registration_record'
    )
    serializer_class = BookingDetailSerializer
    permission_classes = [staff_module_permission('BOOKINGS')]


class AdminCreateBookingView(generics.CreateAPIView):
    """POST /api/admin/bookings/ — admin manually creates a booking."""
    serializer_class = AdminBookingCreateSerializer
    permission_classes = [staff_module_permission('BOOKINGS')]

    def perform_create(self, serializer):
        from bookings.services import assert_guest_bookable, assert_rate_plan_applicable, calculate_rate_plan_price, check_availability

        guest = serializer.validated_data['guest']
        assert_guest_bookable(guest)

        room_type = serializer.validated_data['room_type']
        check_in = serializer.validated_data['check_in_date']
        check_out = serializer.validated_data['check_out_date']
        nights = (check_out - check_in).days
        rate_plan = serializer.validated_data.get('rate_plan')
        if rate_plan:
            rate_plan = assert_rate_plan_applicable(rate_plan.id, room_type.id, check_in, check_out)
        room = serializer.validated_data.get('room')

        if room:
            available_ids = set(
                check_availability(room_type.id, check_in, check_out).values_list('id', flat=True)
            )
            if room.id not in available_ids and room.room_type_id == room_type.id:
                pass  # allow explicit room if same type (admin override)
            elif room.id not in available_ids:
                room = check_availability(room_type.id, check_in, check_out).first()
        else:
            room = check_availability(room_type.id, check_in, check_out).first()

        rack_per_night = room_type.price_per_night
        total_price, discount_amount = calculate_rate_plan_price(rack_per_night, nights, rate_plan)
        offer_per_night = total_price / nights if nights else total_price

        serializer.save(
            room=room,
            total_price=total_price,
            rack_rate=rack_per_night,
            offer_rate=offer_per_night,
            discount_amount=discount_amount,
            rate_plan=rate_plan,
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
    permission_classes = [staff_module_permission('BOOKINGS')]
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
            from bookings.services import calculate_rate_plan_price
            total, discount = calculate_rate_plan_price(
                booking.room_type.price_per_night, nights, booking.rate_plan
            )
            serializer.validated_data['total_price'] = total
            serializer.validated_data['discount_amount'] = discount

        serializer.save()
        return Response(BookingDetailSerializer(booking, context={'request': request}).data)


class AdminDeleteBookingView(generics.DestroyAPIView):
    """DELETE /api/admin/bookings/{id}/"""
    queryset = Booking.objects.select_related('room')
    permission_classes = [staff_module_permission('BOOKINGS')]

    def perform_destroy(self, instance):
        with transaction.atomic():
            # Release room if booking was active
            if instance.room and instance.status in ('PENDING', 'CONFIRMED', 'CHECKED_IN'):
                instance.room.status = 'AVAILABLE'
                instance.room.save(update_fields=['status'])
            instance.delete()


class AdminBookingStatusView(APIView):
    """PATCH /api/admin/bookings/{id}/status/ — update booking status with room sync."""
    permission_classes = [staff_module_permission('BOOKINGS')]

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
            if new_status == 'CHECKED_IN' and booking.status in ('PENDING', 'CONFIRMED'):
                return Response(
                    {
                        'detail': (
                            'Use the Registration Module to check in guests '
                            '(Front Desk → Check In or Registration). '
                            'Direct status change is not allowed.'
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if new_status == 'CHECKED_OUT':
                return Response(
                    {
                        'detail': (
                            'Use the Checkout Module (Revenue Guard) to check out guests. '
                            'Folio must be settled before checkout.'
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            booking.status = new_status
            booking.save(update_fields=['status', 'updated_at'])

            if booking.room:
                if new_status == 'CHECKED_IN':
                    booking.room.status = 'OCCUPIED'
                    booking.room.save(update_fields=['status'])
                elif new_status in ('CHECKED_OUT', 'CANCELLED'):
                    booking.room.status = 'AVAILABLE'
                    booking.room.save(update_fields=['status'])
                elif new_status == 'CONFIRMED':
                    booking.room.status = 'RESERVED'
                    booking.room.save(update_fields=['status'])

        booking.refresh_from_db()
        return Response(BookingDetailSerializer(booking, context={'request': request}).data)


class AdminAssignRoomView(APIView):
    """PATCH /api/admin/bookings/{id}/assign-room/ — manually assign a room."""
    permission_classes = [staff_module_permission('BOOKINGS')]

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

        from bookings.services import check_availability, release_room_if_unassigned

        room = check_availability(
            booking.room_type_id,
            booking.check_in_date,
            booking.check_out_date,
            exclude_booking_id=booking.pk,
        ).filter(pk=room_id).first()
        if not room:
            in_house = Booking.objects.filter(
                room_id=room_id,
                status='CHECKED_IN',
                check_in_date__lt=booking.check_out_date,
                check_out_date__gte=booking.check_in_date,
            ).exclude(pk=booking.pk).select_related('guest').first()
            if in_house:
                guest_name = in_house.guest.full_name if in_house.guest else 'Guest'
                return Response(
                    {
                        'detail': (
                            f'Room is occupied by {guest_name} ({in_house.booking_ref}) '
                            f'until check-out on {in_house.check_out_date}.'
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {
                    'detail': (
                        'Room is not available — occupied, dirty, under maintenance, '
                        'or has a conflicting reservation.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_room = booking.room
        booking.room = room
        booking.save(update_fields=['room', 'updated_at'])
        release_room_if_unassigned(old_room, exclude_booking_id=booking.pk)
        if booking.status in ('PENDING', 'CONFIRMED'):
            room.status = 'RESERVED'
            room.save(update_fields=['status'])

        # Sync the linked Registration record so it reflects the new room assignment
        try:
            from .registration_services import sync_registration_from_booking
            reg = getattr(booking, 'registration_record', None)
            if reg is None:
                try:
                    reg = booking.registration_record
                except Exception:
                    reg = None
            if reg:
                sync_registration_from_booking(booking, reg)
        except Exception:
            pass  # Never block room assignment if registration sync fails

        return Response(BookingDetailSerializer(booking, context={'request': request}).data)


# ── Payments ─────────────────────────────────

class AdminPaymentListView(generics.ListAPIView):
    """GET /api/admin/payments/"""
    queryset = Payment.objects.select_related('booking__guest').order_by('-created_at')
    serializer_class = PaymentSerializer
    permission_classes = [staff_module_permission('BOOKINGS')]


# ── Walk-in ──────────────────────────────────

class WalkInBookingView(APIView):
    """POST /api/admin/reservations/walk-in/ — deprecated; use unified registration."""

    permission_classes = [IsStaffUser]

    def post(self, request):
        return Response(
            {
                'detail': (
                    'Walk-in API is deprecated. Use POST /api/admin/registrations/ '
                    'then POST /api/admin/registrations/{id}/check-in/.'
                ),
            },
            status=status.HTTP_410_GONE,
        )


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

        from bookings.services import assert_guest_bookable
        try:
            assert_guest_bookable(guest)
        except ValidationError as exc:
            return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        from bookings.services import (
            assert_rate_plan_applicable,
            calculate_rate_plan_price,
            money,
            MAX_BOOKING_AMOUNT,
            validate_reservation_stay_dates,
        )

        nights = validate_reservation_stay_dates(data['check_in_date'], data['check_out_date'])
        num_rooms = int(data.get('num_rooms', 1) or 1)
        if num_rooms < 1 or num_rooms > 50:
            return Response(
                {'detail': 'Number of rooms must be between 1 and 50.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rack = money(data.get('rack_rate') or room_type.price_per_night)

        rate_plan_obj = None
        if data.get('rate_plan'):
            try:
                rate_plan_obj = assert_rate_plan_applicable(
                    data['rate_plan'], room_type.id, data['check_in_date'], data['check_out_date'],
                )
            except ValidationError as exc:
                return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        if rate_plan_obj:
            stay_total, discount = calculate_rate_plan_price(rack, nights, rate_plan_obj)
            total_price = money(stay_total * num_rooms)
            offer = money(stay_total / nights) if nights else money(stay_total)
            discount = money(discount * num_rooms)
        else:
            offer = money(data.get('offer_rate') or rack)
            discount = money(data.get('discount_amount', 0))
            line_total = offer * nights * num_rooms
            total_price = money(max(Decimal('0'), line_total - discount))
            if total_price <= 0:
                total_price = money(rack * nights * num_rooms)

        svc_pct = money(data.get('service_charge_pct', 0))
        vat_pct_val = money(data.get('vat_pct', 0))
        service_charge_amount = money(total_price * svc_pct / Decimal('100'))
        vat_amount = money(total_price * vat_pct_val / Decimal('100'))
        grand = money(total_price + service_charge_amount + vat_amount)

        if grand > MAX_BOOKING_AMOUNT:
            return Response(
                {
                    'detail': (
                        'Calculated total exceeds system limit. '
                        'Please verify check-in/check-out dates, number of rooms, and rates.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        available_rooms = check_availability(
            room_type.id, data['check_in_date'], data['check_out_date'],
        )
        if data.get('room_id'):
            if not available_rooms.filter(pk=data['room_id']).exists():
                return Response(
                    {'detail': 'Selected room is not available for these dates.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif num_rooms > 1 and available_rooms.count() < num_rooms:
            return Response(
                {
                    'detail': (
                        f'Only {available_rooms.count()} room(s) available for these dates. '
                        f'Requested {num_rooms}. Create separate bookings per room.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        elif num_rooms == 1 and not data.get('room_id') and not available_rooms.exists():
            return Response(
                {'detail': 'No rooms available for this room type and date range.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parent_booking = None
        if data.get('parent_booking_id'):
            parent_booking = Booking.objects.filter(pk=data['parent_booking_id']).first()
            if not parent_booking:
                return Response(
                    {'detail': 'Parent booking not found for multi-reservation.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

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

            from .channels import normalize_reference_source

            booking = Booking.objects.create(
                guest=guest,
                room=room,
                room_type=room_type,
                rate_plan=rate_plan_obj,
                parent_booking=parent_booking,
                check_in_date=data['check_in_date'],
                check_out_date=data['check_out_date'],
                arrival_time=data.get('arrival_time'),
                departure_time=data.get('departure_time'),
                adults=data['adults'],
                children=data['children'],
                infants=data.get('infants', 0),
                extra_bed=data.get('extra_bed', 0),
                num_rooms=num_rooms,
                total_price=total_price,
                grand_total=grand,
                rack_rate=rack,
                offer_rate=offer,
                discount_pct=data.get('discount_pct', 0),
                discount_amount=discount,
                service_charge_pct=svc_pct,
                vat_pct=vat_pct_val,
                tax_amount=money(service_charge_amount + vat_amount),
                deposit_amount=data.get('deposit_amount', 0),
                status=data.get('status', 'CONFIRMED'),
                booking_source=data.get('booking_source', 'PHONE'),
                reference_source=normalize_reference_source(data.get('reference_source', '')),
                guest_hobbies=data.get('guest_hobbies', ''),
                guest_preferences=data.get('guest_preferences', ''),
                airport_details=data.get('airport_details', ''),
                transport_notes=data.get('transport_notes', ''),
                id_type=data.get('id_type', ''),
                id_number=data.get('id_number', ''),
                company_name=data.get('company_name', ''),
                contact_person=data.get('contact_person', ''),
                guest_type=data.get('guest_type', ''),
                purpose_of_visit=data.get('purpose_of_visit', ''),
                coming_from=data.get('coming_from', ''),
                special_requests=data.get('special_requests', ''),
                profile_note=data.get('profile_note', ''),
                currency=data.get('currency', 'BDT'),
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

            if room and booking.status in ('PENDING', 'CONFIRMED'):
                room.status = 'RESERVED'
                room.save(update_fields=['status'])

            # Record advance payment if provided
            payment_amount = float(data.get('payment_amount', 0) or 0)
            if payment_amount > 0:
                from bookings.checkout_services import get_business_date, get_business_datetime

                Payment.objects.create(
                    booking=booking,
                    amount=payment_amount,
                    payment_method=data.get('payment_method', 'CASH'),
                    currency=booking.currency,
                    status='COMPLETED',
                    transaction_id='RESERVATION',
                    paid_at=get_business_datetime(),
                    business_date=get_business_date(),
                    posted_by=request.user,
                )
                sync_booking_payment_status(booking)

            from .registration_services import get_or_create_registration_for_booking
            get_or_create_registration_for_booking(booking)

        return Response(BookingDetailSerializer(booking).data, status=status.HTTP_201_CREATED)


class ReservationFinalizeView(APIView):
    """POST /api/admin/reservations/{id}/finalize/ — set billing currency for group."""
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        currency = request.data.get('currency', 'BDT')
        if currency not in ('BDT', 'USD'):
            return Response({'detail': 'Currency must be BDT or USD.'}, status=status.HTTP_400_BAD_REQUEST)

        root = booking.parent_booking or booking
        with transaction.atomic():
            ids = [root.id, *root.child_bookings.values_list('id', flat=True)]
            Booking.objects.filter(pk__in=ids).update(currency=currency)
            Payment.objects.filter(booking_id__in=ids).update(currency=currency)

        root.refresh_from_db()
        return Response(BookingDetailSerializer(root).data)


class ReservationConfirmationPDFView(APIView):
    """GET /api/admin/reservations/{id}/confirmation/pdf/ — reservation voucher PDF."""
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        try:
            booking = Booking.objects.select_related(
                'guest', 'room_type', 'room'
            ).get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status not in ('PENDING', 'CONFIRMED', 'CHECKED_IN'):
            return Response(
                {'detail': 'Confirmation voucher not available for this booking status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .reservation_voucher import generate_reservation_confirmation_pdf
        pdf_bytes = generate_reservation_confirmation_pdf(booking)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'inline; filename="confirmation_{booking.booking_ref}.pdf"'
        )
        return response


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

        from dashboard.models import HotelConfig
        business_date = HotelConfig.load().business_date
        if booking.check_in_date > business_date:
            return Response(
                {
                    'detail': (
                        f'Arrival date is {booking.check_in_date}. '
                        f'Business date is {business_date}. '
                        'Cannot check in before arrival date.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            with transaction.atomic():
                perform_check_in(booking, data, request.user)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        booking.refresh_from_db()
        return Response(BookingDetailSerializer(booking).data)


# ── Check-out ────────────────────────────────

class CheckOutView(APIView):
    """POST /api/admin/reservations/{id}/check-out/ — legacy alias to Revenue Guard checkout."""
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

        from .checkout_services import execute_checkout, receive_checkout_payment

        try:
            payment_amount = float(data.get('payment_amount', 0))
            if payment_amount > 0:
                receive_checkout_payment(booking, {
                    'amount': payment_amount,
                    'payment_method': data.get('payment_method', 'CASH'),
                }, request.user)

            booking, balance_info, business_date = execute_checkout(booking, request.user, data)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'booking': BookingDetailSerializer(booking).data,
            'business_date': business_date,
            'folio_balance': balance_info['balance'],
            'total_charges': balance_info['folio_total'],
            'total_payments': balance_info['payments_total'],
            'folio': balance_info,
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
        from dashboard.models import HotelConfig

        business_date = HotelConfig.load().business_date
        target_date = self.request.query_params.get('date') or business_date.isoformat()
        return Booking.objects.filter(
            check_in_date=target_date,
            status__in=['PENDING', 'CONFIRMED'],
        ).select_related(
            'guest', 'room_type', 'room', 'rate_plan'
        ).prefetch_related(
            'payments', 'folio_charges__posted_by', 'registration_record'
        )


class DeparturesListView(generics.ListAPIView):
    """GET /api/admin/reservations/departures/ — today's expected departures."""
    serializer_class = BookingDetailSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        from dashboard.models import HotelConfig

        business_date = HotelConfig.load().business_date
        target_date_str = self.request.query_params.get('date')
        target_date = business_date
        if target_date_str:
            try:
                target_date = date.fromisoformat(target_date_str)
            except ValueError:
                pass
        return Booking.objects.filter(
            status='CHECKED_IN',
        ).filter(
            models.Q(check_out_date=target_date) | models.Q(check_out_date__lt=business_date),
        ).select_related(
            'guest', 'room_type', 'room', 'rate_plan'
        ).prefetch_related(
            'payments', 'folio_charges__posted_by', 'registration_record'
        )


class InHouseListView(generics.ListAPIView):
    """GET /api/admin/reservations/in-house/ — currently checked-in guests."""
    serializer_class = InHouseBookingSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return Booking.objects.filter(
            status='CHECKED_IN',
        ).select_related(
            'guest', 'room_type', 'room', 'rate_plan'
        ).prefetch_related(
            'payments', 'folio_charges__posted_by', 'registration_record'
        )


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
        ).select_related('guest', 'room__room_type')

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
        from .checkout_services import compute_folio_balance
        balance_info = compute_folio_balance(booking)

        return Response({
            'charges': FolioChargeSerializer(charges, many=True).data,
            'summary': {
                'room_charges': float(booking.total_price),
                'folio_total': balance_info['folio_total'],
                'payments_total': balance_info['payments_total'],
                'balance': balance_info['balance'],
                'is_settled': balance_info['is_settled'],
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
    permission_classes = [staff_module_permission('BOOKINGS')]

    def patch(self, request, charge_id):
        try:
            charge = FolioCharge.objects.get(pk=charge_id)
        except FolioCharge.DoesNotExist:
            return Response({'detail': 'Charge not found.'}, status=status.HTTP_404_NOT_FOUND)

        if charge.is_locked:
            return Response(
                {'detail': 'This charge was posted by Night Audit and is locked. It cannot be voided.'},
                status=status.HTTP_403_FORBIDDEN,
            )

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
            'room_type_id': booking.room_type_id,
            'room_id': booking.room_id,
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
            'grand_total': str(booking.grand_total),
            'currency': booking.currency,
            'billing_type': booking.billing_type,
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
        apply_registration_data(booking, profile, d)

        return Response({
            'detail': 'Registration updated.',
            'booking': BookingDetailSerializer(booking).data,
        })


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


class RegistrationCheckInView(APIView):
    """POST /api/admin/reservations/{id}/registration/check-in/ — registration + check-in."""
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            booking = Booking.objects.select_related('room', 'room_type', 'guest').get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status not in ('PENDING', 'CONFIRMED'):
            return Response(
                {'detail': f'Cannot check in a booking with status {booking.status}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from dashboard.models import HotelConfig
        business_date = HotelConfig.load().business_date
        if booking.check_in_date > business_date:
            return Response(
                {
                    'detail': (
                        f'Arrival date is {booking.check_in_date}. '
                        f'Business date is {business_date}. '
                        'Cannot check in before arrival date.'
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RegistrationCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        from accounts.models import GuestProfile
        profile, _ = GuestProfile.objects.get_or_create(user=booking.guest)

        try:
            with transaction.atomic():
                apply_registration_data(booking, profile, data)
                perform_check_in(booking, data, request.user)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        booking.refresh_from_db()
        return Response(BookingDetailSerializer(booking).data)


class RegistrationCardPDFView(APIView):
    """GET /api/admin/reservations/{id}/registration/pdf/ — printable registration card."""
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        try:
            booking = Booking.objects.select_related(
                'guest', 'room_type', 'room'
            ).get(pk=pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status not in ('CHECKED_IN', 'CHECKED_OUT'):
            return Response(
                {'detail': 'Registration card available after check-in.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .registration_card_pdf import generate_registration_card_pdf
        pdf_bytes = generate_registration_card_pdf(booking)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'inline; filename="registration_{booking.booking_ref}.pdf"'
        )
        return response


# ── Rate Plans ───────────────────────────────

class RatePlanListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/rate-plans/"""
    queryset = RatePlan.objects.prefetch_related('room_types').all()
    serializer_class = RatePlanSerializer
    permission_classes = [staff_module_permission('BOOKINGS')]
    pagination_class = None


class RatePlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/admin/rate-plans/{id}/"""
    queryset = RatePlan.objects.all()
    serializer_class = RatePlanSerializer
    permission_classes = [staff_module_permission('BOOKINGS')]


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
    permission_classes = [staff_module_permission('BOOKINGS')]

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
    permission_classes = [staff_module_permission('BOOKINGS')]

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
    permission_classes = [staff_module_permission('BOOKINGS')]

    def post(self, request):
        tran_id = request.data.get('tran_id', '').strip()
        if not tran_id:
            return Response({'detail': 'tran_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        from .payment_gateway import query_transaction
        result = query_transaction(tran_id)
        return Response(result)


class AdminRefundPaymentView(APIView):
    """POST /api/admin/payment-gateway/refund/ — initiate SSLCommerz refund."""
    permission_classes = [staff_module_permission('BOOKINGS')]

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
    permission_classes = [staff_module_permission('BOOKINGS')]

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

