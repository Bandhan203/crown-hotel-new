"""
Crown HMS — bookings/models.py (Enterprise Blueprint)
=====================================================
Central PMS anchor: Booking + Registration + RatePlan.
Financial models live in folio_models.py (target separate app).
"""
from django.conf import settings
from django.db import models

from common.utils import generate_booking_ref, generate_registration_ref


class RatePlan(models.Model):
    """Negotiated / promotional rate codes (corporate, OTA, seasonal)."""

    class DiscountType(models.TextChoices):
        PERCENTAGE = 'PERCENTAGE', 'Percentage'
        FIXED = 'FIXED', 'Fixed Amount'

    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    min_nights = models.PositiveIntegerField(default=1)
    room_types = models.ManyToManyField('rooms.RoomType', blank=True, related_name='rate_plans')
    corporate_account = models.ForeignKey(
        'corporate.CorporateAccount', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='rate_plans',
    )
    is_active = models.BooleanField(default=True)


class Booking(models.Model):
    """
    SYSTEM ANCHOR — every reservation, walk-in, and in-house stay.
    Lifecycle: PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT
    Branches: CANCELLED, NO_SHOW

    REVENUE GUARD: checkout blocked until folio balance ≈ 0 (see folio services).
    BUSINESS DATE: actual_check_in/out stamped from HotelConfig, not OS clock.
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        CHECKED_IN = 'CHECKED_IN', 'Checked In'
        CHECKED_OUT = 'CHECKED_OUT', 'Checked Out'
        CANCELLED = 'CANCELLED', 'Cancelled'
        NO_SHOW = 'NO_SHOW', 'No Show'

    class BookingSource(models.TextChoices):
        WEBSITE = 'WEBSITE', 'Website'
        PHONE = 'PHONE', 'Phone'
        WALK_IN = 'WALK_IN', 'Walk-in'
        OTA = 'OTA', 'OTA'
        AGENT = 'AGENT', 'Travel Agent'
        CORPORATE = 'CORPORATE', 'Corporate'

    class MealPlan(models.TextChoices):
        EP = 'EP', 'Room Only'
        CP = 'CP', 'Room + Breakfast'
        MAP = 'MAP', 'Room + Breakfast + One Meal'
        AP = 'AP', 'Full Board'

    # ── References ─────────────────────────────────────────────────
    booking_ref = models.CharField(max_length=20, unique=True, default=generate_booking_ref, db_index=True)

    # TARGET: FK to GuestProfile (CRM), not CustomUser directly
    guest_profile = models.ForeignKey(
        'accounts.GuestProfile', on_delete=models.PROTECT,
        related_name='bookings', null=True, blank=True,
    )
    guest_user = models.ForeignKey(  # Auth account for online bookings
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='bookings',
    )

    room = models.ForeignKey('rooms.Room', on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    room_type = models.ForeignKey('rooms.RoomType', on_delete=models.PROTECT, related_name='bookings')
    rate_plan = models.ForeignKey(RatePlan, on_delete=models.SET_NULL, null=True, blank=True)
    corporate_account = models.ForeignKey(
        'corporate.CorporateAccount', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='bookings',
    )

    # ── Stay dates & PAX ───────────────────────────────────────────
    check_in_date = models.DateField(db_index=True)
    check_out_date = models.DateField(db_index=True)
    adults = models.PositiveIntegerField(default=1)
    children = models.PositiveIntegerField(default=0)
    infants = models.PositiveIntegerField(default=0)
    extra_bed = models.PositiveIntegerField(default=0)
    meal_plan = models.CharField(max_length=5, choices=MealPlan.choices, default=MealPlan.EP)

    # ── Logistics / flight ─────────────────────────────────────────
    arrival_time = models.TimeField(null=True, blank=True)
    departure_time = models.TimeField(null=True, blank=True)
    flight_pickup_no = models.CharField(max_length=50, blank=True, default='')
    flight_eta = models.CharField(max_length=10, blank=True, default='')
    pickup_required = models.BooleanField(default=False)
    flight_drop_no = models.CharField(max_length=50, blank=True, default='')
    flight_etd = models.CharField(max_length=10, blank=True, default='')
    drop_required = models.BooleanField(default=False)
    transport_notes = models.TextField(blank=True, default='')
    coming_from = models.CharField(max_length=200, blank=True, default='')
    purpose_of_visit = models.CharField(max_length=200, blank=True, default='')

    # ── Pricing ────────────────────────────────────────────────────
    rack_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    offer_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    service_charge_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='BDT')

    # ── Lifecycle ──────────────────────────────────────────────────
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING, db_index=True)
    booking_source = models.CharField(max_length=20, choices=BookingSource.choices, default=BookingSource.PHONE)

    actual_check_in = models.DateTimeField(null=True, blank=True)   # business_date derived
    actual_check_out = models.DateTimeField(null=True, blank=True)  # business_date derived
    checked_in_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='checkins_performed')
    checked_out_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='checkouts_performed')

    # ── Folio control flags ────────────────────────────────────────
    no_post = models.BooleanField(default=False, help_text='Block POS charges to this folio')
    dnm = models.BooleanField(default=False, help_text='Do Not Move room')
    folio_settled_at = models.DateTimeField(null=True, blank=True)  # REVENUE GUARD checkpoint

    # ── Group / multi-room ─────────────────────────────────────────
    parent_booking = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='child_bookings')
    num_rooms = models.PositiveIntegerField(default=1)

    notes_internal = models.TextField(blank=True, default='')
    special_requests = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'check_in_date']),
            models.Index(fields=['room', 'status']),
        ]

    @property
    def nights(self):
        return (self.check_out_date - self.check_in_date).days


class Registration(models.Model):
    """
    IMMUTABLE LEGAL RECORD at check-in moment.
    Created inside atomic transaction with CHECKED_IN status change.
    Updates during stay sync to GuestProfile but Registration snapshot preserved.
    """

    class Mode(models.TextChoices):
        ADVANCE = 'ADVANCE', 'Advance Reservation'
        WALK_IN = 'WALK_IN', 'Walk-in'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        REGISTERED = 'REGISTERED', 'Registered (pre-arrival)'
        CHECKED_IN = 'CHECKED_IN', 'Checked In'

    registration_ref = models.CharField(max_length=20, unique=True, default=generate_registration_ref)
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='registration_record')
    guest_profile = models.ForeignKey('accounts.GuestProfile', on_delete=models.PROTECT, related_name='registrations')

    mode = models.CharField(max_length=10, choices=Mode.choices)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT)

    # Snapshot fields (copied at check-in — do not mutate after CHECKED_IN)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, default='')
    id_type = models.CharField(max_length=30, blank=True, default='')
    id_number = models.CharField(max_length=50, blank=True, default='')
    nationality = models.CharField(max_length=100, blank=True, default='')
    visa_no = models.CharField(max_length=50, blank=True, default='')
    room_number = models.CharField(max_length=50, blank=True, default='')
    check_in_date = models.DateField()
    check_out_date = models.DateField()

    signed_card = models.ImageField(upload_to='registration_cards/', null=True, blank=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)  # business_date context
    checked_in_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['registration_ref'])]
