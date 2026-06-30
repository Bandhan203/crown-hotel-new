"""Email notifications for the contact / messages module."""

import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


def _hotel_name():
    try:
        from cms.models import SiteSetting
        site = SiteSetting.objects.first()
        if site and site.site_name:
            return site.site_name
    except Exception:
        pass
    return 'Hotel Crown'


def _notify_email():
    try:
        from cms.models import SiteSetting
        site = SiteSetting.objects.first()
        if site and site.contact_email:
            return site.contact_email
    except Exception:
        pass
    return getattr(settings, 'CONTACT_NOTIFY_EMAIL', 'hotelcrownbd@gmail.com')


def _from_email():
    return getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@hotelcrownbd.com')


def notify_staff_new_message(message) -> bool:
    """Alert hotel inbox when a guest submits the contact form."""
    subject = f'[New Inquiry] {message.subject or "Website contact"}'
    body = (
        f'New message from {message.name}\n'
        f'Email: {message.email}\n'
        f'Phone: {message.phone or "—"}\n'
        f'Source: {message.get_source_display()}\n'
        f'Date: {timezone.localtime(message.created_at).strftime("%d %b %Y, %I:%M %p")}\n\n'
        f'{message.message}\n\n'
        f'— Reply from admin panel: Messages module'
    )
    try:
        send_mail(subject, body, _from_email(), [_notify_email()], fail_silently=False)
        return True
    except Exception as exc:
        logger.warning('Staff notification email failed: %s', exc)
        return False


def send_guest_auto_reply(message) -> bool:
    """Thank-you auto-reply to the guest."""
    hotel = _hotel_name()
    subject = f'Thank you for contacting {hotel}'
    body = (
        f'Dear {message.name},\n\n'
        f'Thank you for reaching out to {hotel}. We have received your message'
        f' regarding "{message.subject or "your inquiry"}" and our team will respond shortly.\n\n'
        f'Your message:\n"{message.message[:500]}{"..." if len(message.message) > 500 else ""}"\n\n'
        f'For urgent matters, please call us directly.\n\n'
        f'Warm regards,\n{hotel} Team'
    )
    try:
        send_mail(subject, body, _from_email(), [message.email], fail_silently=False)
        return True
    except Exception as exc:
        logger.warning('Guest auto-reply email failed: %s', exc)
        return False


def send_admin_reply_email(message, reply_text: str, staff_name: str = '') -> bool:
    """Send staff reply to the guest."""
    hotel = _hotel_name()
    subject = f'Re: {message.subject or "Your inquiry"} — {hotel}'
    body = (
        f'Dear {message.name},\n\n'
        f'{reply_text.strip()}\n\n'
        f'—\n'
        f'{staff_name or "Guest Relations"}\n{hotel}'
    )
    try:
        send_mail(subject, body, _from_email(), [message.email], fail_silently=False)
        return True
    except Exception as exc:
        logger.warning('Admin reply email failed: %s', exc)
        return False
