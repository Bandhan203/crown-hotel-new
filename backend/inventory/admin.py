from django.contrib import admin
from .models import Item, ItemCategory, Requisition, RequisitionItem, StockTransaction


@admin.register(ItemCategory)
class ItemCategoryAdmin(admin.ModelAdmin):
    list_display = ['name']


class RequisitionItemInline(admin.TabularInline):
    model = RequisitionItem
    extra = 1


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'unit', 'current_stock', 'min_stock_level', 'unit_price']
    list_filter = ['category']
    search_fields = ['name']


@admin.register(Requisition)
class RequisitionAdmin(admin.ModelAdmin):
    list_display = ['id', 'department', 'requested_by', 'status', 'created_at']
    list_filter = ['status']
    inlines = [RequisitionItemInline]


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ['item', 'transaction_type', 'quantity', 'reference', 'created_at']
    list_filter = ['transaction_type']
