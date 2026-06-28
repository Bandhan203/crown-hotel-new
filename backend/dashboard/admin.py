from django.contrib import admin

from .models import NightAuditLog


@admin.register(NightAuditLog)
class NightAuditLogAdmin(admin.ModelAdmin):
    list_display = ('audit_date', 'occupancy_rate', 'total_revenue', 'no_show_count', 'performed_by', 'created_at')
    list_filter = ('audit_date',)
    readonly_fields = ('created_at',)
