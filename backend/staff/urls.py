from django.urls import path

from . import views

urlpatterns = [
    # Admin
    path('admin/staff/', views.AdminStaffListView.as_view(), name='admin-staff-list'),
    path('admin/staff/meta/', views.StaffMetaView.as_view(), name='admin-staff-meta'),
    path('admin/staff/invites/', views.AdminStaffInviteListCreateView.as_view(), name='admin-staff-invites'),
    path('admin/staff/invites/<int:pk>/revoke/', views.AdminStaffInviteRevokeView.as_view(), name='admin-staff-invite-revoke'),
    path('admin/staff/<int:pk>/', views.AdminStaffDetailView.as_view(), name='admin-staff-detail'),
    path('admin/staff/<int:pk>/permissions/', views.AdminStaffPermissionView.as_view(), name='admin-staff-permissions'),
    # Public staff onboarding
    path('auth/staff-invite/<str:token>/', views.StaffInvitePreviewView.as_view(), name='staff-invite-preview'),
    path('auth/staff-invite/<str:token>/accept/', views.StaffInviteAcceptView.as_view(), name='staff-invite-accept'),
    # Staff own
    path('staff/dashboard/', views.StaffDashboardView.as_view(), name='staff-dashboard'),
]
