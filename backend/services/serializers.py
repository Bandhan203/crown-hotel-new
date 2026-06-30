from rest_framework import serializers

from .models import Facility, HotelService


class HotelServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = HotelService
        fields = ['id', 'name', 'description', 'icon', 'is_active', 'order']


class FacilitySerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Facility
        fields = [
            'id', 'name', 'description', 'icon', 'image', 'image_url', 'category',
            'subtitle', 'link', 'is_active', 'order',
        ]

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url
