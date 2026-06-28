from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'admin/room-types', views.AdminRoomTypeViewSet, basename='admin-room-types')
router.register(r'admin/rooms', views.AdminRoomViewSet, basename='admin-rooms')
router.register(r'admin/amenities', views.AdminAmenityViewSet, basename='admin-amenities')
router.register(r'admin/room-images', views.AdminRoomImageViewSet, basename='admin-room-images')

urlpatterns = [
    # Public
    path('rooms/', views.RoomTypeListView.as_view(), name='room-type-list'),
    path('rooms/<slug:slug>/', views.RoomTypeDetailView.as_view(), name='room-type-detail'),
    # Admin (router)
    path('', include(router.urls)),
    # Housekeeping
    path('admin/housekeeping/', views.HousekeepingTaskListCreateView.as_view(), name='housekeeping-list'),
    path('admin/housekeeping/board/', views.HousekeepingBoardView.as_view(), name='housekeeping-board'),
    path('admin/housekeeping/<int:pk>/', views.HousekeepingTaskDetailView.as_view(), name='housekeeping-detail'),
    path('admin/rooms/<int:pk>/housekeeping-status/', views.RoomHousekeepingStatusView.as_view(), name='room-hk-status'),
]
