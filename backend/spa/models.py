from django.conf import settings
from django.db import models


class SpaService(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=8, decimal_places=2)
    duration = models.PositiveIntegerField(help_text='Duration in minutes', default=60)
    image = models.ImageField(upload_to='spa/', blank=True, null=True)
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


# ── Spa → PMS Folio Bridge ──────────────────────────────────────────────

class SpaAppointment(models.Model):
    """Links a spa service to a guest booking for folio posting."""

    class Status(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        COMPLETED = 'COMPLETED', 'Completed'
        POSTED = 'POSTED', 'Posted to Folio'
        CANCELLED = 'CANCELLED', 'Cancelled'
        NO_SHOW = 'NO_SHOW', 'No Show'

    service = models.ForeignKey(
        SpaService,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='appointments',
    )
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='spa_appointments',
        help_text='Linked booking for folio posting (leave blank for non-resident guests)',
    )
    guest_name = models.CharField(
        max_length=200, blank=True, default='',
        help_text='Guest name for non-resident or walk-in spa guests',
    )
    appointment_date = models.DateField()
    appointment_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.SCHEDULED)
    price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    notes = models.TextField(blank=True, default='')
    posted_to_folio = models.BooleanField(default=False)
    folio_charge = models.OneToOneField(
        'bookings.FolioCharge',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='spa_appointment',
        help_text='The folio charge created when posting to the guest bill',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='spa_appointments_created',
    )
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='spa_appointments_posted',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-appointment_date', '-appointment_time']

    def __str__(self):
        booking_ref = self.booking.booking_ref if self.booking else 'Walk-in'
        service_name = self.service.name if self.service else 'Service'
        return f"Spa: {service_name} ({booking_ref}) — {self.appointment_date}"
