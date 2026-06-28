from rest_framework import serializers
from .models import Item, ItemCategory, Requisition, RequisitionItem, StockTransaction


class ItemCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemCategory
        fields = ['id', 'name', 'description']


class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    low_stock = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = ['id', 'category', 'category_name', 'name', 'unit', 'unit_price',
                  'current_stock', 'min_stock_level', 'low_stock']

    def get_low_stock(self, obj):
        return obj.current_stock <= obj.min_stock_level


class RequisitionItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_unit = serializers.CharField(source='item.unit', read_only=True)

    class Meta:
        model = RequisitionItem
        fields = ['id', 'item', 'item_name', 'item_unit', 'quantity']


class RequisitionSerializer(serializers.ModelSerializer):
    items = RequisitionItemSerializer(many=True, read_only=True)
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)

    class Meta:
        model = Requisition
        fields = ['id', 'department', 'requested_by', 'requested_by_name',
                  'status', 'notes', 'created_at', 'approved_at',
                  'approved_by', 'approved_by_name', 'items']
        read_only_fields = ['id', 'requested_by', 'created_at', 'approved_at', 'approved_by']


class RequisitionCreateSerializer(serializers.ModelSerializer):
    items = RequisitionItemSerializer(many=True)

    class Meta:
        model = Requisition
        fields = ['department', 'notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        requisition = Requisition.objects.create(**validated_data)
        for item_data in items_data:
            RequisitionItem.objects.create(requisition=requisition, **item_data)
        return requisition


class StockTransactionSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)

    class Meta:
        model = StockTransaction
        fields = ['id', 'item', 'item_name', 'transaction_type', 'quantity',
                  'reference', 'created_at', 'created_by', 'created_by_name']
        read_only_fields = ['id', 'created_at', 'created_by']


class StockInSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockTransaction
        fields = ['item', 'quantity', 'reference']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be positive.')
        return value
