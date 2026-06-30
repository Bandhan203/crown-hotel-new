from django.contrib import admin

from .models import Room, RoomAmenity, RoomImage, RoomType, HousekeepingTask, BreakfastLog, MaintenanceLog


class RoomImageInline(admin.TabularInline):
    model = RoomImage
    extra = 1


@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'price_per_night', 'max_guests', 'beds', 'is_featured']
    list_filter = ['is_featured', 'view_type']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [RoomImageInline]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['room_number', 'room_type', 'floor', 'status', 'housekeeping_status']
    list_filter = ['status', 'housekeeping_status', 'room_type', 'floor']
    search_fields = ['room_number']


@admin.register(RoomAmenity)
class RoomAmenityAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon']
    search_fields = ['name']


@admin.register(HousekeepingTask)
class HousekeepingTaskAdmin(admin.ModelAdmin):
    list_display = ['id', 'room', 'booking', 'task_type', 'priority', 'status', 'assigned_to', 'scheduled_date']
    list_filter = ['status', 'task_type', 'priority', 'scheduled_date']
    search_fields = ['room__room_number', 'booking__booking_ref', 'notes']
    raw_id_fields = ['room', 'booking', 'assigned_to', 'inspected_by']


@admin.register(BreakfastLog)
class BreakfastLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'room', 'booking', 'meal_plan', 'date', 'guest_count']
    list_filter = ['meal_plan', 'date']
    search_fields = ['room__room_number', 'booking__booking_ref']
    raw_id_fields = ['room', 'booking']


@admin.register(MaintenanceLog)
class MaintenanceLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'room', 'status', 'reported_by', 'created_at']
    list_filter = ['status']
    search_fields = ['room__room_number', 'issue_description']
    raw_id_fields = ['room', 'reported_by', 'assigned_to']
