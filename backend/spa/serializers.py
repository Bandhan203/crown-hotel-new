from rest_framework import serializers

from .models import SpaService


class SpaServiceSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = SpaService
        fields = ['id', 'name', 'description', 'price', 'duration', 'image', 'image_url', 'is_available']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url
