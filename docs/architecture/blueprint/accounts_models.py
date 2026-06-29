"""
Crown HMS — accounts/models.py (Enterprise Blueprint)
=====================================================
Auth + CRM layer. GuestProfile is the permanent guest record used by
Police Portal export and Booking anchor (not CustomUser directly).
"""
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import CustomUserManager


class CustomUser(AbstractBaseUser, PermissionsMixin):
    """
    Authentication identity only. Operational guest data lives in GuestProfile.
    SimpleJWT issues tokens scoped by role (ADMIN / STAFF / GUEST).
    """

    class Role(models.TextChoices):
        GUEST = 'GUEST', 'Guest'
        STAFF = 'STAFF', 'Staff'
        ADMIN = 'ADMIN', 'Admin'

    email = models.EmailField(unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, default='')
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.GUEST, db_index=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)  # Django admin access
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        ordering = ['-date_joined']
        indexes = [models.Index(fields=['role', 'is_active'])]

    def __str__(self):
        return self.email


class GuestProfile(models.Model):
    """
    CRM — OneToOne with CustomUser for portal guests; can also exist
    for walk-ins linked at check-in. Police Portal export source of truth.
    """

    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'

    class IdType(models.TextChoices):
        PASSPORT = 'PASSPORT', 'Passport'
        NID = 'NID', 'National ID (NID)'
        DRIVING_LICENSE = 'DRIVING_LICENSE', 'Driving License'

    # ── Identity link ──────────────────────────────────────────────
    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE,
        related_name='guest_profile', null=True, blank=True,
        help_text='Null for walk-in profiles created before user account',
    )

    # ── Legal / Police Portal fields (BD format) ─────────────────
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True, default='')
    designation = models.CharField(max_length=10, blank=True, default='')  # Mr/Mrs/Dr
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=100, blank=True, default='')
    occupation = models.CharField(max_length=100, blank=True, default='')

    # ID document
    id_type = models.CharField(max_length=30, choices=IdType.choices, blank=True, default='')
    id_number = models.CharField(max_length=50, blank=True, default='', db_index=True)
    id_expiry = models.DateField(null=True, blank=True)
    place_of_issue = models.CharField(max_length=100, blank=True, default='')
    visa_no = models.CharField(max_length=50, blank=True, default='')
    visa_expiry = models.DateField(null=True, blank=True)

    # Contact & address
    email = models.EmailField(blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    address_line1 = models.CharField(max_length=255, blank=True, default='')
    address_line2 = models.CharField(max_length=255, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    postal_code = models.CharField(max_length=20, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='Bangladesh')

    # CRM enrichment
    hobbies = models.TextField(blank=True, default='')
    preferences = models.TextField(blank=True, default='')  # pillow type, floor, etc.
    loyalty_tier = models.CharField(max_length=20, default='NONE')
    loyalty_points = models.PositiveIntegerField(default=0)
    vip = models.BooleanField(default=False)
    blacklisted = models.BooleanField(default=False, db_index=True)
    notes = models.TextField(blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['last_name', 'first_name']),
            models.Index(fields=['nationality']),
        ]

    def __str__(self):
        return f'{self.first_name} {self.last_name}'.strip()

    def police_portal_row(self, booking, room_number: str) -> dict:
        """
        BUSINESS DATE INTEGRATION: pass booking.actual_check_in date from
        HotelConfig context, not server clock.
        Export format for Bangladesh Police Portal submission.
        """
        return {
            'full_name': str(self),
            'passport_or_nid': self.id_number,
            'nationality': self.nationality,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else '',
            'gender': self.gender,
            'visa_no': self.visa_no,
            'room_number': room_number,
            'arrival_date': str(booking.check_in_date),
            'departure_date': str(booking.check_out_date),
            'address': self.address_line1,
            'phone': self.phone,
        }
