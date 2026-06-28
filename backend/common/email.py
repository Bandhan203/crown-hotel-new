"""Email notification helpers for hotel management."""
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string


def send_booking_confirmation(booking):
    """Send booking confirmation email to the guest."""
    subject = f"Booking Confirmed — {booking.booking_ref} | Navy Hotel"
    message = (
        f"Dear {booking.guest.full_name},\n\n"
        f"Your booking has been confirmed!\n\n"
        f"Booking Reference: {booking.booking_ref}\n"
        f"Room Type: {booking.room_type.name}\n"
        f"Check-in: {booking.check_in_date}\n"
        f"Check-out: {booking.check_out_date}\n"
        f"Nights: {booking.nights}\n"
        f"Total: BDT {booking.total_price:,.2f}\n\n"
        f"Please present a valid ID at check-in.\n\n"
        f"Thank you for choosing Navy Hotel!\n"
        f"Navy Hotel Management"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@navyhotel.com'),
        recipient_list=[booking.guest.email],
        fail_silently=True,
    )


def send_checkin_reminder(booking):
    """Send check-in reminder email (typically day before arrival)."""
    subject = f"Check-in Reminder — {booking.booking_ref} | Navy Hotel"
    message = (
        f"Dear {booking.guest.full_name},\n\n"
        f"This is a friendly reminder that your check-in is tomorrow.\n\n"
        f"Booking Reference: {booking.booking_ref}\n"
        f"Check-in Date: {booking.check_in_date}\n"
        f"Room Type: {booking.room_type.name}\n\n"
        f"Check-in time: 2:00 PM onwards\n"
        f"Please bring a valid photo ID.\n\n"
        f"We look forward to welcoming you!\n"
        f"Navy Hotel Management"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@navyhotel.com'),
        recipient_list=[booking.guest.email],
        fail_silently=True,
    )


def send_checkout_invoice(booking):
    """Send invoice email to guest after checkout."""
    subject = f"Invoice — {booking.booking_ref} | Navy Hotel"
    message = (
        f"Dear {booking.guest.full_name},\n\n"
        f"Thank you for staying with us!\n\n"
        f"Booking Reference: {booking.booking_ref}\n"
        f"Room: {booking.room.room_number if booking.room else booking.room_type.name}\n"
        f"Check-in: {booking.check_in_date}\n"
        f"Check-out: {booking.check_out_date}\n"
        f"Grand Total: BDT {(booking.grand_total or booking.total_price):,.2f}\n\n"
        f"Your detailed invoice is available in your My Bookings portal.\n\n"
        f"We hope to see you again!\n"
        f"Navy Hotel Management"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@navyhotel.com'),
        recipient_list=[booking.guest.email],
        fail_silently=True,
    )
