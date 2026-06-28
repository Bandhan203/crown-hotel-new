from django.contrib import admin

from .models import SpaService


@admin.register(SpaService)
class SpaServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'duration', 'is_available']
    list_filter = ['is_available']
    search_fields = ['name']
