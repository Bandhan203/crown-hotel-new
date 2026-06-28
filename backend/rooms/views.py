from django.db.models import Count
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsStaffUser
from .filters import RoomTypeFilter
from .models import Room, RoomAmenity, RoomImage, RoomType, HousekeepingTask
from .serializers import (
    HousekeepingBoardRoomSerializer,
    HousekeepingTaskSerializer,
    RoomAmenitySerializer,
    RoomImageSerializer,
    RoomSerializer,
    RoomTypeAdminSerializer,
    RoomTypeDetailSerializer,
    RoomTypeListSerializer,
)


# ── Public ───────────────────────────────────

class RoomTypeListView(generics.ListAPIView):
    """GET /api/rooms/ — public room type listing."""
    queryset = RoomType.objects.prefetch_related('images')
    serializer_class = RoomTypeListSerializer
    permission_classes = [permissions.AllowAny]
    filterset_class = RoomTypeFilter
    search_fields = ['name', 'description']
    ordering_fields = ['price_per_night', 'name', 'created_at']


class RoomTypeDetailView(generics.RetrieveAPIView):
    """GET /api/rooms/{slug}/ — public room type detail."""
    queryset = RoomType.objects.prefetch_related('images', 'amenities', 'rooms')
    serializer_class = RoomTypeDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


# ── Admin CRUD ───────────────────────────────

class AdminRoomTypeViewSet(viewsets.ModelViewSet):
    """CRUD /api/admin/room-types/"""
    queryset = RoomType.objects.annotate(room_count=Count('rooms'))
    serializer_class = RoomTypeAdminSerializer
    permission_classes = [IsAdmin]
    search_fields = ['name']
    ordering_fields = ['price_per_night', 'name', 'created_at']


class AdminRoomViewSet(viewsets.ModelViewSet):
    """CRUD /api/admin/rooms/"""
    queryset = Room.objects.select_related('room_type')
    serializer_class = RoomSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['status', 'room_type', 'floor']
    search_fields = ['room_number']
    ordering_fields = ['room_number', 'floor']


class AdminAmenityViewSet(viewsets.ModelViewSet):
    """CRUD /api/admin/amenities/"""
    queryset = RoomAmenity.objects.all()
    serializer_class = RoomAmenitySerializer
    permission_classes = [IsAdmin]


class AdminRoomImageViewSet(viewsets.ModelViewSet):
    """CRUD /api/admin/room-images/"""
    queryset = RoomImage.objects.select_related('room_type')
    serializer_class = RoomImageSerializer
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['room_type']


# ── Housekeeping ─────────────────────────────

class HousekeepingTaskListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/housekeeping/"""
    serializer_class = HousekeepingTaskSerializer
    permission_classes = [IsStaffUser]
    filterset_fields = ['status', 'task_type', 'priority', 'room', 'assigned_to', 'scheduled_date']
    search_fields = ['room__room_number', 'notes']
    ordering_fields = ['scheduled_date', 'priority', 'created_at']

    def get_queryset(self):
        return HousekeepingTask.objects.select_related(
            'room', 'room__room_type', 'assigned_to', 'inspected_by'
        )

    def perform_create(self, serializer):
        serializer.save()


class HousekeepingTaskDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/admin/housekeeping/{id}/"""
    serializer_class = HousekeepingTaskSerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        return HousekeepingTask.objects.select_related(
            'room', 'room__room_type', 'assigned_to', 'inspected_by'
        )

    def perform_update(self, serializer):
        instance = serializer.save()
        # When completing a task, update room HK status + timestamp
        if instance.status == 'COMPLETED' and instance.task_type in ('CLEAN', 'DEEP_CLEAN'):
            instance.room.housekeeping_status = 'CLEAN'
            instance.room.last_cleaned_at = timezone.now()
            instance.room.save(update_fields=['housekeeping_status', 'last_cleaned_at'])
        elif instance.status == 'COMPLETED' and instance.task_type == 'INSPECT':
            instance.room.housekeeping_status = 'INSPECTED'
            instance.room.save(update_fields=['housekeeping_status'])


class HousekeepingBoardView(generics.ListAPIView):
    """GET /api/admin/housekeeping/board/ — all rooms with HK status."""
    serializer_class = HousekeepingBoardRoomSerializer
    permission_classes = [IsStaffUser]
    pagination_class = None

    def get_queryset(self):
        return Room.objects.select_related('room_type').order_by('floor', 'room_number')


class RoomHousekeepingStatusView(APIView):
    """PATCH /api/admin/rooms/{id}/housekeeping-status/ — quick HK status toggle."""
    permission_classes = [IsStaffUser]

    def patch(self, request, pk):
        try:
            room = Room.objects.get(pk=pk)
        except Room.DoesNotExist:
            return Response({'detail': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('housekeeping_status')
        if new_status not in dict(Room.HousekeepingStatus.choices):
            return Response(
                {'detail': f'Invalid status. Choose from: {list(dict(Room.HousekeepingStatus.choices).keys())}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        room.housekeeping_status = new_status
        if new_status in ('CLEAN', 'INSPECTED'):
            room.last_cleaned_at = timezone.now()
        room.save(update_fields=['housekeeping_status', 'last_cleaned_at'])
        return Response(HousekeepingBoardRoomSerializer(room).data)
