"""Celery tasks for booking-related async operations."""
from datetime import date, timedelta

from celery import shared_task


@shared_task
def send_checkin_reminders():
    """Send check-in reminder emails for tomorrow's arrivals.
    
    Schedule this task to run daily (e.g. at 10:00 AM) via Celery Beat:
        CELERY_BEAT_SCHEDULE = {
            'checkin-reminders': {
                'task': 'bookings.tasks.send_checkin_reminders',
                'schedule': crontab(hour=10, minute=0),
            },
        }
    """
    from bookings.models import Booking
    from common.email import send_checkin_reminder

    tomorrow = date.today() + timedelta(days=1)
    bookings = Booking.objects.filter(
        check_in_date=tomorrow,
        status__in=['PENDING', 'CONFIRMED'],
    ).select_related('guest', 'room_type')

    sent = 0
    for booking in bookings:
        send_checkin_reminder(booking)
        sent += 1

    return f"Sent {sent} check-in reminder(s) for {tomorrow}"
