from django.contrib import admin

from .models import Booking, FolioCharge, Payment, PaymentGatewayConfig, RatePlan


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


class FolioInline(admin.TabularInline):
    model = FolioCharge
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['booking_ref', 'guest', 'room_type', 'room', 'check_in_date', 'check_out_date', 'status', 'booking_source', 'total_price']
    list_filter = ['status', 'room_type', 'booking_source']
    search_fields = ['booking_ref', 'guest__email', 'guest__full_name', 'guest__phone']
    inlines = [PaymentInline, FolioInline]
    readonly_fields = ['booking_ref', 'created_at', 'updated_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'amount', 'payment_method', 'status', 'paid_at']
    list_filter = ['status', 'payment_method']


@admin.register(FolioCharge)
class FolioChargeAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'charge_type', 'description', 'total', 'charge_date', 'is_void']
    list_filter = ['charge_type', 'is_void']
    search_fields = ['booking__booking_ref', 'description']


@admin.register(RatePlan)
class RatePlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'discount_type', 'discount_value', 'is_active', 'valid_from', 'valid_to']
    list_filter = ['is_active', 'discount_type']
    search_fields = ['name', 'code']


@admin.register(PaymentGatewayConfig)
class PaymentGatewayConfigAdmin(admin.ModelAdmin):
    list_display = ['store_id', 'is_sandbox', 'is_active', 'updated_at']
