from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import StaffPermission, StaffProfile

User = get_user_model()


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
    password = serializers.CharField(write_only=True)
    department = serializers.CharField(max_length=100, required=False, default='')
    position = serializers.CharField(max_length=100, required=False, default='')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def create(self, validated_data):
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
        return profile
