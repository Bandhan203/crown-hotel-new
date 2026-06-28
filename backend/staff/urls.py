from django.urls import path

from . import views

urlpatterns = [
    # Admin
    path('admin/staff/', views.AdminStaffListView.as_view(), name='admin-staff-list'),
    path('admin/staff/<int:pk>/', views.AdminStaffDetailView.as_view(), name='admin-staff-detail'),
    path('admin/staff/<int:pk>/permissions/', views.AdminStaffPermissionView.as_view(), name='admin-staff-permissions'),
    # Staff own
    path('staff/dashboard/', views.StaffDashboardView.as_view(), name='staff-dashboard'),
]
