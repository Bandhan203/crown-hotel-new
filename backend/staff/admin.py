from django.contrib import admin

from .models import StaffInvite, StaffPermission, StaffProfile


class StaffPermissionInline(admin.TabularInline):
    model = StaffPermission
    extra = 1


@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'department', 'position', 'is_active']
    list_filter = ['is_active', 'department']
    inlines = [StaffPermissionInline]


@admin.register(StaffInvite)
class StaffInviteAdmin(admin.ModelAdmin):
    list_display = ['email', 'full_name', 'department', 'expires_at', 'accepted_at', 'revoked_at']
    list_filter = ['department']
    search_fields = ['email', 'full_name', 'token']
