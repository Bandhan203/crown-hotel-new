from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import StaffInvite, StaffPermission, StaffProfile

User = get_user_model()

DEPARTMENTS = [
    'Front Desk', 'Housekeeping', 'Food & Beverage', 'Engineering',
    'Accounts', 'Management', 'Security', 'General',
]

PERMISSION_PRESETS = {
    'FRONT_DESK': [
        {'module': 'BOOKINGS', 'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': False},
        {'module': 'GUESTS', 'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': False},
        {'module': 'ROOMS', 'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
    ],
    'HOUSEKEEPING': [
        {'module': 'ROOMS', 'can_view': True, 'can_create': False, 'can_edit': True, 'can_delete': False},
        {'module': 'BOOKINGS', 'can_view': True, 'can_create': False, 'can_edit': False, 'can_delete': False},
    ],
    'FB_MANAGER': [
        {'module': 'RESTAURANT', 'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': False},
        {'module': 'INVENTORY', 'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': False},
    ],
    'GENERAL_MANAGER': [
        {'module': m, 'can_view': True, 'can_create': True, 'can_edit': True, 'can_delete': False}
        for m in ['ROOMS', 'BOOKINGS', 'GUESTS', 'RESTAURANT', 'SPA', 'INVENTORY', 'CORPORATE']
    ],
}


class StaffPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffPermission
        fields = ['id', 'module', 'can_view', 'can_create', 'can_edit', 'can_delete']


class StaffProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    phone = serializers.CharField(source='user.phone', read_only=True)
    permissions = StaffPermissionSerializer(many=True, read_only=True)

    class Meta:
        model = StaffProfile
        fields = ['id', 'email', 'full_name', 'phone', 'department', 'position', 'hire_date', 'is_active', 'permissions']


class StaffCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20, required=False, default='')
    password = serializers.CharField(write_only=True, min_length=6)
    department = serializers.CharField(max_length=100, required=False, default='')
    position = serializers.CharField(max_length=100, required=False, default='')
    permissions = StaffPermissionSerializer(many=True, required=False)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value.lower().strip()

    def create(self, validated_data):
        perms_data = validated_data.pop('permissions', [])
        user = User.objects.create_user(
            email=validated_data['email'],
            full_name=validated_data['full_name'],
            phone=validated_data.get('phone', ''),
            password=validated_data['password'],
            role='STAFF',
            is_staff=True,
        )
        profile = StaffProfile.objects.create(
            user=user,
            department=validated_data.get('department', ''),
            position=validated_data.get('position', ''),
        )
        for perm in perms_data:
            StaffPermission.objects.create(staff=profile, **perm)
        return profile


class StaffInviteCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=20, required=False, default='')
    department = serializers.CharField(max_length=100, required=False, default='')
    position = serializers.CharField(max_length=100, required=False, default='')
    permission_preset = serializers.ChoiceField(
        choices=[('NONE', 'None')] + [(k, k) for k in PERMISSION_PRESETS],
        required=False,
        default='NONE',
    )
    permissions = serializers.ListField(child=serializers.DictField(), required=False)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value.lower().strip()


class StaffInviteSerializer(serializers.ModelSerializer):
    invite_url = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = StaffInvite
        fields = [
            'id', 'email', 'full_name', 'phone', 'department', 'position',
            'invite_url', 'expires_at', 'accepted_at', 'revoked_at',
            'created_at', 'created_by_name', 'is_expired',
        ]

    def get_invite_url(self, obj):
        from .invite_services import build_invite_url
        return build_invite_url(obj.token) if obj.is_valid else None

    def get_is_expired(self, obj):
        return not obj.is_valid and not obj.accepted_at


class StaffInviteAcceptSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, min_length=6)

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs
