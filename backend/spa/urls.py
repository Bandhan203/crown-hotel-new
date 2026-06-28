from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'admin/spa-services', views.AdminSpaServiceViewSet, basename='admin-spa-services')

urlpatterns = [
    path('spa/services/', views.SpaServiceListView.as_view(), name='spa-services'),
    path('', include(router.urls)),
]
