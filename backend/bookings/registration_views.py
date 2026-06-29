"""API views for unified Registration module."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffUser
from .models import Booking, Registration
from .registration_services import (
    apply_registration_payload,
    check_in_registration,
    create_walk_in_registration,
    get_or_create_registration_for_booking,
    registration_to_api,
)
from .serializers import BookingDetailSerializer, RegistrationCheckInPayloadSerializer, RegistrationWriteSerializer


class RegistrationCreateView(APIView):
    """POST /api/admin/registrations/ — start walk-in (fast-track) registration."""
    permission_classes = [IsStaffUser]

    def post(self, request):
        mode = request.data.get('mode', 'WALK_IN')
        if mode == 'WALK_IN':
            registration = create_walk_in_registration()
        else:
            registration = create_walk_in_registration()
            registration.mode = Registration.Mode.ADVANCE
            registration.save(update_fields=['mode'])
        return Response(registration_to_api(registration, request), status=status.HTTP_201_CREATED)


class RegistrationByBookingView(APIView):
    """GET /api/admin/registrations/by-booking/{booking_id}/"""
    permission_classes = [IsStaffUser]

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.select_related(
                'guest', 'room_type', 'room',
            ).get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        registration = get_or_create_registration_for_booking(booking)
        return Response(registration_to_api(registration, request))


class RegistrationDetailView(APIView):
    """GET/PUT /api/admin/registrations/{id}/"""
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        try:
            registration = Registration.objects.select_related(
                'booking', 'guest', 'room_type', 'room',
            ).get(pk=pk)
        except Registration.DoesNotExist:
            return Response({'detail': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(registration_to_api(registration, request))

    def put(self, request, pk):
        try:
            registration = Registration.objects.select_related('booking', 'guest').get(pk=pk)
        except Registration.DoesNotExist:
            return Response({'detail': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RegistrationWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        apply_registration_payload(registration, dict(serializer.validated_data))
        registration.refresh_from_db()
        return Response({
            'detail': 'Registration saved.',
            'registration': registration_to_api(registration, request),
        })


class UnifiedRegistrationCheckInView(APIView):
    """POST /api/admin/registrations/{id}/check-in/ — unified check-in."""
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            registration = Registration.objects.select_related(
                'booking', 'guest', 'room_type', 'room',
            ).get(pk=pk)
        except Registration.DoesNotExist:
            return Response({'detail': 'Registration not found.'}, status=status.HTTP_404_NOT_FOUND)

        if registration.status == Registration.Status.CHECKED_IN:
            return Response({'detail': 'Guest is already checked in.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = RegistrationCheckInPayloadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            booking, registration = check_in_registration(
                registration, serializer.validated_data, request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'registration': registration_to_api(registration, request),
            'booking': BookingDetailSerializer(booking).data,
        })
