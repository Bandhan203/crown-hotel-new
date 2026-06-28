from rest_framework import generics, permissions, viewsets

from accounts.permissions import IsAdmin
from .models import Facility, HotelService
from .serializers import FacilitySerializer, HotelServiceSerializer


# ── Public ───────────────────────────────────

class HotelServiceListView(generics.ListAPIView):
    """GET /api/services/"""
    queryset = HotelService.objects.filter(is_active=True)
    serializer_class = HotelServiceSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class FacilityListView(generics.ListAPIView):
    """GET /api/facilities/"""
    queryset = Facility.objects.filter(is_active=True)
    serializer_class = FacilitySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None
    filterset_fields = ['category']


# ── Admin ────────────────────────────────────

class AdminHotelServiceViewSet(viewsets.ModelViewSet):
    queryset = HotelService.objects.all()
    serializer_class = HotelServiceSerializer
    permission_classes = [IsAdmin]


class AdminFacilityViewSet(viewsets.ModelViewSet):
    queryset = Facility.objects.all()
    serializer_class = FacilitySerializer
    permission_classes = [IsAdmin]
