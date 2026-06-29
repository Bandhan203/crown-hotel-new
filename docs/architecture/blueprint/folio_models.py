"""
Crown HMS — folio/models.py (Enterprise Blueprint)
==================================================
Financial sub-ledger. VOID-NOT-DELETE policy enforced here.
Recommended as separate Django app `folio` importing Booking FK.

REVENUE GUARD integration points marked inline.
"""
from django.conf import settings
from django.db import models
from django.db.models import Case, F, Sum, When
from decimal import Decimal


class FolioWindow(models.Model):
    """
    OPERA-style split billing: up to 8 windows per booking.
    e.g. Window 1 = Guest personal, Window 2 = Company, Window 3 = Travel agent.
    """
    MAX_WINDOWS = 8

    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='folio_windows')
    window_number = models.PositiveSmallIntegerField()  # 1–8
    label = models.CharField(max_length=100, blank=True, default='')
    bill_to = models.CharField(max_length=20, choices=[
        ('GUEST', 'Guest'), ('COMPANY', 'Company'), ('AGENT', 'Agent'),
    ], default='GUEST')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('booking', 'window_number')]
        ordering = ['window_number']


class OutletDepartment(models.Model):
    """
    POS integration anchor — Restaurant, Spa, Minibar, Laundry, etc.
    Outlet bills post FolioCharge with FK to this table.
    """
    code = models.CharField(max_length=20, unique=True)  # REST, SPA, MINIBAR
    name = models.CharField(max_length=100)
    default_folio_window = models.PositiveSmallIntegerField(default=1)
    default_charge_type = models.CharField(max_length=20, default='FOOD')
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class FolioCharge(models.Model):
    """
    Posted charge line. NEVER hard-deleted.
    Void → is_void=True + FolioAuditLog + optional reversing entry.

    BUSINESS DATE: charge_date MUST = HotelConfig.business_date at post time.
    POS INTEGRATION: outlet + pos_reference link back to source bill.
    """

    class ChargeType(models.TextChoices):
        ROOM = 'ROOM', 'Room Rent'
        FOOD = 'FOOD', 'Food & Beverage'
        BEVERAGE = 'BEVERAGE', 'Beverage'
        SPA = 'SPA', 'Spa & Wellness'
        LAUNDRY = 'LAUNDRY', 'Laundry'
        MINIBAR = 'MINIBAR', 'Minibar'
        PHONE = 'PHONE', 'Telephone'
        SERVICE = 'SERVICE', 'Service Charge'
        TAX = 'TAX', 'VAT / Tax'
        DISCOUNT = 'DISCOUNT', 'Discount'
        DEPOSIT = 'DEPOSIT', 'Deposit (credit)'
        ADJUSTMENT = 'ADJUSTMENT', 'Manual Adjustment'

    booking = models.ForeignKey('bookings.Booking', on_delete=models.PROTECT, related_name='folio_charges')
    folio_window = models.PositiveSmallIntegerField(default=1)  # 1–8, maps to FolioWindow.window_number
    charge_type = models.CharField(max_length=20, choices=ChargeType.choices)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    # BUSINESS DATE INTEGRATION — not server date
    charge_date = models.DateField(db_index=True)
    business_date = models.DateField(db_index=True, help_text='HotelConfig.business_date at post time')

    outlet = models.ForeignKey(OutletDepartment, null=True, blank=True, on_delete=models.SET_NULL, related_name='charges')
    pos_reference = models.CharField(max_length=100, blank=True, default='', help_text='POS bill / ticket number')
    reference = models.CharField(max_length=100, blank=True, default='')

    is_adjustment = models.BooleanField(default=False)
    is_void = models.BooleanField(default=False, db_index=True)
    is_transferred = models.BooleanField(default=False)
    void_reason = models.TextField(blank=True, default='')
    void_at = models.DateTimeField(null=True, blank=True)
    void_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='voided_charges')

    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='posted_charges')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['charge_date', 'created_at']
        indexes = [
            models.Index(fields=['booking', 'folio_window', 'is_void']),
            models.Index(fields=['booking', 'charge_date']),
        ]

    def save(self, *args, **kwargs):
        if not self.total:
            self.total = self.amount * self.quantity
        super().save(*args, **kwargs)


class Payment(models.Model):
    """
    Settlement ledger — receipts and refunds.
    is_refund=True → money returned to guest (reduces net payments).

    REVENUE GUARD: net_payments used in balance calculation at checkout.
    """

    class Method(models.TextChoices):
        CASH = 'CASH', 'Cash'
        CARD = 'CARD', 'Card / POS'
        ONLINE_SSLCOMMERZ = 'ONLINE_SSLCOMMERZ', 'SSLCommerz Online'
        BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'
        COMPANY_CREDIT = 'COMPANY_CREDIT', 'Company Credit (City Ledger)'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        VOIDED = 'VOIDED', 'Voided'  # void-not-delete for payments too

    booking = models.ForeignKey('bookings.Booking', on_delete=models.PROTECT, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # always positive; is_refund flags direction
    is_refund = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=50, choices=Method.choices)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)

    transaction_id = models.CharField(max_length=255, blank=True, default='')
    company_name = models.CharField(max_length=200, blank=True, default='')  # for COMPANY_CREDIT

    # BUSINESS DATE INTEGRATION
    business_date = models.DateField(null=True, blank=True, db_index=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['booking', 'status', 'is_refund'])]


class FolioAuditLog(models.Model):
    """
    Immutable audit trail — every void, adjustment, transfer, post.
    Required for Revenue Guard compliance and manager review.
    """

    class Action(models.TextChoices):
        POST = 'POST', 'Post Charge'
        VOID = 'VOID', 'Void Charge'
        ADJUSTMENT = 'ADJUSTMENT', 'Adjustment / Reverse Entry'
        TRANSFER = 'TRANSFER', 'Window Transfer'

    class ReasonCode(models.TextChoices):
        BILLING_ERROR = 'BILLING_ERROR', 'Billing Error'
        COMP = 'COMP', 'Complimentary'
        GOODWILL = 'GOODWILL', 'Goodwill'
        MANAGER_APPROVAL = 'MANAGER_APPROVAL', 'Manager Approval'
        DUPLICATE = 'DUPLICATE', 'Duplicate'
        RATE_CORRECTION = 'RATE_CORRECTION', 'Rate Correction'
        OTHER = 'OTHER', 'Other'

    folio_charge = models.ForeignKey(FolioCharge, on_delete=models.PROTECT, related_name='audit_logs')
    action = models.CharField(max_length=15, choices=Action.choices)
    reason_code = models.CharField(max_length=20, choices=ReasonCode.choices)
    reason_note = models.TextField()  # mandatory manager note
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    from_window = models.PositiveSmallIntegerField(null=True, blank=True)
    to_window = models.PositiveSmallIntegerField(null=True, blank=True)
    business_date = models.DateField()  # audit stamped to business date
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']


# ── Revenue Guard Service (lives in folio/services.py) ─────────────

class FolioBalanceService:
    """
    Single source of truth for folio balance.
    Used by: CheckoutModule, NightAudit, Reports, POS validation.
    """

    SETTLEMENT_TOLERANCE = Decimal('0.01')

    @classmethod
    def compute(cls, booking) -> dict:
        folio_total = (
            FolioCharge.objects.filter(booking=booking, is_void=False)
            .aggregate(t=Sum('total'))['t'] or Decimal('0')
        )
        net_payments = (
            Payment.objects.filter(booking=booking, status='COMPLETED')
            .aggregate(net=Sum(Case(
                When(is_refund=True, then=-F('amount')),
                default=F('amount'),
            )))['net'] or Decimal('0')
        )
        balance = folio_total - net_payments
        return {
            'folio_total': float(folio_total),
            'net_payments': float(net_payments),
            'balance': float(balance),
            'is_settled': abs(balance) <= cls.SETTLEMENT_TOLERANCE,
        }

    @classmethod
    def assert_settled_for_checkout(cls, booking) -> None:
        """REVENUE GUARD — raise if checkout not allowed."""
        info = cls.compute(booking)
        if not info['is_settled']:
            raise ValueError(f'Revenue Guard: balance BDT {info["balance"]:.2f} must be zero.')
