from django.conf import settings
from django.db import models

from common.utils import generate_booking_ref, generate_registration_ref


class RatePlan(models.Model):
    class DiscountType(models.TextChoices):
        PERCENTAGE = 'PERCENTAGE', 'Percentage'
        FIXED = 'FIXED', 'Fixed'

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True, default='')
    discount_type = models.CharField(max_length=10, choices=DiscountType.choices, default=DiscountType.PERCENTAGE)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    min_nights = models.PositiveIntegerField(default=1)
    max_nights = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    room_types = models.ManyToManyField('rooms.RoomType', blank=True, related_name='rate_plans')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        CONFIRMED = 'CONFIRMED', 'Confirmed'
        CHECKED_IN = 'CHECKED_IN', 'Checked In'
        CHECKED_OUT = 'CHECKED_OUT', 'Checked Out'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class BookingSource(models.TextChoices):
        WEBSITE = 'WEBSITE', 'Website'
        PHONE = 'PHONE', 'Phone'
        WALK_IN = 'WALK_IN', 'Walk-in'
        OTA = 'OTA', 'OTA'
        AGENT = 'AGENT', 'Agent'
        CORPORATE = 'CORPORATE', 'Corporate'

    class GuestType(models.TextChoices):
        FIT = 'FIT', 'FIT (Free Individual Traveler)'
        GROUP = 'GROUP', 'Group'
        CORPORATE = 'CORPORATE', 'Corporate'
        VIP = 'VIP', 'VIP'
        GOVERNMENT = 'GOVERNMENT', 'Government'
        DIPLOMATIC = 'DIPLOMATIC', 'Diplomatic'

    class IdType(models.TextChoices):
        PASSPORT = 'PASSPORT', 'Passport'
        NID = 'NID', 'National ID'
        DRIVING_LICENSE = 'DRIVING_LICENSE', 'Driving License'

    class MealPlan(models.TextChoices):
        EP = 'EP', 'EP (European Plan - Room Only)'
        CP = 'CP', 'CP (Continental Plan - Room + Breakfast)'
        MAP = 'MAP', 'MAP (Modified American Plan - Room + Breakfast + 1 Meal)'
        AP = 'AP', 'AP (American Plan - Room + 3 Meals)'

    booking_ref = models.CharField(max_length=20, unique=True, default=generate_booking_ref)
    guest = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookings')
    room = models.ForeignKey('rooms.Room', on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    room_type = models.ForeignKey('rooms.RoomType', on_delete=models.CASCADE, related_name='bookings')
    rate_plan = models.ForeignKey(RatePlan, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    check_in_date = models.DateField()
    check_out_date = models.DateField()
    adults = models.PositiveIntegerField(default=1)
    children = models.PositiveIntegerField(default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    special_requests = models.TextField(blank=True, default='')
    meal_plan = models.CharField(max_length=5, choices=MealPlan.choices, default=MealPlan.EP)
    arrival_mode = models.CharField(max_length=50, blank=True, default='')
    vehicle_assigned = models.CharField(max_length=100, blank=True, default='')

    # New reservation fields
    booking_source = models.CharField(max_length=20, choices=BookingSource.choices, default=BookingSource.WEBSITE)
    reference_source = models.CharField(max_length=50, blank=True, default='') # Will be restricted via frontend/serializers
    guest_type = models.CharField(max_length=20, choices=GuestType.choices, blank=True, default='')
    purpose_of_visit = models.CharField(max_length=200, blank=True, default='')
    guest_hobbies = models.TextField(blank=True, default='')
    guest_preferences = models.TextField(blank=True, default='')
    airport_details = models.TextField(blank=True, default='')
    transport_notes = models.TextField(blank=True, default='')
    coming_from = models.CharField(max_length=200, blank=True, default='')
    extra_bed = models.PositiveIntegerField(default=0)
    infants = models.PositiveIntegerField(default=0)
    contact_person = models.CharField(max_length=200, blank=True, default='')
    rack_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    offer_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    registration_card = models.ImageField(upload_to='registration_cards/', blank=True, null=True)
    arrival_time = models.TimeField(null=True, blank=True)
    departure_time = models.TimeField(null=True, blank=True)
    actual_check_in = models.DateTimeField(null=True, blank=True)
    actual_check_out = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='checkins_performed')
    checked_out_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='checkouts_performed')
    id_type = models.CharField(max_length=30, choices=IdType.choices, blank=True, default='')
    id_number = models.CharField(max_length=50, blank=True, default='')
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    company_name = models.CharField(max_length=200, blank=True, default='')
    notes_internal = models.TextField(blank=True, default='')
    profile_note = models.TextField(blank=True, default='')
    
    # Group Billing / Invoice Consolidation
    parent_booking = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='child_bookings', help_text='If set, billing is consolidated to this booking')
    no_show = models.BooleanField(default=False)

    # Operational flags
    dnm = models.BooleanField(default=False, help_text='Do Not Move')
    no_post = models.BooleanField(default=False, help_text='Do not post charges to folio')
    is_travel_agency = models.BooleanField(default=False)
    non_smoking = models.BooleanField(default=False)

    # Room count (group bookings)
    num_rooms = models.PositiveIntegerField(default=1)

    # Rate & charges
    discount_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text='Discount percentage')
    service_charge_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text='Service charge %')
    vat_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text='VAT %')

    # Flight / transport
    flight_pickup_no = models.CharField(max_length=50, blank=True, default='', help_text='Pickup flight number')
    flight_eta = models.CharField(max_length=10, blank=True, default='', help_text='Estimated time of arrival')
    pickup_required = models.CharField(max_length=3, choices=[('YES', 'Yes'), ('NO', 'No')], default='NO')
    flight_drop_no = models.CharField(max_length=50, blank=True, default='', help_text='Drop-off flight number')
    flight_etd = models.CharField(max_length=10, blank=True, default='', help_text='Estimated time of departure')
    drop_required = models.CharField(max_length=3, choices=[('YES', 'Yes'), ('NO', 'No')], default='NO')
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='cancellations_performed')
    cancellation_reason = models.TextField(blank=True, default='')

    class PaymentStatus(models.TextChoices):
        UNPAID = 'UNPAID', 'Unpaid'
        PAID = 'PAID', 'Paid'
        PARTIAL = 'PARTIAL', 'Partially Paid'
        REFUNDED = 'REFUNDED', 'Refunded'

    payment_status = models.CharField(
        max_length=10,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
    )
    currency = models.CharField(max_length=3, blank=True, default='BDT')
    billing_type = models.CharField(
        max_length=10,
        choices=[('GUEST', 'Guest Payment'), ('COMPANY', 'Company Payment')],
        blank=True,
        default='GUEST',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.booking_ref} — {self.guest.email}"

    @property
    def nights(self):
        return (self.check_out_date - self.check_in_date).days


class Payment(models.Model):
    class Method(models.TextChoices):
        CARD = 'CARD', 'Card'
        CASH = 'CASH', 'Cash'
        ONLINE = 'ONLINE', 'Online'
        ONLINE_SSLCOMMERZ = 'ONLINE_SSLCOMMERZ', 'Online (SSLCommerz)'
        BANK_TRANSFER = 'BANK_TRANSFER', 'Bank Transfer'
        POS = 'POS', 'POS Terminal'
        COMPANY_CREDIT = 'COMPANY_CREDIT', 'Company Credit'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=50, choices=Method.choices, default=Method.ONLINE)
    transaction_id = models.CharField(max_length=255, blank=True, default='')
    company_name = models.CharField(max_length=200, blank=True, default='')
    is_refund = models.BooleanField(
        default=False,
        help_text='True when cash/card is returned to the guest at checkout',
    )
    business_date = models.DateField(
        null=True, blank=True,
        help_text='Hotel business date when payment/refund was posted',
    )
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='posted_payments',
    )
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)

    # SSLCommerz gateway fields
    val_id = models.CharField(max_length=50, blank=True, default='')
    bank_tran_id = models.CharField(max_length=80, blank=True, default='')
    card_type = models.CharField(max_length=50, blank=True, default='')
    card_no = models.CharField(max_length=80, blank=True, default='')
    card_brand = models.CharField(max_length=30, blank=True, default='')
    card_issuer = models.CharField(max_length=100, blank=True, default='')
    card_issuer_country = models.CharField(max_length=50, blank=True, default='')
    currency = models.CharField(max_length=3, blank=True, default='BDT')
    store_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    risk_level = models.CharField(max_length=1, blank=True, default='0')
    risk_title = models.CharField(max_length=50, blank=True, default='')
    session_key = models.CharField(max_length=100, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Payment {self.id} — {self.booking.booking_ref}"


class PaymentGatewayConfig(models.Model):
    """Singleton — stores SSLCommerz configuration in the database."""
    store_id = models.CharField(max_length=100)
    store_password = models.CharField(max_length=255)
    is_sandbox = models.BooleanField(default=True)
    frontend_url = models.CharField(max_length=255, default='http://localhost:5173')
    is_active = models.BooleanField(default=True, help_text='Enable/disable online payment gateway')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Payment Gateway Config'
        verbose_name_plural = 'Payment Gateway Config'

    def __str__(self):
        mode = 'SANDBOX' if self.is_sandbox else 'LIVE'
        return f"SSLCommerz ({self.store_id}) [{mode}]"

    def save(self, *args, **kwargs):
        # Enforce singleton — always use pk=1
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        """Return the singleton config or None if not configured yet."""
        try:
            return cls.objects.get(pk=1)
        except cls.DoesNotExist:
            return None


class FolioCharge(models.Model):
    class ChargeType(models.TextChoices):
        ROOM = 'ROOM', 'Room Charge'
        FOOD = 'FOOD', 'Food & Beverage'
        BEVERAGE = 'BEVERAGE', 'Beverage'
        PHONE = 'PHONE', 'Phone'
        LAUNDRY = 'LAUNDRY', 'Laundry'
        MINIBAR = 'MINIBAR', 'Minibar'
        SPA = 'SPA', 'Spa'
        SERVICE = 'SERVICE', 'Service'
        TAX = 'TAX', 'Tax'
        DISCOUNT = 'DISCOUNT', 'Discount'
        DEPOSIT = 'DEPOSIT', 'Deposit'
        REFUND = 'REFUND', 'Refund'

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='folio_charges')
    folio_window = models.PositiveSmallIntegerField(default=1, help_text='Folio window number (1-8)')
    charge_type = models.CharField(max_length=20, choices=ChargeType.choices, default=ChargeType.ROOM)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    charge_date = models.DateField()
    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='posted_charges')
    reference = models.CharField(max_length=100, blank=True, default='')
    is_void = models.BooleanField(default=False)
    void_reason = models.CharField(max_length=200, blank=True, default='')
    void_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='voided_charges')
    void_at = models.DateTimeField(null=True, blank=True)
    is_adjustment = models.BooleanField(default=False, help_text='True if this is an adjustment entry, not a primary charge')
    reason_code = models.CharField(max_length=20, blank=True, default='', help_text='BILLING_ERROR | COMP | GOODWILL | MANAGER_APPROVAL | DUPLICATE | RATE_CORRECTION | OTHER')
    is_transferred = models.BooleanField(default=False, help_text='Flag if this charge was transferred to another folio')
    created_at = models.DateTimeField(auto_now_add=True)


    class Meta:
        ordering = ['charge_date', 'created_at']

    def __str__(self):
        return f"{self.charge_type} — {self.description} ({self.total})"

    def save(self, *args, **kwargs):
        if not self.total:
            self.total = self.amount * self.quantity
        super().save(*args, **kwargs)


class Registration(models.Model):
    """Persistent guest registration — single source of truth for check-in data."""

    class Mode(models.TextChoices):
        ADVANCE = 'ADVANCE', 'Advance Booking'
        WALK_IN = 'WALK_IN', 'Walk-in'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        REGISTERED = 'REGISTERED', 'Registered'
        CHECKED_IN = 'CHECKED_IN', 'Checked In'

    registration_ref = models.CharField(max_length=20, unique=True, default=generate_registration_ref)
    booking = models.OneToOneField(
        Booking, on_delete=models.CASCADE, null=True, blank=True, related_name='registration_record',
    )
    guest = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='registrations',
    )
    mode = models.CharField(max_length=10, choices=Mode.choices, default=Mode.ADVANCE)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.DRAFT)
    billing_type = models.CharField(
        max_length=10,
        choices=[('GUEST', 'Guest Payment'), ('COMPANY', 'Company Payment')],
        blank=True,
        default='GUEST',
    )

    guest_email = models.EmailField(blank=True, default='')
    guest_phone = models.CharField(max_length=20, blank=True, default='')
    first_name = models.CharField(max_length=100, blank=True, default='')
    last_name = models.CharField(max_length=100, blank=True, default='')
    designation = models.CharField(max_length=10, blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, blank=True, default='')
    nationality = models.CharField(max_length=100, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    address = models.CharField(max_length=500, blank=True, default='')
    occupation = models.CharField(max_length=100, blank=True, default='')
    place_of_issue = models.CharField(max_length=100, blank=True, default='')
    visa_no = models.CharField(max_length=50, blank=True, default='')
    id_type = models.CharField(max_length=30, blank=True, default='')
    id_number = models.CharField(max_length=50, blank=True, default='')
    contact_person = models.CharField(max_length=200, blank=True, default='')

    room_type = models.ForeignKey('rooms.RoomType', on_delete=models.SET_NULL, null=True, blank=True)
    room = models.ForeignKey('rooms.Room', on_delete=models.SET_NULL, null=True, blank=True)
    check_in_date = models.DateField(null=True, blank=True)
    check_out_date = models.DateField(null=True, blank=True)
    arrival_time = models.TimeField(null=True, blank=True)
    adults = models.PositiveIntegerField(default=1)
    children = models.PositiveIntegerField(default=0)
    infants = models.PositiveIntegerField(default=0)
    extra_bed = models.PositiveIntegerField(default=0)
    guest_type = models.CharField(max_length=20, blank=True, default='')
    purpose_of_visit = models.CharField(max_length=200, blank=True, default='')
    coming_from = models.CharField(max_length=200, blank=True, default='')
    company_name = models.CharField(max_length=200, blank=True, default='')
    booking_source = models.CharField(max_length=20, blank=True, default='WALK_IN')
    special_requests = models.TextField(blank=True, default='')

    rack_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    offer_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.registration_ref

    @property
    def nights(self):
        if self.check_in_date and self.check_out_date:
            return (self.check_out_date - self.check_in_date).days
        return 0
