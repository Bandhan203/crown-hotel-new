from rest_framework import serializers

from .models import Facility, HotelService


class HotelServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelService
        fields = ['id', 'name', 'description', 'icon', 'is_active', 'order']


class FacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Facility
        fields = [
            'id', 'name', 'description', 'icon', 'image', 'category',
            'subtitle', 'link', 'is_active', 'order',
        ]
