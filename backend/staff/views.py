from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import StaffPermission, StaffProfile
from .serializers import StaffCreateSerializer, StaffPermissionSerializer, StaffProfileSerializer


class AdminStaffListView(generics.ListCreateAPIView):
    """GET /api/admin/staff/ — list staff; POST — create staff."""
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return StaffProfile.objects.select_related('user').prefetch_related('permissions')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return StaffCreateSerializer
        return StaffProfileSerializer

    def create(self, request, *args, **kwargs):
        serializer = StaffCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        return Response(StaffProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


class AdminStaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PUT/DELETE /api/admin/staff/{id}/"""
    queryset = StaffProfile.objects.select_related('user').prefetch_related('permissions')
    serializer_class = StaffProfileSerializer
    permission_classes = [IsAdmin]


class AdminStaffPermissionView(APIView):
    """GET/PUT /api/admin/staff/{id}/permissions/"""
    permission_classes = [IsAdmin]

    def get(self, request, pk):
        try:
            profile = StaffProfile.objects.get(pk=pk)
        except StaffProfile.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        perms = profile.permissions.all()
        return Response(StaffPermissionSerializer(perms, many=True).data)

    def put(self, request, pk):
        try:
            profile = StaffProfile.objects.get(pk=pk)
        except StaffProfile.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Expect a list of permission objects
        serializer = StaffPermissionSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        # Clear existing and recreate
        profile.permissions.all().delete()
        for perm_data in serializer.validated_data:
            StaffPermission.objects.create(staff=profile, **perm_data)

        perms = profile.permissions.all()
        return Response(StaffPermissionSerializer(perms, many=True).data)


# ── Staff's own dashboard ────────────────────

class StaffDashboardView(APIView):
    """GET /api/staff/dashboard/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('STAFF', 'ADMIN'):
            return Response({'detail': 'Not allowed.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            profile = request.user.staff_profile
        except StaffProfile.DoesNotExist:
            return Response({'detail': 'Staff profile not found.'}, status=status.HTTP_404_NOT_FOUND)

        perms = profile.permissions.all()
        modules = {p.module: {
            'can_view': p.can_view,
            'can_create': p.can_create,
            'can_edit': p.can_edit,
            'can_delete': p.can_delete,
        } for p in perms}

        return Response({
            'staff': StaffProfileSerializer(profile).data,
            'modules': modules,
        })
