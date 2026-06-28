from rest_framework import generics, permissions, viewsets

from accounts.permissions import IsAdmin
from .models import MenuCategory, MenuItem, RestaurantGallery
from .serializers import (
    MenuCategoryAdminSerializer,
    MenuCategorySerializer,
    MenuItemSerializer,
    RestaurantGallerySerializer,
)


# ── Public ───────────────────────────────────

class MenuListView(generics.ListAPIView):
    """GET /api/restaurant/menu/ — menu grouped by category."""
    queryset = MenuCategory.objects.prefetch_related('items')
    serializer_class = MenuCategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class RestaurantGalleryListView(generics.ListAPIView):
    """GET /api/restaurant/gallery/"""
    queryset = RestaurantGallery.objects.all()
    serializer_class = RestaurantGallerySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


# ── Admin ────────────────────────────────────

class AdminMenuCategoryViewSet(viewsets.ModelViewSet):
    queryset = MenuCategory.objects.all()
    serializer_class = MenuCategoryAdminSerializer
    permission_classes = [IsAdmin]


class AdminMenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.select_related('category')
    serializer_class = MenuItemSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['category', 'is_available']
    search_fields = ['name']


class AdminRestaurantGalleryViewSet(viewsets.ModelViewSet):
    queryset = RestaurantGallery.objects.all()
    serializer_class = RestaurantGallerySerializer
    permission_classes = [IsAdmin]
