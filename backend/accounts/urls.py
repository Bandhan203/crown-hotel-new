from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('auth/me/', views.ProfileView.as_view(), name='profile'),
    path('auth/me/profile/', views.MyProfileView.as_view(), name='my-profile'),
    # Admin — guest management
    path('admin/guests/', views.GuestListView.as_view(), name='admin-guest-list'),
    path('admin/guests/<int:pk>/', views.GuestDetailView.as_view(), name='admin-guest-detail'),
    path('admin/guests/<int:pk>/toggle-active/', views.GuestToggleActiveView.as_view(), name='admin-guest-toggle-active'),
    path('admin/guests/<int:pk>/profile/', views.AdminGuestProfileView.as_view(), name='admin-guest-profile'),
    path('admin/guests/<int:pk>/stay-history/', views.AdminGuestStayHistoryView.as_view(), name='admin-guest-stay-history'),
]
