from django.contrib import admin

from .models import MenuCategory, MenuItem, RestaurantGallery, RestaurantOrder, RestaurantOrderItem


class MenuItemInline(admin.TabularInline):
    model = MenuItem
    extra = 1


@admin.register(MenuCategory)
class MenuCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'order']
    inlines = [MenuItemInline]


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'is_available']
    list_filter = ['category', 'is_available']
    search_fields = ['name']


@admin.register(RestaurantGallery)
class RestaurantGalleryAdmin(admin.ModelAdmin):
    list_display = ['caption', 'order']


class RestaurantOrderItemInline(admin.TabularInline):
    model = RestaurantOrderItem
    extra = 1
    readonly_fields = ['total']


@admin.register(RestaurantOrder)
class RestaurantOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'booking', 'room', 'order_type', 'status', 'total', 'posted_to_folio', 'order_date']
    list_filter = ['status', 'order_type', 'posted_to_folio', 'order_date']
    search_fields = ['booking__booking_ref', 'room__room_number']
    raw_id_fields = ['booking', 'room', 'folio_charge', 'created_by', 'posted_by']
    readonly_fields = ['subtotal', 'total', 'created_at', 'updated_at']
    inlines = [RestaurantOrderItemInline]
