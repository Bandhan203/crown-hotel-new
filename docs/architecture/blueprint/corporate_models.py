"""
Crown HMS — corporate/models.py (Enterprise Blueprint)
======================================================
Corporate CRM — negotiated accounts, city ledger billing, rate contracts.
"""
from django.db import models


class CorporateAccount(models.Model):
    """
    Managed company account for corporate bookings.
    Links to Booking for city-ledger (COMPANY_CREDIT) settlement.
    """

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        INACTIVE = 'INACTIVE', 'Inactive'

    company_code = models.CharField(max_length=20, unique=True)
    company_name = models.CharField(max_length=200, db_index=True)
    trade_name = models.CharField(max_length=200, blank=True, default='')

    # Billing
    billing_address = models.TextField(blank=True, default='')
    tax_id = models.CharField(max_length=50, blank=True, default='')  # TIN/VAT
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_terms_days = models.PositiveIntegerField(default=30)

    # Contacts
    contact_person = models.CharField(max_length=200, blank=True, default='')
    contact_email = models.EmailField(blank=True, default='')
    contact_phone = models.CharField(max_length=20, blank=True, default='')

    # Negotiated rate
    negotiated_discount_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    default_folio_window = models.PositiveSmallIntegerField(default=2, help_text='Corporate charges route to window N')

    status = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['company_name']

    def __str__(self):
        return f'{self.company_code} — {self.company_name}'


class CorporateContract(models.Model):
    """Rate contract validity window for a corporate account."""
    account = models.ForeignKey(CorporateAccount, on_delete=models.CASCADE, related_name='contracts')
    valid_from = models.DateField()
    valid_to = models.DateField()
    room_type = models.ForeignKey('rooms.RoomType', on_delete=models.CASCADE)
    contracted_rate = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [('account', 'room_type', 'valid_from')]
