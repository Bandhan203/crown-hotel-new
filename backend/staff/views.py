from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.permissions import IsAdmin
from accounts.serializers import UserProfileSerializer
from .invite_services import accept_staff_invite, create_staff_invite
from .models import StaffInvite, StaffPermission, StaffProfile
from .serializers import (
    PERMISSION_PRESETS,
    DEPARTMENTS,
    StaffCreateSerializer,
    StaffInviteAcceptSerializer,
    StaffInviteCreateSerializer,
    StaffInviteSerializer,
    StaffPermissionSerializer,
    StaffProfileSerializer,
)


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


class StaffMetaView(APIView):
    """GET /api/admin/staff/meta/ — departments and permission presets."""
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({
            'departments': DEPARTMENTS,
            'permission_presets': list(PERMISSION_PRESETS.keys()),
        })


class AdminStaffInviteListCreateView(APIView):
    """GET/POST /api/admin/staff/invites/"""
    permission_classes = [IsAdmin]

    def get(self, request):
        invites = StaffInvite.objects.select_related('created_by').filter(
            accepted_at__isnull=True,
        ).order_by('-created_at')[:50]
        return Response(StaffInviteSerializer(invites, many=True).data)

    def post(self, request):
        serializer = StaffInviteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        preset = data.pop('permission_preset', 'NONE')
        custom_perms = data.pop('permissions', None)
        if custom_perms:
            permissions_list = custom_perms
        elif preset and preset != 'NONE':
            permissions_list = PERMISSION_PRESETS.get(preset, [])
        else:
            permissions_list = []

        try:
            invite, invite_url = create_staff_invite(
                email=data['email'],
                full_name=data['full_name'],
                phone=data.get('phone', ''),
                department=data.get('department', ''),
                position=data.get('position', ''),
                permissions=permissions_list,
                created_by=request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        payload = StaffInviteSerializer(invite).data
        payload['invite_url'] = invite_url
        return Response(payload, status=status.HTTP_201_CREATED)


class AdminStaffInviteRevokeView(APIView):
    """POST /api/admin/staff/invites/<id>/revoke/"""
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        from django.utils import timezone
        try:
            invite = StaffInvite.objects.get(pk=pk, accepted_at__isnull=True)
        except StaffInvite.DoesNotExist:
            return Response({'detail': 'Invite not found or already used.'}, status=status.HTTP_404_NOT_FOUND)
        invite.revoked_at = timezone.now()
        invite.save(update_fields=['revoked_at'])
        return Response({'detail': 'Invite revoked.'})


class StaffInvitePreviewView(APIView):
    """GET /api/auth/staff-invite/<token>/ — public invite details."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        try:
            invite = StaffInvite.objects.get(token=token)
        except StaffInvite.DoesNotExist:
            return Response({'detail': 'Invalid invite link.'}, status=status.HTTP_404_NOT_FOUND)

        if invite.accepted_at:
            return Response({'detail': 'This invite has already been used.', 'status': 'accepted'}, status=status.HTTP_400_BAD_REQUEST)
        if invite.revoked_at:
            return Response({'detail': 'This invite has been revoked.', 'status': 'revoked'}, status=status.HTTP_400_BAD_REQUEST)
        if not invite.is_valid:
            return Response({'detail': 'This invite has expired.', 'status': 'expired'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'email': invite.email,
            'full_name': invite.full_name,
            'department': invite.department,
            'position': invite.position,
            'expires_at': invite.expires_at.isoformat(),
            'hotel_name': 'Hotel Crown',
        })


class StaffInviteAcceptView(APIView):
    """POST /api/auth/staff-invite/<token>/accept/ — set password and activate."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, token):
        try:
            invite = StaffInvite.objects.get(token=token)
        except StaffInvite.DoesNotExist:
            return Response({'detail': 'Invalid invite link.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = StaffInviteAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user, profile = accept_staff_invite(invite, serializer.validated_data['password'])
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        refresh = RefreshToken.for_user(user)
        return Response({
            'detail': 'Account activated successfully.',
            'user': UserProfileSerializer(user).data,
            'staff': StaffProfileSerializer(profile).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
        }, status=status.HTTP_201_CREATED)
