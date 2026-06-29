"""Checkout module API — Revenue Guard endpoints."""
from django.http import HttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffUser
from dashboard.models import HotelConfig

from .checkout_services import (
    compute_folio_balance,
    execute_checkout,
    get_authorized_companies,
    lookup_room_for_checkout,
    receive_checkout_payment,
)
from .models import Booking, Registration
from .serializers import BookingDetailSerializer, CheckOutSerializer


def _checkout_context_payload(room, booking):
    balance = compute_folio_balance(booking)
    config = HotelConfig.load()
    reg = getattr(booking, 'registration_record', None)
    if reg is None:
        reg = Registration.objects.filter(booking=booking).first()

    return {
        'business_date': config.business_date.isoformat(),
        'room': {
            'id': room.id,
            'room_number': room.room_number,
            'status': room.status,
            'housekeeping_status': room.housekeeping_status,
        },
        'booking': BookingDetailSerializer(booking).data,
        'registration_ref': reg.registration_ref if reg else None,
        'folio': balance,
    }


class CheckoutLookupView(APIView):
    """GET /api/admin/checkout/lookup/?room_number=703"""
    permission_classes = [IsStaffUser]

    def get(self, request):
        room_number = request.query_params.get('room_number', '').strip()
        try:
            room, booking = lookup_room_for_checkout(room_number)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        booking = (
            Booking.objects.select_related('guest', 'room_type', 'room', 'registration_record')
            .get(pk=booking.pk)
        )
        return Response(_checkout_context_payload(room, booking))


class CheckoutCompaniesView(APIView):
    """GET /api/admin/checkout/companies/ — authorized corporate accounts."""
    permission_classes = [IsStaffUser]

    def get(self, request):
        return Response({'companies': get_authorized_companies()})


class CheckoutPaymentView(APIView):
    """POST /api/admin/checkout/{booking_id}/payment/ — receive settlement payment."""
    permission_classes = [IsStaffUser]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.get(pk=booking_id, status='CHECKED_IN')
        except Booking.DoesNotExist:
            return Response({'detail': 'Active in-house booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            result, folio = receive_checkout_payment(booking, request.data, request.user)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            return Response({'detail': f'Settlement failed: {exc}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        payload = {
            'type': result.get('type'),
            'amount': result.get('amount'),
            'payment_method': result.get('payment_method'),
            'folio': folio,
        }
        if result.get('type') == 'payment':
            payload['payment_id'] = result.get('payment_id')
            payload['paid_at'] = result.get('paid_at')
        else:
            payload['payment_id'] = result.get('payment_id')
            payload['paid_at'] = result.get('paid_at')
            payload['is_refund'] = True

        return Response(payload)


class CheckoutExecuteView(APIView):
    """POST /api/admin/checkout/{booking_id}/execute/ — password-protected checkout."""
    permission_classes = [IsStaffUser]

    def post(self, request, booking_id):
        try:
            booking = Booking.objects.select_related('room', 'room_type', 'guest').get(pk=booking_id)
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

        try:
            booking, balance_info, business_date = execute_checkout(booking, request.user, data)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'booking': BookingDetailSerializer(booking).data,
            'business_date': business_date,
            'folio': balance_info,
            'message': 'Checkout completed successfully.',
        })


class CheckoutInvoicePreviewView(APIView):
    """GET /api/admin/checkout/{booking_id}/invoice-preview/ — live A4 PDF preview."""
    permission_classes = [IsStaffUser]

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.select_related('guest', 'room_type', 'room').get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=status.HTTP_404_NOT_FOUND)

        from .invoice import generate_invoice_pdf
        pdf_bytes = generate_invoice_pdf(booking, preview=True)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="preview_{booking.booking_ref}.pdf"'
        return response


class CheckoutDuplicateBillView(APIView):
    """GET /api/admin/checkout/duplicate-bill/?ref=REG-xxx — finalized watermarked invoice."""
    permission_classes = [IsStaffUser]

    def get(self, request):
        ref = request.query_params.get('ref', '').strip()
        if not ref:
            return Response({'detail': 'Registration or booking reference is required.'}, status=status.HTTP_400_BAD_REQUEST)

        booking = (
            Booking.objects.filter(booking_ref=ref)
            .select_related('guest', 'room_type', 'room')
            .first()
        )
        if not booking:
            reg = Registration.objects.filter(registration_ref=ref).select_related('booking').first()
            if reg and reg.booking:
                booking = (
                    Booking.objects.select_related('guest', 'room_type', 'room')
                    .get(pk=reg.booking_id)
                )

        if not booking:
            return Response({'detail': 'No booking found for this reference.'}, status=status.HTTP_404_NOT_FOUND)

        if booking.status != 'CHECKED_OUT':
            return Response({'detail': 'Duplicate bill is available only after checkout.'}, status=status.HTTP_400_BAD_REQUEST)

        from .invoice import generate_invoice_pdf
        pdf_bytes = generate_invoice_pdf(booking, duplicate=True)

        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="duplicate_{booking.booking_ref}.pdf"'
        return response
