from django.contrib import admin

from .models import Facility, HotelService


@admin.register(HotelService)
class HotelServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'order']
    search_fields = ['name']


@admin.register(Facility)
class FacilityAdmin(admin.ModelAdmin):
    list_display = ['name', 'order']
    search_fields = ['name']
