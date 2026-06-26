from django.conf import settings
from django.db import models
from django.utils.text import slugify


class RoomAmenity(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=100, blank=True, default='', help_text='Icon class name e.g. FaWifi')

    class Meta:
        verbose_name_plural = 'Room Amenities'
        ordering = ['name']

    def __str__(self):
        return self.name


class RoomType(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    description = models.TextField(blank=True, default='')
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    max_guests = models.PositiveIntegerField(default=2)
    beds = models.PositiveIntegerField(default=1)
    size = models.PositiveIntegerField(help_text='Size in sq ft', default=0)
    view_type = models.CharField(max_length=100, blank=True, default='')
    amenities = models.ManyToManyField(RoomAmenity, blank=True, related_name='room_types')
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price_per_night']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class RoomImage(models.Model):
    room_type = models.ForeignKey(RoomType, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='rooms/')
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.room_type.name} - Image {self.order}"


class Room(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        OCCUPIED = 'OCCUPIED', 'Occupied'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'
        RESERVED = 'RESERVED', 'Reserved'

    class HousekeepingStatus(models.TextChoices):
        OC = 'OC', 'Occupied Clean'
        OD = 'OD', 'Occupied Dirty'
        VC = 'VC', 'Vacant Clean'
        VD = 'VD', 'Vacant Dirty'
        CO = 'CO', 'Checkout'
        ARR = 'ARR', 'Arrival'

    class AreaType(models.TextChoices):
        ROOM = 'ROOM', 'Room'
        RESTAURANT = 'RESTAURANT', 'Restaurant'
        BANQUET = 'BANQUET', 'Banquet'
        PARKING = 'PARKING', 'Parking'
        ROOFTOP = 'ROOFTOP', 'Rooftop'

    room_type = models.ForeignKey(RoomType, on_delete=models.CASCADE, related_name='rooms', null=True, blank=True)
    room_number = models.CharField(max_length=50, unique=True)
    floor = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.AVAILABLE)
    housekeeping_status = models.CharField(max_length=15, choices=HousekeepingStatus.choices, default=HousekeepingStatus.VC)
    is_public_area = models.BooleanField(default=False)
    area_type = models.CharField(max_length=20, choices=AreaType.choices, default=AreaType.ROOM)
    last_cleaned_at = models.DateTimeField(null=True, blank=True)
    is_smoking = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['room_number']

    def __str__(self):
        if self.is_public_area:
            return f"{self.room_number} ({self.get_area_type_display()})"
        room_type_name = self.room_type.name if self.room_type else 'No Type'
        return f"Room {self.room_number} ({room_type_name})"


class HousekeepingTask(models.Model):
    class TaskType(models.TextChoices):
        CLEAN = 'CLEAN', 'Clean'
        DEEP_CLEAN = 'DEEP_CLEAN', 'Deep Clean'
        INSPECT = 'INSPECT', 'Inspect'
        TURNDOWN = 'TURNDOWN', 'Turndown'
        MAINTENANCE = 'MAINTENANCE', 'Maintenance'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
        URGENT = 'URGENT', 'Urgent'

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        COMPLETED = 'COMPLETED', 'Completed'
        SKIPPED = 'SKIPPED', 'Skipped'

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='housekeeping_tasks')
    task_type = models.CharField(max_length=20, choices=TaskType.choices, default=TaskType.CLEAN)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.NORMAL)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='housekeeping_tasks',
    )
    notes = models.TextField(blank=True, default='')
    scheduled_date = models.DateField()
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    inspected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='inspected_tasks',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scheduled_date', '-priority']

    def __str__(self):
        return f"HK-{self.id} {self.room.room_number} ({self.task_type})"

class MaintenanceLog(models.Model):
    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        RESOLVED = 'RESOLVED', 'Resolved'

    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='maintenance_logs')
    issue_description = models.TextField()
    reported_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reported_maintenance')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_maintenance')
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Maintenance: {self.room.room_number} - {self.status}"

class BreakfastLog(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='breakfast_logs')
    date = models.DateField(auto_now_add=True)
    guest_count = models.PositiveIntegerField(default=1)
    notes = models.TextField(blank=True, default='')

    def __str__(self):
        return f"Breakfast: {self.room.room_number} - {self.date}"
