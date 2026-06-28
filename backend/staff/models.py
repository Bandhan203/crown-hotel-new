from django.conf import settings
from django.db import models


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
