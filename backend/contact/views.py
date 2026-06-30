from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffUser
from common.throttles import ContactFormThrottle
from .email_services import notify_staff_new_message, send_admin_reply_email, send_guest_auto_reply
from .models import ContactMessage
from .serializers import (
    ContactMessageCreateSerializer,
    ContactMessageListSerializer,
    ContactReplySerializer,
)


class ContactFormView(generics.CreateAPIView):
    """POST /api/contact/ — public contact form (rate-limited)."""
    serializer_class = ContactMessageCreateSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ContactFormThrottle]

    def perform_create(self, serializer):
        message = serializer.save()
        notify_staff_new_message(message)
        send_guest_auto_reply(message)


class AdminContactListView(generics.ListAPIView):
    """GET /api/admin/contacts/"""
    queryset = ContactMessage.objects.select_related('replied_by').all()
    serializer_class = ContactMessageListSerializer
    permission_classes = [IsStaffUser]
    filterset_fields = ['is_read', 'source']
    search_fields = ['name', 'email', 'subject', 'phone', 'message']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get('status')
        if status == 'replied':
            return qs.exclude(admin_reply='').filter(replied_at__isnull=False)
        if status == 'pending':
            return qs.filter(admin_reply='')
        return qs


class AdminContactDetailView(generics.RetrieveDestroyAPIView):
    """GET/DELETE /api/admin/contacts/{id}/"""
    queryset = ContactMessage.objects.select_related('replied_by').all()
    serializer_class = ContactMessageListSerializer
    permission_classes = [IsStaffUser]


class AdminContactMarkReadView(APIView):
    """PATCH /api/admin/contacts/{id}/read/"""
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        try:
            msg = ContactMessage.objects.get(pk=pk)
        except ContactMessage.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        msg.is_read = True
        msg.save(update_fields=['is_read'])
        return Response(ContactMessageListSerializer(msg).data)


class AdminContactMarkUnreadView(APIView):
    """PATCH /api/admin/contacts/{id}/unread/"""
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        try:
            msg = ContactMessage.objects.get(pk=pk)
        except ContactMessage.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        msg.is_read = False
        msg.save(update_fields=['is_read'])
        return Response(ContactMessageListSerializer(msg).data)


class AdminContactReplyView(APIView):
    """POST /api/admin/contacts/{id}/reply/ — email guest and store reply."""
    permission_classes = [IsStaffUser]

    def post(self, request, pk):
        try:
            msg = ContactMessage.objects.select_related('replied_by').get(pk=pk)
        except ContactMessage.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ContactReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reply_text = serializer.validated_data['reply'].strip()

        msg.admin_reply = reply_text
        msg.replied_at = timezone.now()
        msg.replied_by = request.user
        msg.is_read = True
        msg.save(update_fields=['admin_reply', 'replied_at', 'replied_by', 'is_read'])

        emailed = send_admin_reply_email(msg, reply_text, request.user.full_name or request.user.email)
        msg.refresh_from_db()
        data = ContactMessageListSerializer(msg).data
        data['email_sent'] = emailed
        return Response(data)


class AdminContactBulkReadView(APIView):
    """POST /api/admin/contacts/mark-all-read/"""
    permission_classes = [IsStaffUser]

    def post(self, request):
        updated = ContactMessage.objects.filter(is_read=False).update(is_read=True)
        return Response({'marked': updated})


class AdminContactStatsView(APIView):
    """GET /api/admin/contacts/stats/"""
    permission_classes = [IsStaffUser]

    def get(self, request):
        qs = ContactMessage.objects.all()
        total = qs.count()
        unread = qs.filter(is_read=False).count()
        replied = qs.exclude(admin_reply='').filter(replied_at__isnull=False).count()
        pending_reply = qs.filter(admin_reply='', is_read=False).count()
        return Response({
            'total': total,
            'unread': unread,
            'replied': replied,
            'pending_reply': pending_reply,
        })
