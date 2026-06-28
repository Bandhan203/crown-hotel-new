from rest_framework import serializers

from .models import MenuCategory, MenuItem, RestaurantGallery


class MenuItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = MenuItem
        fields = ['id', 'category', 'category_name', 'name', 'description', 'price', 'image', 'is_available']


class MenuCategorySerializer(serializers.ModelSerializer):
    items = MenuItemSerializer(many=True, read_only=True)

    class Meta:
        model = MenuCategory
        fields = ['id', 'name', 'order', 'items']


class MenuCategoryAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuCategory
        fields = '__all__'


class RestaurantGallerySerializer(serializers.ModelSerializer):
    class Meta:
        model = RestaurantGallery
        fields = ['id', 'image', 'caption', 'order']
