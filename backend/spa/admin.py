from django.contrib import admin

from .models import SpaService, SpaAppointment


@admin.register(SpaService)
class SpaServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'duration', 'is_available']
    list_filter = ['is_available']
    search_fields = ['name']


@admin.register(SpaAppointment)
class SpaAppointmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'service', 'booking', 'guest_name', 'status', 'price', 'posted_to_folio', 'appointment_date']
    list_filter = ['status', 'posted_to_folio', 'appointment_date']
    search_fields = ['booking__booking_ref', 'guest_name', 'service__name']
    raw_id_fields = ['service', 'booking', 'folio_charge', 'created_by', 'posted_by']
    readonly_fields = ['created_at', 'updated_at']
