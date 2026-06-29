from datetime import date, datetime, timedelta

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsStaffUser
from bookings.models import Booking
from bookings.serializers import BookingListSerializer
from .models import NightAuditLog, HotelConfig, FolioWindow, QueueEntry, FolioAuditLog
from .services import (
    get_admin_dashboard_stats,
    get_night_audit_preview,
    run_night_audit,
    get_occupancy_report,
    get_revenue_report,
    get_arrivals_departures_report,
    get_no_show_report,
    get_cancellation_report,
    get_guest_ledger_report,
    get_room_grid_data,
    get_reservation_control_report,
)


class AdminDashboardView(APIView):
    """GET /api/admin/dashboard/ — aggregated stats."""
    permission_classes = [IsAdmin]

    def get(self, request):
        stats = get_admin_dashboard_stats()
        return Response(stats)


class RoomGridView(APIView):
    """GET /api/admin/dashboard/room-grid/"""
    permission_classes = [IsStaffUser]

    def get(self, request):
        data = get_room_grid_data()
        return Response(data)


class RoomGridContextView(APIView):
    """GET /api/admin/dashboard/room-grid/<id>/context/"""
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        from rooms.models import Room
        from bookings.models import Booking
        from django.db.models import Sum
        
        try:
            room = Room.objects.get(pk=pk)
        except Room.DoesNotExist:
            return Response({'detail': 'Room not found'}, status=status.HTTP_404_NOT_FOUND)

        context = {
            'room_id': room.id,
            'room_number': room.room_number,
            'status': room.status,
            'housekeeping_status': room.housekeeping_status,
            'notes': room.notes,
            'room_type': room.room_type.name if room.room_type else room.get_area_type_display(),
            'occupant': None
        }

        # Find current occupant
        booking = Booking.objects.filter(room=room, status='CHECKED_IN').select_related(
            'guest', 'parent_booking', 'guest__guest_profile'
        ).first()
        if booking:
            # Calculate balance
            from bookings.models import FolioCharge, Payment
            folio_total = FolioCharge.objects.filter(booking=booking, is_void=False).aggregate(total=Sum('total'))['total'] or 0
            payments_total = Payment.objects.filter(booking=booking, status='COMPLETED').aggregate(total=Sum('amount'))['total'] or 0
            balance = float(booking.total_price) + float(folio_total) - float(payments_total)

            guest = booking.guest
            profile = getattr(guest, 'guest_profile', None)

            dob_str = None
            id_expiry_str = None
            if profile:
                if profile.date_of_birth:
                    dob_str = profile.date_of_birth.isoformat()
                if profile.id_expiry:
                    id_expiry_str = profile.id_expiry.isoformat()

            context['occupant'] = {
                'booking_id': booking.id,
                'guest_name': guest.full_name,
                'phone': guest.phone or '',
                'company_name': booking.company_name or '',
                'dob': dob_str,
                'gender': profile.gender if profile else '',
                'adults': booking.adults,
                'children': booking.children,
                'infants': booking.infants,
                'place_of_issue': profile.place_of_issue if profile else '',
                'visa_no': profile.visa_no if profile else '',
                'id_expiry': id_expiry_str,
                'check_in': booking.check_in_date.isoformat(),
                'check_out': booking.check_out_date.isoformat(),
                'arrival_time': booking.arrival_time.isoformat() if booking.arrival_time else None,
                'departure_time': booking.departure_time.isoformat() if booking.departure_time else None,
                'booking_ref': booking.booking_ref,
                'parent_booking_ref': booking.parent_booking.booking_ref if booking.parent_booking else None,
                'arrival_mode': booking.arrival_mode or '',
                'vehicle_assigned': booking.vehicle_assigned or '',
                'meal_plan': booking.meal_plan,
                'meal_plan_label': booking.get_meal_plan_display(),
                'market_code': booking.reference_source or booking.booking_source,
                'advance_paid': float(payments_total or booking.deposit_amount or 0),
                'balance_due': round(balance, 2),
                'guest_preferences': booking.guest_preferences,
                'special_requests': booking.special_requests,
                'internal_notes': booking.notes_internal or booking.profile_note or '',
            }

        return Response(context)


class GuestDashboardView(APIView):
    """GET /api/guest/dashboard/ — guest's own stats."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        bookings = Booking.objects.filter(guest=request.user).select_related('room_type', 'room')
        return Response({
            'total_bookings': bookings.count(),
            'active_bookings': bookings.filter(status__in=['PENDING', 'CONFIRMED', 'CHECKED_IN']).count(),
            'recent_bookings': BookingListSerializer(bookings[:5], many=True).data,
        })


# ──────────────────────────────────────────────
# Night Audit
# ──────────────────────────────────────────────

class NightAuditPreviewView(APIView):
    """GET /api/admin/night-audit/preview/?date=YYYY-MM-DD"""
    permission_classes = [IsAdmin]

    def get(self, request):
        date_str = request.query_params.get('date')
        audit_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else HotelConfig.load().business_date
        data = get_night_audit_preview(audit_date)
        return Response(data)


class NightAuditRunView(APIView):
    """POST /api/admin/night-audit/run/  body: { "date": "YYYY-MM-DD", "notes": "" }"""
    permission_classes = [IsAdmin]

    def post(self, request):
        date_str = request.data.get('date')
        audit_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else HotelConfig.load().business_date
        notes = request.data.get('notes', '')

        try:
            log = run_night_audit(audit_date, request.user)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if notes:
            log.notes = notes
            log.save(update_fields=['notes'])

        return Response({
            'id': log.id,
            'audit_date': log.audit_date.isoformat(),
            'total_rooms_sold': log.total_rooms_sold,
            'total_rooms_available': log.total_rooms_available,
            'occupancy_rate': float(log.occupancy_rate),
            'room_revenue': float(log.room_revenue),
            'fnb_revenue': float(log.fnb_revenue),
            'other_revenue': float(log.other_revenue),
            'total_revenue': float(log.total_revenue),
            'no_show_count': log.no_show_count,
            'new_bookings': log.new_bookings,
            'check_ins': log.check_ins,
            'check_outs': log.check_outs,
            'notes': log.notes,
            'performed_by': log.performed_by.full_name if log.performed_by else None,
            'created_at': log.created_at.isoformat(),
        }, status=status.HTTP_201_CREATED)


class NightAuditListView(APIView):
    """GET /api/admin/night-audit/"""
    permission_classes = [IsAdmin]

    def get(self, request):
        logs = NightAuditLog.objects.select_related('performed_by').all()[:60]
        return Response([
            {
                'id': l.id,
                'audit_date': l.audit_date.isoformat(),
                'occupancy_rate': float(l.occupancy_rate),
                'total_revenue': float(l.total_revenue),
                'room_revenue': float(l.room_revenue),
                'fnb_revenue': float(l.fnb_revenue),
                'other_revenue': float(l.other_revenue),
                'no_show_count': l.no_show_count,
                'new_bookings': l.new_bookings,
                'check_ins': l.check_ins,
                'check_outs': l.check_outs,
                'total_rooms_sold': l.total_rooms_sold,
                'total_rooms_available': l.total_rooms_available,
                'performed_by': l.performed_by.full_name if l.performed_by else None,
                'notes': l.notes,
                'created_at': l.created_at.isoformat(),
            }
            for l in logs
        ])


class NightAuditDetailView(APIView):
    """GET /api/admin/night-audit/<date>/"""
    permission_classes = [IsAdmin]

    def get(self, request, audit_date):
        try:
            d = datetime.strptime(audit_date, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            log = NightAuditLog.objects.select_related('performed_by').get(audit_date=d)
        except NightAuditLog.DoesNotExist:
            return Response({'detail': 'No audit found for this date.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'id': log.id,
            'audit_date': log.audit_date.isoformat(),
            'total_rooms_sold': log.total_rooms_sold,
            'total_rooms_available': log.total_rooms_available,
            'occupancy_rate': float(log.occupancy_rate),
            'room_revenue': float(log.room_revenue),
            'fnb_revenue': float(log.fnb_revenue),
            'other_revenue': float(log.other_revenue),
            'total_revenue': float(log.total_revenue),
            'no_show_count': log.no_show_count,
            'new_bookings': log.new_bookings,
            'check_ins': log.check_ins,
            'check_outs': log.check_outs,
            'performed_by': log.performed_by.full_name if log.performed_by else None,
            'notes': log.notes,
            'created_at': log.created_at.isoformat(),
        })


# ──────────────────────────────────────────────
# Reports
# ──────────────────────────────────────────────

def _parse_date_range(request):
    """Parse start_date/end_date from query params, default to current month."""
    today = date.today()
    start_str = request.query_params.get('start_date')
    end_str = request.query_params.get('end_date')
    start = datetime.strptime(start_str, '%Y-%m-%d').date() if start_str else today.replace(day=1)
    end = datetime.strptime(end_str, '%Y-%m-%d').date() if end_str else today
    return start, end


class OccupancyReportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        start, end = _parse_date_range(request)
        return Response(get_occupancy_report(start, end))


class RevenueReportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        start, end = _parse_date_range(request)
        return Response(get_revenue_report(start, end))


class ArrivalsReportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        date_str = request.query_params.get('date')
        report_date = datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else date.today()
        return Response(get_arrivals_departures_report(report_date))


class NoShowReportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        start, end = _parse_date_range(request)
        return Response(get_no_show_report(start, end))


class CancellationReportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        start, end = _parse_date_range(request)
        return Response(get_cancellation_report(start, end))


class GuestLedgerReportView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(get_guest_ledger_report())


def _parse_reservation_control_dates(request):
    """Shared date-range parser for reservation control JSON + PDF."""
    business_date = HotelConfig.load().business_date
    start_str = request.query_params.get('start_date')
    end_str = request.query_params.get('end_date')
    days_param = request.query_params.get('days')

    if start_str:
        try:
            start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return None, None, 'Invalid start_date. Use YYYY-MM-DD.'
    else:
        start_date = business_date

    if end_str:
        try:
            end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return None, None, 'Invalid end_date. Use YYYY-MM-DD.'
    elif days_param:
        try:
            num_days = max(1, min(30, int(days_param)))
            end_date = start_date + timedelta(days=num_days - 1)
        except (ValueError, TypeError):
            return None, None, 'Invalid days parameter.'
    else:
        end_date = start_date + timedelta(days=13)

    include_overbooking = request.query_params.get('include_overbooking', '').lower() in ('1', 'true', 'yes')
    return start_date, end_date, include_overbooking


class ReservationControlReportView(APIView):
    """GET /api/admin/reports/reservation-control/?start_date=&end_date=&format=pdf"""
    permission_classes = [IsStaffUser]

    def get(self, request):
        from .services import get_reservation_control_report
        from .reservation_control_pdf import generate_reservation_control_pdf

        parsed = _parse_reservation_control_dates(request)
        if isinstance(parsed[2], str):
            return Response({'detail': parsed[2]}, status=status.HTTP_400_BAD_REQUEST)
        start_date, end_date, include_overbooking = parsed

        if request.query_params.get('format', '').lower() == 'pdf':
            pdf_bytes = generate_reservation_control_pdf(start_date, end_date, include_overbooking)
            filename = f'reservation-control_{start_date}_{end_date}.pdf'
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            return response

        data = get_reservation_control_report(start_date, end_date, include_overbooking)
        return Response(data)


class ReservationControlPDFView(APIView):
    """Legacy alias — GET /api/admin/reports/reservation-control/pdf/"""
    permission_classes = [IsStaffUser]

    def get(self, request):
        return ReservationControlReportView().get(request)


class RecentBookingsReportView(APIView):
    """GET /api/admin/reports/recent-bookings/"""
    permission_classes = [IsAdmin]

    def get(self, request):
        from bookings.models import Booking
        bookings = Booking.objects.select_related('guest', 'room_type').order_by('-created_at')[:100]
        return Response({
            'count': len(bookings),
            'bookings': [
                {
                    'id': b.id,
                    'booking_ref': b.booking_ref,
                    'guest_name': b.guest.full_name,
                    'room_type': b.room_type.name,
                    'check_in': b.check_in_date.isoformat(),
                    'check_out': b.check_out_date.isoformat(),
                    'status': b.status,
                    'total_price': float(b.total_price),
                    'created_at': b.created_at.isoformat(),
                } for b in bookings
            ]
        })

# ──────────────────────────────────────────────
# ERP Features (Phase 1)
# ──────────────────────────────────────────────

class HotelConfigView(APIView):
    """GET/PUT /api/admin/config/"""
    permission_classes = [IsAdmin]

    def get(self, request):
        config = HotelConfig.load()
        return Response({
            'hotel_name': config.hotel_name,
            'business_date': config.business_date.isoformat(),
            'timezone': config.timezone,
            'language': config.language,
            'theme': config.theme,
        })

    def put(self, request):
        config = HotelConfig.load()
        if 'language' in request.data:
            config.language = request.data['language']
        if 'theme' in request.data:
            config.theme = request.data['theme']
        # Note: business_date is only advanced via Night Audit, not here.
        config.save()
        return Response({'detail': 'Configuration updated.'})


class FolioWindowView(APIView):
    """GET/POST /api/admin/bookings/<booking_id>/folio-windows/"""
    permission_classes = [IsStaffUser]

    def get(self, request, booking_id):
        windows = FolioWindow.objects.filter(booking_id=booking_id).order_by('window_number')
        if not windows.exists():
            FolioWindow.objects.create(booking_id=booking_id, window_number=1, label='Main Folio')
            windows = FolioWindow.objects.filter(booking_id=booking_id)

        from bookings.models import FolioCharge, Payment
        data = []
        for w in windows:
            charges = FolioCharge.objects.filter(booking_id=booking_id, folio_window=w.window_number, is_void=False)
            data.append({
                'window_number': w.window_number,
                'label': w.label,
                'charges': [{
                    'id': c.id,
                    'type': c.charge_type,
                    'desc': c.description,
                    'amount': float(c.amount),
                    'qty': c.quantity,
                    'total': float(c.total),
                    'date': str(c.charge_date),
                    'is_adjustment': c.is_adjustment
                } for c in charges]
            })
        return Response(data)

    def post(self, request, booking_id):
        """Create a new window for this booking, up to 8."""
        count = FolioWindow.objects.filter(booking_id=booking_id).count()
        if count >= 8:
            return Response({'detail': 'Maximum 8 folio windows allowed.'}, status=status.HTTP_400_BAD_REQUEST)
        
        label = request.data.get('label', f'Window {count + 1}')
        window = FolioWindow.objects.create(booking_id=booking_id, window_number=count + 1, label=label)
        return Response({'window_number': window.window_number, 'label': window.label})


class FolioTransferView(APIView):
    """POST /api/admin/bookings/<booking_id>/folio-transfer/"""
    permission_classes = [IsStaffUser]

    def post(self, request, booking_id):
        charge_id = request.data.get('charge_id')
        target_window = request.data.get('target_window')

        from bookings.models import FolioCharge
        try:
            charge = FolioCharge.objects.get(id=charge_id, booking_id=booking_id)
        except FolioCharge.DoesNotExist:
            return Response({'detail': 'Charge not found'}, status=status.HTTP_404_NOT_FOUND)

        old_window = charge.folio_window
        charge.folio_window = target_window
        charge.is_transferred = True
        charge.save(update_fields=['folio_window', 'is_transferred'])

        FolioAuditLog.objects.create(
            folio_charge=charge,
            action=FolioAuditLog.ActionType.TRANSFER,
            from_window=old_window,
            to_window=target_window,
            performed_by=request.user
        )

        return Response({'detail': 'Charge transferred successfully.'})


class FolioAdjustmentView(APIView):
    """POST /api/admin/folio/<charge_id>/adjust/"""
    permission_classes = [IsStaffUser]

    def post(self, request, charge_id):
        reason_code = request.data.get('reason_code')
        reason_note = request.data.get('reason_note', '')
        
        from bookings.models import FolioCharge
        try:
            charge = FolioCharge.objects.get(id=charge_id)
        except FolioCharge.DoesNotExist:
            return Response({'detail': 'Charge not found'}, status=status.HTTP_404_NOT_FOUND)

        if charge.is_void:
            return Response({'detail': 'Charge is already voided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Instead of deleting, mark it as voided with an adjustment code
        charge.is_void = True
        charge.void_reason = reason_note
        charge.void_by = request.user
        charge.void_at = timezone.now()
        charge.reason_code = reason_code
        charge.save(update_fields=['is_void', 'void_reason', 'void_by', 'void_at', 'reason_code'])

        FolioAuditLog.objects.create(
            folio_charge=charge,
            action=FolioAuditLog.ActionType.ADJUSTMENT,
            reason_code=reason_code,
            reason_note=reason_note,
            performed_by=request.user
        )

        return Response({'detail': 'Adjustment recorded securely.'})


class QueueManagementView(APIView):
    """GET/POST /api/admin/dashboard/queue/"""
    permission_classes = [IsStaffUser]

    def get(self, request):
        queue = QueueEntry.objects.filter(is_resolved=False).select_related('booking__guest')
        data = [{
            'id': q.id,
            'booking_ref': q.booking.booking_ref,
            'guest_name': q.booking.guest.full_name,
            'priority': q.priority,
            'queued_at': q.queued_at.isoformat(),
            'wait_minutes': q.wait_minutes,
            'notes': q.notes,
        } for q in queue]
        return Response(data)

    def post(self, request):
        booking_id = request.data.get('booking_id')
        action = request.data.get('action') # 'enqueue', 'resolve'
        
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=404)

        if action == 'enqueue':
            q, created = QueueEntry.objects.get_or_create(booking=booking, is_resolved=False)
            if not created:
                return Response({'detail': 'Already in queue.'}, status=400)
            return Response({'detail': 'Added to queue.'})
            
        elif action == 'resolve':
            try:
                q = QueueEntry.objects.get(booking=booking, is_resolved=False)
                q.is_resolved = True
                q.room_assigned_at = timezone.now()
                q.save()
                return Response({'detail': 'Queue resolved.'})
            except QueueEntry.DoesNotExist:
                return Response({'detail': 'Queue entry not found.'}, status=404)
        
        return Response({'detail': 'Invalid action.'}, status=400)
