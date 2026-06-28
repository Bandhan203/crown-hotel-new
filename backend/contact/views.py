from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from common.throttles import ContactFormThrottle
from .models import ContactMessage
from .serializers import ContactMessageCreateSerializer, ContactMessageListSerializer


class ContactFormView(generics.CreateAPIView):
    """POST /api/contact/ — public contact form (rate-limited)."""
    serializer_class = ContactMessageCreateSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ContactFormThrottle]


class AdminContactListView(generics.ListAPIView):
    """GET /api/admin/contacts/"""
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageListSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['is_read']
    search_fields = ['name', 'email', 'subject']
    ordering_fields = ['created_at']


class AdminContactMarkReadView(APIView):
    """PATCH /api/admin/contacts/{id}/read/"""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            msg = ContactMessage.objects.get(pk=pk)
        except ContactMessage.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        msg.is_read = True
        msg.save(update_fields=['is_read'])
        return Response(ContactMessageListSerializer(msg).data)
