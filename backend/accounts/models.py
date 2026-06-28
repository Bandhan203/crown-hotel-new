from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import CustomUserManager


class CustomUser(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        GUEST = 'GUEST', 'Guest'
        STAFF = 'STAFF', 'Staff'
        ADMIN = 'ADMIN', 'Admin'

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, default='')
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.GUEST)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']

    def __str__(self):
        return self.email


class GuestProfile(models.Model):
    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'

    class LoyaltyTier(models.TextChoices):
        NONE = 'NONE', 'None'
        SILVER = 'SILVER', 'Silver'
        GOLD = 'GOLD', 'Gold'
        PLATINUM = 'PLATINUM', 'Platinum'

    class Designation(models.TextChoices):
        MR = 'MR', 'Mr.'
        MRS = 'MRS', 'Mrs.'
        MS = 'MS', 'Ms.'
        DR = 'DR', 'Dr.'
        PROF = 'PROF', 'Prof.'

    class IdType(models.TextChoices):
        PASSPORT = 'PASSPORT', 'Passport'
        NID = 'NID', 'National ID'
        DRIVING_LICENSE = 'DRIVING_LICENSE', 'Driving License'

    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='guest_profile')
    first_name = models.CharField(max_length=100, blank=True, default='')
    last_name = models.CharField(max_length=100, blank=True, default='')
    designation = models.CharField(max_length=10, choices=Designation.choices, blank=True, default='')
    nationality = models.CharField(max_length=100, blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True, default='')
    address_line1 = models.CharField(max_length=255, blank=True, default='')
    address_line2 = models.CharField(max_length=255, blank=True, default='')
    city = models.CharField(max_length=100, blank=True, default='')
    state = models.CharField(max_length=100, blank=True, default='')
    postal_code = models.CharField(max_length=20, blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    id_type = models.CharField(max_length=30, choices=IdType.choices, blank=True, default='')
    id_number = models.CharField(max_length=50, blank=True, default='')
    id_expiry = models.DateField(null=True, blank=True)
    place_of_issue = models.CharField(max_length=100, blank=True, default='')
    visa_no = models.CharField(max_length=50, blank=True, default='')
    occupation = models.CharField(max_length=100, blank=True, default='')
    preferences = models.TextField(blank=True, default='')
    loyalty_tier = models.CharField(max_length=20, choices=LoyaltyTier.choices, default=LoyaltyTier.NONE)
    loyalty_points = models.PositiveIntegerField(default=0)
    vip = models.BooleanField(default=False)
    blacklisted = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile: {self.user.full_name}"
