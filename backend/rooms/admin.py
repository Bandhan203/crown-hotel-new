from django.contrib import admin

from .models import Room, RoomAmenity, RoomImage, RoomType, HousekeepingTask


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
    list_display = ['id', 'room', 'task_type', 'priority', 'status', 'assigned_to', 'scheduled_date']
    list_filter = ['status', 'task_type', 'priority', 'scheduled_date']
    search_fields = ['room__room_number', 'notes']
    raw_id_fields = ['room', 'assigned_to', 'inspected_by']
