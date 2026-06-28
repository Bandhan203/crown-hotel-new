from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'admin/menu-categories', views.AdminMenuCategoryViewSet, basename='admin-menu-categories')
router.register(r'admin/menu-items', views.AdminMenuItemViewSet, basename='admin-menu-items')
router.register(r'admin/restaurant-gallery', views.AdminRestaurantGalleryViewSet, basename='admin-restaurant-gallery')

urlpatterns = [
    # Public
    path('restaurant/menu/', views.MenuListView.as_view(), name='restaurant-menu'),
    path('restaurant/gallery/', views.RestaurantGalleryListView.as_view(), name='restaurant-gallery'),
    # Admin (router)
    path('', include(router.urls)),
]
