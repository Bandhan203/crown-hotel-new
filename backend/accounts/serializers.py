from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import GuestProfile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'phone', 'password', 'confirm_password']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone', 'role', 'avatar', 'date_joined']
        read_only_fields = ['id', 'email', 'role', 'date_joined']


class UserListSerializer(serializers.ModelSerializer):
    total_bookings = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone', 'role', 'is_active', 'date_joined', 'total_bookings']
        read_only_fields = ['id', 'date_joined', 'total_bookings']


class GuestProfileSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = GuestProfile
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'first_name', 'last_name', 'designation',
            'nationality', 'date_of_birth', 'gender',
            'address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country',
            'id_type', 'id_number', 'id_expiry', 'place_of_issue', 'visa_no',
            'occupation',
            'preferences', 'loyalty_tier', 'loyalty_points',
            'vip', 'blacklisted', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class GuestStayHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    booking_ref = serializers.CharField()
    room_type_name = serializers.CharField(source='room_type.name')
    room_number = serializers.SerializerMethodField()
    check_in_date = serializers.DateField()
    check_out_date = serializers.DateField()
    nights = serializers.IntegerField()
    status = serializers.CharField()
    total_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    actual_check_in = serializers.DateTimeField()
    actual_check_out = serializers.DateTimeField()

    def get_room_number(self, obj):
        return obj.room.room_number if obj.room else None
