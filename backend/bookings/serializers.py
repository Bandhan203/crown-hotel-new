from datetime import date

from rest_framework import serializers

from accounts.models import GuestProfile
from rooms.serializers import RoomTypeListSerializer
from .models import Booking, FolioCharge, Payment, RatePlan


# ── Rate Plan ────────────────────────────────

class RatePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = RatePlan
        fields = [
            'id', 'name', 'code', 'description', 'discount_type', 'discount_value',
            'valid_from', 'valid_to', 'min_nights', 'max_nights', 'is_active',
            'room_types', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ── Folio ────────────────────────────────────

class FolioChargeSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(source='posted_by.full_name', read_only=True, default=None)

    class Meta:
        model = FolioCharge
        fields = [
            'id', 'booking', 'folio_window', 'charge_type', 'description', 'amount', 'quantity',
            'total', 'charge_date', 'posted_by', 'posted_by_name', 'reference',
            'is_void', 'is_locked', 'is_transferred', 'reason_code', 'created_at',
        ]
        read_only_fields = ['id', 'booking', 'posted_by', 'posted_by_name', 'total', 'created_at']


class FolioChargeCreateSerializer(serializers.ModelSerializer):
    folio_window = serializers.IntegerField(default=1, min_value=1, max_value=8, required=False)

    class Meta:
        model = FolioCharge
        fields = ['charge_type', 'description', 'amount', 'quantity', 'charge_date', 'reference', 'folio_window']

    def validate_amount(self, value):
        if value == 0:
            raise serializers.ValidationError('Amount cannot be zero.')
        return value


# ── Booking ──────────────────────────────────


class BookingCreateSerializer(serializers.ModelSerializer):
    reference_source = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    rate_plan = serializers.PrimaryKeyRelatedField(
        queryset=RatePlan.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Booking
        fields = [
            'room_type', 'check_in_date', 'check_out_date', 'adults', 'children',
            'special_requests', 'reference_source', 'rate_plan',
        ]

    def validate(self, attrs):
        if attrs['check_in_date'] >= attrs['check_out_date']:
            raise serializers.ValidationError({'check_out_date': 'Check-out must be after check-in.'})
        if attrs['check_in_date'] < date.today():
            raise serializers.ValidationError({'check_in_date': 'Check-in cannot be in the past.'})
        if attrs['adults'] < 1 or attrs['adults'] > 4:
            raise serializers.ValidationError({'adults': 'Adults must be between 1 and 4.'})
        if attrs['children'] < 0 or attrs['children'] > 3:
            raise serializers.ValidationError({'children': 'Children must be between 0 and 3.'})
        room_type = attrs['room_type']
        total_guests = attrs['adults'] + attrs['children']
        if total_guests > room_type.max_guests:
            raise serializers.ValidationError(f'Max guests for this room type is {room_type.max_guests}.')
        return attrs


class BookingListSerializer(serializers.ModelSerializer):
    room_type_name = serializers.CharField(source='room_type.name', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True, default=None)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_ref', 'room_type', 'room_type_name', 'room_number',
            'check_in_date', 'check_out_date', 'adults', 'children',
            'total_price', 'status', 'payment_status', 'created_at',
        ]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'amount', 'payment_method', 'transaction_id',
            'status', 'paid_at', 'created_at',
            # SSLCommerz fields
            'val_id', 'bank_tran_id', 'card_type', 'card_no', 'card_brand',
            'card_issuer', 'card_issuer_country', 'currency', 'store_amount',
            'risk_level', 'risk_title', 'session_key',
        ]
        read_only_fields = ['id', 'created_at']


class RegistrationSummarySerializer(serializers.ModelSerializer):
    """Lightweight registration summary embedded in BookingDetailSerializer."""
    class Meta:
        from .models import Registration
        model = Registration
        fields = [
            'id', 'registration_ref', 'mode', 'status', 'billing_type',
            'first_name', 'last_name', 'designation',
            'guest_email', 'guest_phone',
            'id_type', 'id_number', 'nationality', 'country',
            'check_in_date', 'check_out_date', 'arrival_time',
            'adults', 'children', 'infants', 'extra_bed',
            'rack_rate', 'offer_rate', 'discount_amount', 'deposit_amount',
            'created_at', 'updated_at',
        ]


class InHouseBookingSerializer(serializers.ModelSerializer):
    """Lightweight serializer for in-house list (service entry, front desk)."""
    guest_name = serializers.CharField(source='guest.full_name', read_only=True)
    guest_email = serializers.EmailField(source='guest.email', read_only=True)
    room_type_detail = RoomTypeListSerializer(source='room_type', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True, default=None)
    nights = serializers.SerializerMethodField()
    folio_balance = serializers.SerializerMethodField()
    is_settled = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_ref', 'guest', 'guest_name', 'guest_email',
            'room_type', 'room_type_detail', 'room_number',
            'check_in_date', 'check_out_date', 'adults', 'children',
            'total_price', 'status', 'booking_source', 'nights',
            'meal_plan', 'billing_type', 'folio_balance', 'is_settled',
        ]

    def get_nights(self, obj):
        return obj.nights

    def _folio_summary(self, obj):
        cache = getattr(obj, '_folio_summary_cache', None)
        if cache is None:
            from .checkout_services import compute_folio_balance
            cache = compute_folio_balance(obj)
            obj._folio_summary_cache = cache
        return cache

    def get_folio_balance(self, obj):
        return self._folio_summary(obj)['balance']

    def get_is_settled(self, obj):
        return self._folio_summary(obj)['is_settled']


class BookingDetailSerializer(serializers.ModelSerializer):
    room_type_detail = RoomTypeListSerializer(source='room_type', read_only=True)
    guest_email = serializers.EmailField(source='guest.email', read_only=True)
    guest_name = serializers.CharField(source='guest.full_name', read_only=True)
    guest_phone = serializers.CharField(source='guest.phone', read_only=True, default='')
    room_number = serializers.CharField(source='room.room_number', read_only=True, default=None)
    payments = PaymentSerializer(many=True, read_only=True)
    folio_charges = FolioChargeSerializer(many=True, read_only=True)
    rate_plan_name = serializers.CharField(source='rate_plan.name', read_only=True, default=None)
    checked_in_by_name = serializers.CharField(source='checked_in_by.full_name', read_only=True, default=None)
    checked_out_by_name = serializers.CharField(source='checked_out_by.full_name', read_only=True, default=None)
    nights = serializers.IntegerField(read_only=True)
    registration_record = RegistrationSummarySerializer(read_only=True)
    channel_display = serializers.SerializerMethodField()

    def get_channel_display(self, obj):
        from .channels import channel_display
        return channel_display(obj)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_ref', 'guest', 'guest_email', 'guest_name', 'guest_phone',
            'room_type', 'room_type_detail', 'room', 'room_number',
            'check_in_date', 'check_out_date', 'adults', 'children',
            'total_price', 'status', 'special_requests', 'created_at', 'updated_at',
            'payments', 'folio_charges',
            # Reservation fields
            'booking_source', 'reference_source', 'channel_display', 'rate_plan', 'rate_plan_name',
            'arrival_time', 'departure_time',
            'actual_check_in', 'actual_check_out',
            'checked_in_by', 'checked_in_by_name', 'checked_out_by', 'checked_out_by_name',
            'id_type', 'id_number', 'deposit_amount', 'discount_amount', 'tax_amount', 'grand_total',
            'company_name', 'notes_internal', 'no_show',
            'cancelled_at', 'cancelled_by', 'cancellation_reason', 'nights',
            # Registration fields
            'guest_type', 'purpose_of_visit', 'coming_from',
            'extra_bed', 'infants', 'contact_person', 'rack_rate', 'offer_rate', 'registration_card',
            # New PMS fields
            'num_rooms', 'discount_pct', 'service_charge_pct', 'vat_pct',
            'dnm', 'no_post', 'is_travel_agency', 'non_smoking',
            'pickup_required', 'flight_pickup_no', 'flight_eta',
            'drop_required', 'flight_drop_no', 'flight_etd',
            'profile_note',
            # Payment
            'payment_status', 'currency', 'billing_type',
            # Meal plan & arrival logistics
            'meal_plan', 'arrival_mode', 'vehicle_assigned',
            'reference_source', 'guest_hobbies', 'guest_preferences',
            'airport_details', 'transport_notes', 'parent_booking',
            # Embedded registration record
            'registration_record',
        ]


class BookingStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['status']

    def validate_status(self, value):
        valid = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED']
        if value not in valid:
            raise serializers.ValidationError(f'Invalid status. Choose from: {valid}')
        return value


class AdminBookingCreateSerializer(serializers.ModelSerializer):
    """Admin manual booking creation."""
    class Meta:
        model = Booking
        fields = ['guest', 'room_type', 'room', 'check_in_date', 'check_out_date',
                  'adults', 'children', 'special_requests', 'status',
                  'booking_source', 'rate_plan', 'arrival_time', 'company_name', 'notes_internal',
                  'guest_type', 'purpose_of_visit', 'coming_from', 'extra_bed']
        extra_kwargs = {
            'status': {'required': False},
            'room': {'required': False, 'allow_null': True},
            'rate_plan': {'required': False, 'allow_null': True},
        }

    def validate(self, attrs):
        if attrs['check_in_date'] >= attrs['check_out_date']:
            raise serializers.ValidationError({'check_out_date': 'Check-out must be after check-in.'})
        if attrs['adults'] < 1:
            raise serializers.ValidationError({'adults': 'At least 1 adult is required.'})
        room_type = attrs['room_type']
        total_guests = attrs['adults'] + attrs.get('children', 0)
        if total_guests > room_type.max_guests:
            raise serializers.ValidationError(
                f'Max guests for {room_type.name} is {room_type.max_guests}.'
            )
        from bookings.services import assert_guest_bookable
        assert_guest_bookable(attrs['guest'])
        if attrs.get('status') == 'CHECKED_IN':
            raise serializers.ValidationError({
                'status': 'Use the Registration Module to check in guests.',
            })
        return attrs


class AdminBookingUpdateSerializer(serializers.ModelSerializer):
    """Admin full booking update (dates, guests, special requests, price override)."""
    class Meta:
        model = Booking
        fields = [
            'check_in_date', 'check_out_date', 'adults', 'children', 'infants',
            'extra_bed', 'num_rooms', 'special_requests', 'total_price',
            'rack_rate', 'offer_rate', 'discount_pct', 'discount_amount',
            'service_charge_pct', 'vat_pct', 'deposit_amount',
            'booking_source', 'guest_type', 'purpose_of_visit', 'coming_from',
            'company_name', 'notes_internal', 'profile_note', 'contact_person',
            'id_type', 'id_number', 'billing_type', 'currency', 'payment_status',
            'meal_plan', 'arrival_mode', 'arrival_time', 'departure_time',
            'dnm', 'no_post', 'is_travel_agency', 'non_smoking',
            'pickup_required', 'flight_pickup_no', 'flight_eta',
            'drop_required', 'flight_drop_no', 'flight_etd',
        ]
        extra_kwargs = {'total_price': {'required': False}}

    def validate(self, attrs):
        check_in = attrs.get('check_in_date', self.instance.check_in_date if self.instance else None)
        check_out = attrs.get('check_out_date', self.instance.check_out_date if self.instance else None)
        if check_in and check_out and check_in >= check_out:
            raise serializers.ValidationError({'check_out_date': 'Check-out must be after check-in.'})
        return attrs


class AdminPaymentCreateSerializer(serializers.ModelSerializer):
    """Admin recording a payment for a booking."""
    class Meta:
        model = Payment
        fields = [
            'amount', 'payment_method', 'transaction_id',
            'company_name', 'is_refund', 'business_date',
        ]


class CheckAvailabilitySerializer(serializers.Serializer):
    room_type = serializers.IntegerField()
    check_in_date = serializers.DateField()
    check_out_date = serializers.DateField()

    def validate(self, attrs):
        if attrs['check_in_date'] >= attrs['check_out_date']:
            raise serializers.ValidationError({'check_out_date': 'Check-out must be after check-in.'})
        return attrs


# ── Walk-in / Check-in / Check-out ──────────

class WalkInSerializer(serializers.Serializer):
    """Full guest registration: create guest account + profile + booking + check-in."""
    # ── Guest account ──────────────────────────
    guest_email = serializers.EmailField()
    guest_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    # ── Guest profile ──────────────────────────
    designation = serializers.ChoiceField(
        choices=GuestProfile.Designation.choices, required=False, allow_blank=True, default=''
    )
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    date_of_birth = serializers.DateField(required=False, allow_null=True, default=None)
    gender = serializers.ChoiceField(choices=GuestProfile.Gender.choices, required=False, allow_blank=True, default='')
    nationality = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    country = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    address = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    occupation = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    place_of_issue = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    visa_no = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    # ── Booking fields ─────────────────────────
    room_type = serializers.IntegerField()
    room_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    check_in_date = serializers.DateField()
    check_out_date = serializers.DateField()
    arrival_time = serializers.TimeField(required=False, allow_null=True, default=None)
    adults = serializers.IntegerField(default=1)
    children = serializers.IntegerField(default=0)
    id_type = serializers.ChoiceField(choices=Booking.IdType.choices, required=False, allow_blank=True, default='')
    id_number = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    deposit_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    special_requests = serializers.CharField(required=False, allow_blank=True, default='')
    company_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    booking_source = serializers.ChoiceField(choices=Booking.BookingSource.choices, required=False, default='WALK_IN')
    guest_type = serializers.ChoiceField(choices=Booking.GuestType.choices, required=False, allow_blank=True, default='')
    purpose_of_visit = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    coming_from = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    extra_bed = serializers.IntegerField(required=False, default=0)
    rack_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    offer_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    rate_plan = serializers.IntegerField(required=False, allow_null=True, default=None)

    def validate(self, attrs):
        if attrs['check_in_date'] >= attrs['check_out_date']:
            raise serializers.ValidationError({'check_out_date': 'Check-out must be after check-in.'})
        if not attrs.get('first_name', '').strip():
            raise serializers.ValidationError({'first_name': 'First name is required.'})
        return attrs


class ReservationCreateSerializer(serializers.Serializer):
    """Create a future reservation (status=CONFIRMED). Does NOT check-in the guest."""
    # ── Guest account ──────────────────────────
    guest_email = serializers.EmailField()
    guest_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    # ── Guest profile ──────────────────────────
    designation = serializers.ChoiceField(
        choices=GuestProfile.Designation.choices, required=False, allow_blank=True, default=''
    )
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    date_of_birth = serializers.DateField(required=False, allow_null=True, default=None)
    gender = serializers.ChoiceField(choices=GuestProfile.Gender.choices, required=False, allow_blank=True, default='')
    nationality = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    country = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    address = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    occupation = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    place_of_issue = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    visa_no = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    contact_person = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    # ── Identity ───────────────────────────────
    id_type = serializers.ChoiceField(choices=Booking.IdType.choices, required=False, allow_blank=True, default='')
    id_number = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    # ── Booking core ───────────────────────────
    status = serializers.ChoiceField(
        choices=[('PENDING', 'Pending'), ('CONFIRMED', 'Confirmed')], required=False, default='CONFIRMED'
    )
    room_type = serializers.IntegerField()
    room_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    check_in_date = serializers.DateField()
    check_out_date = serializers.DateField()
    arrival_time = serializers.TimeField(required=False, allow_null=True, default=None)
    departure_time = serializers.TimeField(required=False, allow_null=True, default=None)
    parent_booking_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    currency = serializers.ChoiceField(
        choices=[('BDT', 'BDT'), ('USD', 'USD')], required=False, default='BDT'
    )
    reference_source = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    guest_hobbies = serializers.CharField(required=False, allow_blank=True, default='')
    guest_preferences = serializers.CharField(required=False, allow_blank=True, default='')
    airport_details = serializers.CharField(required=False, allow_blank=True, default='')
    transport_notes = serializers.CharField(required=False, allow_blank=True, default='')
    adults = serializers.IntegerField(default=1)
    children = serializers.IntegerField(default=0)
    infants = serializers.IntegerField(required=False, default=0)
    extra_bed = serializers.IntegerField(required=False, default=0)
    # ── Booking core — room count ───────────────
    num_rooms = serializers.IntegerField(required=False, default=1, min_value=1)
    rate_plan = serializers.IntegerField(required=False, allow_null=True, default=None)
    # ── Stay info ──────────────────────────────
    guest_type = serializers.ChoiceField(choices=Booking.GuestType.choices, required=False, allow_blank=True, default='')
    purpose_of_visit = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    coming_from = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    booking_source = serializers.ChoiceField(choices=Booking.BookingSource.choices, required=False, default='PHONE')
    company_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    # ── Rates ──────────────────────────────────
    rack_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    offer_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    discount_pct = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    service_charge_pct = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    vat_pct = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    # ── Payment ────────────────────────────────
    payment_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    payment_method = serializers.ChoiceField(choices=Payment.Method.choices, required=False, default='CASH')
    deposit_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    # ── Operational flags ──────────────────────
    dnm = serializers.BooleanField(required=False, default=False)
    no_post = serializers.BooleanField(required=False, default=False)
    is_travel_agency = serializers.BooleanField(required=False, default=False)
    non_smoking = serializers.BooleanField(required=False, default=False)
    # ── Flight / transport ─────────────────────
    pickup_required = serializers.ChoiceField(choices=[('YES', 'Yes'), ('NO', 'No')], required=False, default='NO')
    flight_pickup_no = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    flight_eta = serializers.CharField(max_length=10, required=False, allow_blank=True, default='')
    drop_required = serializers.ChoiceField(choices=[('YES', 'Yes'), ('NO', 'No')], required=False, default='NO')
    flight_drop_no = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    flight_etd = serializers.CharField(max_length=10, required=False, allow_blank=True, default='')
    # ── Misc ───────────────────────────────────
    special_requests = serializers.CharField(required=False, allow_blank=True, default='')
    profile_note = serializers.CharField(required=False, allow_blank=True, default='')
    # ── Meal plan & logistics ───────────────────
    meal_plan = serializers.ChoiceField(choices=Booking.MealPlan.choices, required=False, default='EP')
    arrival_mode = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    vehicle_assigned = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')

    def validate(self, attrs):
        from bookings.services import validate_reservation_stay_dates
        validate_reservation_stay_dates(attrs['check_in_date'], attrs['check_out_date'])
        if not attrs.get('first_name', '').strip():
            raise serializers.ValidationError({'first_name': 'First name is required.'})
        if attrs['adults'] < 1:
            raise serializers.ValidationError({'adults': 'At least 1 adult is required.'})
        from rooms.models import RoomType
        try:
            room_type = RoomType.objects.get(pk=attrs['room_type'])
        except RoomType.DoesNotExist:
            raise serializers.ValidationError({'room_type': 'Room type not found.'})
        from bookings.services import validate_guest_capacity

        capacity_error = validate_guest_capacity(
            room_type,
            attrs['adults'],
            attrs.get('children', 0),
            attrs.get('infants', 0),
            attrs.get('num_rooms', 1),
            attrs.get('extra_bed', 0),
        )
        if capacity_error:
            raise serializers.ValidationError({'adults': capacity_error})
        return attrs


class CheckInSerializer(serializers.Serializer):
    """Check-in form fields."""
    room_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    billing_type = serializers.ChoiceField(
        choices=[('GUEST', 'Guest Payment'), ('COMPANY', 'Company Payment')],
        required=False,
        default='GUEST',
    )
    id_type = serializers.ChoiceField(choices=Booking.IdType.choices, required=False, default='')
    id_number = serializers.CharField(max_length=50, required=False, default='')
    deposit_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    notes_internal = serializers.CharField(required=False, default='')
    # Registration fields
    guest_type = serializers.ChoiceField(choices=Booking.GuestType.choices, required=False, default='')
    purpose_of_visit = serializers.CharField(max_length=200, required=False, default='')
    coming_from = serializers.CharField(max_length=200, required=False, default='')
    extra_bed = serializers.IntegerField(required=False, default=0)


class CheckOutSerializer(serializers.Serializer):
    """Check-out form fields."""
    payment_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    payment_method = serializers.ChoiceField(choices=Payment.Method.choices, required=False, default='CASH')
    notes_internal = serializers.CharField(required=False, default='', allow_blank=True)
    password = serializers.CharField(required=False, default='', allow_blank=True, write_only=True)
    authorization = serializers.CharField(required=False, default='', allow_blank=True, write_only=True)
    checkout_phrase = serializers.CharField(required=False, default='', allow_blank=True, write_only=True)


class CalendarBookingSerializer(serializers.ModelSerializer):
    """Slim serializer for calendar view."""
    guest_name = serializers.CharField(source='guest.full_name', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True, default=None)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_ref', 'guest_name', 'room', 'room_number',
            'check_in_date', 'check_out_date', 'status',
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    """Invoice data for a booking."""
    guest_name = serializers.CharField(source='guest.full_name', read_only=True)
    guest_email = serializers.EmailField(source='guest.email', read_only=True)
    guest_phone = serializers.CharField(source='guest.phone', read_only=True)
    room_type_name = serializers.CharField(source='room_type.name', read_only=True)
    room_number = serializers.CharField(source='room.room_number', read_only=True, default=None)
    folio_charges = FolioChargeSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    nights = serializers.IntegerField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_ref', 'guest_name', 'guest_email', 'guest_phone',
            'room_type_name', 'room_number',
            'check_in_date', 'check_out_date', 'nights',
            'adults', 'children', 'total_price',
            'deposit_amount', 'discount_amount', 'tax_amount', 'grand_total',
            'folio_charges', 'payments',
            'actual_check_in', 'actual_check_out', 'status',
        ]


# ── Guest Registration Card (combined) ──────

class GuestRegistrationSerializer(serializers.Serializer):
    """Full registration form: booking + guest profile fields combined."""

    # --- Booking fields (writable) ---
    guest_type = serializers.ChoiceField(choices=Booking.GuestType.choices, required=False, allow_blank=True)
    purpose_of_visit = serializers.CharField(max_length=200, required=False, allow_blank=True)
    coming_from = serializers.CharField(max_length=200, required=False, allow_blank=True)
    extra_bed = serializers.IntegerField(required=False, default=0)
    rack_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    offer_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    special_requests = serializers.CharField(required=False, allow_blank=True)
    company_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    booking_source = serializers.ChoiceField(choices=Booking.BookingSource.choices, required=False, allow_blank=True)
    arrival_time = serializers.TimeField(required=False, allow_null=True)
    id_type = serializers.ChoiceField(choices=Booking.IdType.choices, required=False, allow_blank=True)
    id_number = serializers.CharField(max_length=50, required=False, allow_blank=True)

    # --- Extra booking fields ---
    contact_person = serializers.CharField(max_length=200, required=False, allow_blank=True)
    infants = serializers.IntegerField(required=False, min_value=0, default=0)
    deposit_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    num_rooms = serializers.IntegerField(required=False, min_value=1, default=1)
    discount_pct = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    service_charge_pct = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    vat_pct = serializers.DecimalField(max_digits=5, decimal_places=2, required=False)
    dnm = serializers.BooleanField(required=False)
    no_post = serializers.BooleanField(required=False)
    is_travel_agency = serializers.BooleanField(required=False)
    non_smoking = serializers.BooleanField(required=False)
    pickup_required = serializers.ChoiceField(choices=[('YES', 'Yes'), ('NO', 'No')], required=False, allow_blank=True)
    flight_pickup_no = serializers.CharField(max_length=50, required=False, allow_blank=True)
    flight_eta = serializers.CharField(max_length=10, required=False, allow_blank=True)
    drop_required = serializers.ChoiceField(choices=[('YES', 'Yes'), ('NO', 'No')], required=False, allow_blank=True)
    flight_drop_no = serializers.CharField(max_length=50, required=False, allow_blank=True)
    flight_etd = serializers.CharField(max_length=10, required=False, allow_blank=True)
    profile_note = serializers.CharField(required=False, allow_blank=True)

    # --- Guest profile fields (writable) ---
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    designation = serializers.ChoiceField(
        choices=GuestProfile.Designation.choices, required=False, allow_blank=True
    )
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=GuestProfile.Gender.choices, required=False, allow_blank=True)
    nationality = serializers.CharField(max_length=100, required=False, allow_blank=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)
    address = serializers.CharField(max_length=500, required=False, allow_blank=True)
    occupation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    place_of_issue = serializers.CharField(max_length=100, required=False, allow_blank=True)
    visa_no = serializers.CharField(max_length=50, required=False, allow_blank=True)
    guest_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    billing_type = serializers.ChoiceField(
        choices=[('GUEST', 'Guest Payment'), ('COMPANY', 'Company Payment')],
        required=False,
        allow_blank=True,
    )


class RegistrationCheckInSerializer(GuestRegistrationSerializer):
    """Registration module: save guest data + check in atomically."""
    room_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    billing_type = serializers.ChoiceField(
        choices=[('GUEST', 'Guest Payment'), ('COMPANY', 'Company Payment')],
        required=True,
    )
    notes_internal = serializers.CharField(required=False, allow_blank=True, default='')
    guest_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')


class RegistrationWriteSerializer(serializers.Serializer):
    """Unified registration form — advance and walk-in."""
    guest_email = serializers.EmailField(required=False, allow_blank=True)
    guest_phone = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    first_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    last_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    designation = serializers.CharField(max_length=10, required=False, allow_blank=True, default='')
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(max_length=10, required=False, allow_blank=True, default='')
    nationality = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    country = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    address = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    occupation = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    place_of_issue = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    visa_no = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    id_type = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    id_number = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    contact_person = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    room_type = serializers.IntegerField(required=False, allow_null=True)
    room_type_id = serializers.IntegerField(required=False, allow_null=True)
    room_id = serializers.IntegerField(required=False, allow_null=True)
    check_in_date = serializers.DateField(required=False, allow_null=True)
    check_out_date = serializers.DateField(required=False, allow_null=True)
    arrival_time = serializers.TimeField(required=False, allow_null=True)
    adults = serializers.IntegerField(required=False, default=1)
    children = serializers.IntegerField(required=False, default=0)
    infants = serializers.IntegerField(required=False, default=0)
    extra_bed = serializers.IntegerField(required=False, default=0)
    guest_type = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    purpose_of_visit = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    coming_from = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    company_name = serializers.CharField(max_length=200, required=False, allow_blank=True, default='')
    booking_source = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    special_requests = serializers.CharField(required=False, allow_blank=True, default='')
    rack_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    offer_rate = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    deposit_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    billing_type = serializers.ChoiceField(
        choices=[('GUEST', 'Guest Payment'), ('COMPANY', 'Company Payment')],
        required=False,
        allow_blank=True,
    )


class RegistrationCheckInPayloadSerializer(RegistrationWriteSerializer):
    billing_type = serializers.ChoiceField(
        choices=[('GUEST', 'Guest Payment'), ('COMPANY', 'Company Payment')],
        required=True,
    )
    notes_internal = serializers.CharField(required=False, allow_blank=True, default='')
    payment_amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=0, min_value=0,
    )
    payment_method = serializers.ChoiceField(
        choices=Payment.Method.choices, required=False, default=Payment.Method.CASH,
    )
    early_check_in = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        payment_amount = float(attrs.get('payment_amount') or 0)
        if payment_amount < 0:
            raise serializers.ValidationError({'payment_amount': 'Advance cannot be negative.'})
        return attrs
