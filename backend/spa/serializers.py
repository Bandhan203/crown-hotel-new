from rest_framework import serializers

from .models import SpaService


class SpaServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpaService
        fields = ['id', 'name', 'description', 'price', 'duration', 'image', 'is_available']
