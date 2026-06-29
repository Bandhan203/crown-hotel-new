"""
Crown HMS — rooms/models.py (Enterprise Blueprint)
==================================================
Physical inventory + housekeeping state machine (OPERA-style).
"""
from django.conf import settings
from django.db import models
from django.utils.text import slugify


class RoomAmenity(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        verbose_name_plural = 'Room Amenities'
        ordering = ['name']


class RoomType(models.Model):
    """Category definition: Suite, Deluxe, etc. — rack rate anchor."""

    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField(blank=True, default='')
    rack_rate = models.DecimalField(max_digits=10, decimal_places=2, help_text='Published rack rate per night')
    max_adults = models.PositiveIntegerField(default=2)
    max_children = models.PositiveIntegerField(default=1)
    max_infants = models.PositiveIntegerField(default=1)
    beds = models.PositiveIntegerField(default=1)
    size_sqft = models.PositiveIntegerField(default=0)
    view_type = models.CharField(max_length=100, blank=True, default='')
    amenities = models.ManyToManyField(RoomAmenity, blank=True, related_name='room_types')
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['rack_rate']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Room(models.Model):
    """
  Physical room. Status drives availability; HK status drives housekeeping board.
    CHECK-OUT INTEGRATION: On successful checkout → status=AVAILABLE, hk=DIRTY.
    """

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        OCCUPIED = 'OCCUPIED', 'Occupied'
        RESERVED = 'RESERVED', 'Reserved (expected arrival)'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance / Out of Order'
        BLOCKED = 'BLOCKED', 'Blocked (management hold)'

    class HousekeepingStatus(models.TextChoices):
        CLEAN = 'CLEAN', 'Clean'
        DIRTY = 'DIRTY', 'Dirty'
        INSPECTED = 'INSPECTED', 'Inspected'
        OUT_OF_ORDER = 'OUT_OF_ORDER', 'Out of Order'

    room_type = models.ForeignKey(RoomType, on_delete=models.PROTECT, related_name='rooms')
    room_number = models.CharField(max_length=50, unique=True, db_index=True)
    floor = models.PositiveIntegerField(default=1, db_index=True)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.AVAILABLE, db_index=True)
    housekeeping_status = models.CharField(
        max_length=15, choices=HousekeepingStatus.choices,
        default=HousekeepingStatus.CLEAN, db_index=True,
    )
    is_smoking = models.BooleanField(default=False)
    last_cleaned_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['floor', 'room_number']
        indexes = [
            models.Index(fields=['status', 'housekeeping_status']),
        ]

    def __str__(self):
        return f'Room {self.room_number}'

    @property
    def is_sellable(self) -> bool:
        return (
            self.status == self.Status.AVAILABLE
            and self.housekeeping_status != self.HousekeepingStatus.OUT_OF_ORDER
        )


class HousekeepingTask(models.Model):
    """Work orders generated from DIRTY rooms or scheduled maintenance."""

    class TaskType(models.TextChoices):
        CLEAN = 'CLEAN', 'Standard Clean'
        DEEP_CLEAN = 'DEEP_CLEAN', 'Deep Clean'
        INSPECT = 'INSPECT', 'Inspection'
        TURNDOWN = 'TURNDOWN', 'Turndown Service'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='hk_tasks')
    task_type = models.CharField(max_length=20, choices=TaskType.choices)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='hk_tasks',
    )
    scheduled_date = models.DateField()  # Should align with HotelConfig.business_date
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
