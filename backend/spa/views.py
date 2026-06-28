from rest_framework import generics, permissions, viewsets

from accounts.permissions import IsAdmin
from .models import SpaService
from .serializers import SpaServiceSerializer


class SpaServiceListView(generics.ListAPIView):
    """GET /api/spa/services/ — public spa services."""
    queryset = SpaService.objects.filter(is_available=True)
    serializer_class = SpaServiceSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class AdminSpaServiceViewSet(viewsets.ModelViewSet):
    """CRUD /api/admin/spa-services/"""
    queryset = SpaService.objects.all()
    serializer_class = SpaServiceSerializer
    permission_classes = [IsAdmin]
