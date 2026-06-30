from django.contrib import admin

from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'subject', 'source', 'is_read', 'replied_at', 'created_at']
    list_filter = ['is_read', 'source']
    search_fields = ['name', 'email', 'subject', 'phone']
    readonly_fields = ['created_at', 'replied_at', 'replied_by']
