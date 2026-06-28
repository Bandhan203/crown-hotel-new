from django.contrib.auth import get_user_model
from django.db.models import Count
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView  # noqa: F401

from .models import GuestProfile
from .permissions import IsAdmin, IsStaffUser
from .serializers import (
    GuestProfileSerializer,
    GuestStayHistorySerializer,
    LoginSerializer,
    RegisterSerializer,
    UserListSerializer,
    UserProfileSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — create a guest account."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login/ — email + password → JWT tokens."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(password):
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'detail': 'Account disabled.'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class LogoutView(APIView):
    """POST /api/auth/logout/ — blacklist refresh token."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception:
            return Response({'detail': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """GET/PUT /api/auth/me/ — current user profile."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# ── Admin: guest management ─────────────────────

class GuestListView(generics.ListAPIView):
    """GET /api/admin/guests/ — list all guest accounts."""
    serializer_class = UserListSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['is_active']
    search_fields = ['email', 'full_name', 'phone']
    ordering_fields = ['date_joined', 'full_name', 'total_bookings']

    def get_queryset(self):
        return User.objects.filter(role='GUEST').annotate(
            total_bookings=Count('bookings')
        )


class GuestDetailView(generics.RetrieveAPIView):
    """GET /api/admin/guests/{id}/ — guest detail."""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.filter(role='GUEST')


class GuestToggleActiveView(APIView):
    """PATCH /api/admin/guests/{id}/toggle-active/ — activate or deactivate a guest."""
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role='GUEST')
        except User.DoesNotExist:
            return Response({'detail': 'Guest not found.'}, status=status.HTTP_404_NOT_FOUND)
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({'id': user.id, 'is_active': user.is_active})


# ── Guest Profile ────────────────────────────

class AdminGuestProfileView(APIView):
    """GET/PATCH /api/admin/guests/{id}/profile/"""
    permission_classes = [IsStaffUser]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role='GUEST')
        except User.DoesNotExist:
            return Response({'detail': 'Guest not found.'}, status=status.HTTP_404_NOT_FOUND)
        profile, _ = GuestProfile.objects.get_or_create(user=user)
        return Response(GuestProfileSerializer(profile).data)

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role='GUEST')
        except User.DoesNotExist:
            return Response({'detail': 'Guest not found.'}, status=status.HTTP_404_NOT_FOUND)
        profile, _ = GuestProfile.objects.get_or_create(user=user)
        serializer = GuestProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdminGuestStayHistoryView(generics.ListAPIView):
    """GET /api/admin/guests/{id}/stay-history/"""
    serializer_class = GuestStayHistorySerializer
    permission_classes = [IsStaffUser]

    def get_queryset(self):
        from bookings.models import Booking
        return Booking.objects.filter(
            guest_id=self.kwargs['pk']
        ).select_related('room', 'room_type').order_by('-check_in_date')


class MyProfileView(APIView):
    """GET/PATCH /api/auth/me/profile/ — guest views/updates own profile."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile, _ = GuestProfile.objects.get_or_create(user=request.user)
        return Response(GuestProfileSerializer(profile).data)

    def patch(self, request):
        profile, _ = GuestProfile.objects.get_or_create(user=request.user)
        serializer = GuestProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
