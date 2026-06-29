"""
Crown HMS — config/models.py (Enterprise Blueprint)
===================================================
Singleton operational configuration. Lives in dashboard app today.
"""
from datetime import date as date_type
from django.conf import settings
from django.db import models


class HotelConfig(models.Model):
    """
    SINGLETON — one row (pk=1) per property.

    business_date is the hotel's operational calendar date.
    ALL financial transactions (charges, payments, audit) MUST use this date.
    Only Night Audit is authorized to advance business_date (+1 day).

    Never use: datetime.now().date() for revenue posting.
  Always use: HotelConfig.load().business_date
    """

    hotel_name = models.CharField(max_length=200, default='Crown Hotel')
    property_code = models.CharField(max_length=10, default='CRN', help_text='OPERA-style property code')
    business_date = models.DateField(default=date_type.today, db_index=True)
    night_audit_pin = models.CharField(max_length=128, help_text='Hashed PIN for night audit execution')
    timezone = models.CharField(max_length=50, default='Asia/Dhaka')
    default_currency = models.CharField(max_length=3, default='BDT')
    settlement_tolerance = models.DecimalField(
        max_digits=4, decimal_places=2, default='0.01',
        help_text='Revenue Guard: max unsettled balance allowed at checkout (BDT)',
    )
    language = models.CharField(max_length=5, default='en')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Hotel Configuration'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class NightAuditLog(models.Model):
    """
    Immutable snapshot when business_date rolls forward.
    Captures occupancy + revenue KPIs at exact moment of audit.
    """

    audit_date = models.DateField(unique=True, help_text='The business_date being closed')
    next_business_date = models.DateField(help_text='business_date after roll-forward')

    # Occupancy KPIs
    total_rooms = models.PositiveIntegerField(default=0)
    rooms_sold = models.PositiveIntegerField(default=0)
    rooms_available = models.PositiveIntegerField(default=0)
    occupancy_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Revenue KPIs (posted on audit_date)
    room_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    fnb_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    spa_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    other_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_revenue = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Activity counts
    arrivals = models.PositiveIntegerField(default=0)
    departures = models.PositiveIntegerField(default=0)
    no_shows = models.PositiveIntegerField(default=0)
    walk_ins = models.PositiveIntegerField(default=0)

    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-audit_date']
