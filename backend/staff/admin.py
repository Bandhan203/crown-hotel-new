from django.contrib import admin

from .models import StaffPermission, StaffProfile


class StaffPermissionInline(admin.TabularInline):
    model = StaffPermission
    extra = 1


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'department', 'position', 'is_active']
    list_filter = ['is_active', 'department']
    inlines = [StaffPermissionInline]
