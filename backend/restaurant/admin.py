from django.contrib import admin

from .models import MenuCategory, MenuItem, RestaurantGallery


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
