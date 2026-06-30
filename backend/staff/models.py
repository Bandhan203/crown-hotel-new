from django.conf import settings
from django.db import models
from django.utils import timezone


class StaffProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='staff_profile')
    department = models.CharField(max_length=100, blank=True, default='')
    position = models.CharField(max_length=100, blank=True, default='')
    hire_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.full_name} — {self.position}"


class StaffPermission(models.Model):
    class Module(models.TextChoices):
        ROOMS = 'ROOMS', 'Rooms'
        BOOKINGS = 'BOOKINGS', 'Bookings'
        GUESTS = 'GUESTS', 'Guests'
        RESTAURANT = 'RESTAURANT', 'Restaurant'
        SPA = 'SPA', 'Spa'
        CMS = 'CMS', 'CMS'
        STAFF = 'STAFF', 'Staff'
        INVENTORY = 'INVENTORY', 'Inventory'
        CORPORATE = 'CORPORATE', 'Corporate CRM'

    staff = models.ForeignKey(StaffProfile, on_delete=models.CASCADE, related_name='permissions')
    module = models.CharField(max_length=20, choices=Module.choices)
    can_view = models.BooleanField(default=False)
    can_create = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    class Meta:
        unique_together = ('staff', 'module')

    def __str__(self):
        return f"{self.staff.user.full_name} — {self.module}"


class StaffInvite(models.Model):
    """One-time invite link for new staff to set password and activate account."""
    token = models.CharField(max_length=64, unique=True, db_index=True)
    email = models.EmailField()
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')
    position = models.CharField(max_length=100, blank=True, default='')
    permissions_data = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_invites_created',
    )
    staff_profile = models.OneToOneField(
        StaffProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invite',
    )
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Invite {self.email} ({self.token[:8]}…)'

    @property
    def is_valid(self) -> bool:
        if self.revoked_at or self.accepted_at:
            return False
        return timezone.now() < self.expires_at
