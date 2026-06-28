from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'admin/hotel-services', views.AdminHotelServiceViewSet, basename='admin-hotel-services')
router.register(r'admin/facilities', views.AdminFacilityViewSet, basename='admin-facilities')

urlpatterns = [
    path('services/', views.HotelServiceListView.as_view(), name='hotel-services'),
    path('facilities/', views.FacilityListView.as_view(), name='facilities'),
    path('', include(router.urls)),
]
