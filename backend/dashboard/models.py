from datetime import date as date_type
from django.conf import settings
from django.db import models


class HotelConfig(models.Model):
    """Singleton model — stores hotel-wide operational config including Business Date."""
    hotel_name = models.CharField(max_length=200, default='Crown Hotel')
    business_date = models.DateField(default=date_type.today)
    night_audit_pin = models.CharField(max_length=10, default='1234', help_text='PIN required to execute Night Audit')
    manager_override_pin = models.CharField(
        max_length=10, default='5678',
        help_text='PIN to bypass overdue-checkout block during Night Audit',
    )
    timezone = models.CharField(max_length=50, default='Asia/Dhaka')
    language = models.CharField(max_length=5, choices=[('en', 'English'), ('bn', 'Bangla')], default='en')
    theme = models.CharField(max_length=10, choices=[('dark', 'Dark'), ('light', 'Light')], default='dark')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Hotel Configuration'
        verbose_name_plural = 'Hotel Configuration'

    def __str__(self):
        return f"Hotel Config — Business Date: {self.business_date}"

    def save(self, *args, **kwargs):
        self.pk = 1  # Singleton
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class NightAuditLog(models.Model):
    audit_date = models.DateField(unique=True)
    total_rooms_sold = models.PositiveIntegerField(default=0)
    total_rooms_available = models.PositiveIntegerField(default=0)
    occupancy_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    room_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    fnb_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    service_charge_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    no_show_count = models.PositiveIntegerField(default=0)
    new_bookings = models.PositiveIntegerField(default=0)
    check_ins = models.PositiveIntegerField(default=0)
    check_outs = models.PositiveIntegerField(default=0)
    # 3-interval house report snapshots
    am_occupied = models.PositiveIntegerField(default=0, help_text='AM (06:00) occupied rooms')
    pm_occupied = models.PositiveIntegerField(default=0, help_text='PM (14:00) occupied rooms')
    evening_occupied = models.PositiveIntegerField(default=0, help_text='Evening (22:00) occupied rooms')
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='night_audits'
    )
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-audit_date']

    def __str__(self):
        return f"Night Audit — {self.audit_date}"


class FolioWindow(models.Model):
    """Multi-folio billing windows — up to 8 per booking (OPERA-style)."""
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='folio_windows')
    window_number = models.PositiveSmallIntegerField(default=1)  # 1-8
    label = models.CharField(max_length=100, default='', blank=True, help_text='e.g. "Personal", "Corporate"')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('booking', 'window_number')
        ordering = ['window_number']

    def __str__(self):
        return f"Booking {self.booking.booking_ref} — Window {self.window_number}"


class QueueEntry(models.Model):
    """Q-Status: Guest waiting for room to be cleaned."""
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='queue_entry')
    queued_at = models.DateTimeField(auto_now_add=True)
    room_assigned_at = models.DateTimeField(null=True, blank=True)
    priority = models.PositiveSmallIntegerField(default=5, help_text='1=Highest, 10=Lowest')
    notes = models.TextField(blank=True, default='')
    is_resolved = models.BooleanField(default=False)

    class Meta:
        ordering = ['priority', 'queued_at']

    def __str__(self):
        return f"Queue — {self.booking.booking_ref}"

    @property
    def wait_minutes(self):
        if self.room_assigned_at:
            return int((self.room_assigned_at - self.queued_at).total_seconds() / 60)
        from django.utils import timezone
        return int((timezone.now() - self.queued_at).total_seconds() / 60)


class FolioAuditLog(models.Model):
    """Immutable audit trail for all folio actions (void, adjustment, transfer)."""
    class ActionType(models.TextChoices):
        VOID = 'VOID', 'Void'
        ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'
        TRANSFER = 'TRANSFER', 'Transfer Between Windows'
        POST = 'POST', 'Post Charge'

    class ReasonCode(models.TextChoices):
        BILLING_ERROR = 'BILLING_ERROR', 'Billing Error'
        COMP = 'COMP', 'Complimentary'
        GOODWILL = 'GOODWILL', 'Goodwill Gesture'
        MANAGER_APPROVAL = 'MANAGER_APPROVAL', 'Manager Approval'
        DUPLICATE = 'DUPLICATE', 'Duplicate Entry'
        RATE_CORRECTION = 'RATE_CORRECTION', 'Rate Correction'
        OTHER = 'OTHER', 'Other'

    folio_charge = models.ForeignKey('bookings.FolioCharge', on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=15, choices=ActionType.choices)
    reason_code = models.CharField(max_length=20, choices=ReasonCode.choices, blank=True, default='')
    reason_note = models.TextField(blank=True, default='')
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    from_window = models.PositiveSmallIntegerField(null=True, blank=True)
    to_window = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} — Charge #{self.folio_charge_id} by {self.performed_by}"

