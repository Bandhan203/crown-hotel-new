from django.urls import path

from . import views

urlpatterns = [
    path('dashboard/admin/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('dashboard/admin/room-grid/', views.RoomGridView.as_view(), name='admin-room-grid'),
    path('dashboard/admin/room-grid/<int:pk>/context/', views.RoomGridContextView.as_view(), name='admin-room-grid-context'),
    path('dashboard/guest/', views.GuestDashboardView.as_view(), name='guest-dashboard'),
    # Night Audit
    path('admin/night-audit/', views.NightAuditListView.as_view(), name='night-audit-list'),
    path('admin/night-audit/preview/', views.NightAuditPreviewView.as_view(), name='night-audit-preview'),
    path('admin/night-audit/run/', views.NightAuditRunView.as_view(), name='night-audit-run'),
    path('admin/night-audit/<str:audit_date>/', views.NightAuditDetailView.as_view(), name='night-audit-detail'),
    # Reports
    path('admin/reports/occupancy/', views.OccupancyReportView.as_view(), name='report-occupancy'),
    path('admin/reports/revenue/', views.RevenueReportView.as_view(), name='report-revenue'),
    path('admin/reports/arrivals-departures/', views.ArrivalsReportView.as_view(), name='report-arrivals'),
    path('admin/reports/no-shows/', views.NoShowReportView.as_view(), name='report-no-shows'),
    path('admin/reports/cancellations/', views.CancellationReportView.as_view(), name='report-cancellations'),
    path('admin/reports/guest-ledger/', views.GuestLedgerReportView.as_view(), name='report-guest-ledger'),
    path('admin/reports/recent-bookings/', views.RecentBookingsReportView.as_view(), name='report-recent-bookings'),
    # ERP Features
    path('admin/config/', views.HotelConfigView.as_view(), name='hotel-config'),
    path('admin/bookings/<int:booking_id>/folio-windows/', views.FolioWindowView.as_view(), name='folio-windows'),
    path('admin/bookings/<int:booking_id>/folio-transfer/', views.FolioTransferView.as_view(), name='folio-transfer'),
    path('admin/folio/<int:charge_id>/adjust/', views.FolioAdjustmentView.as_view(), name='folio-adjust'),
    path('admin/dashboard/queue/', views.QueueManagementView.as_view(), name='dashboard-queue'),
]
