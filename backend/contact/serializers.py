from rest_framework import serializers

from .models import ContactMessage


class ContactMessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['name', 'email', 'phone', 'subject', 'message', 'source']
        extra_kwargs = {
            'source': {'required': False},
            'phone': {'required': False, 'allow_blank': True},
            'subject': {'required': False, 'allow_blank': True},
        }


class ContactMessageListSerializer(serializers.ModelSerializer):
    replied_by_name = serializers.CharField(source='replied_by.full_name', read_only=True, default=None)
    is_replied = serializers.BooleanField(read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)

    class Meta:
        model = ContactMessage
        fields = [
            'id', 'name', 'email', 'phone', 'subject', 'message', 'source', 'source_display',
            'is_read', 'is_replied', 'admin_reply', 'replied_at', 'replied_by_name',
            'created_at',
        ]


class ContactReplySerializer(serializers.Serializer):
    reply = serializers.CharField(min_length=1, max_length=5000)
