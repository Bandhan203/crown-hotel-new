from django.urls import path

from . import views

urlpatterns = [
    # Public
    path('contact/', views.ContactFormView.as_view(), name='contact-form'),
    # Admin
    path('admin/contacts/', views.AdminContactListView.as_view(), name='admin-contact-list'),
    path('admin/contacts/stats/', views.AdminContactStatsView.as_view(), name='admin-contact-stats'),
    path('admin/contacts/mark-all-read/', views.AdminContactBulkReadView.as_view(), name='admin-contact-bulk-read'),
    path('admin/contacts/<int:pk>/', views.AdminContactDetailView.as_view(), name='admin-contact-detail'),
    path('admin/contacts/<int:pk>/read/', views.AdminContactMarkReadView.as_view(), name='admin-contact-read'),
    path('admin/contacts/<int:pk>/unread/', views.AdminContactMarkUnreadView.as_view(), name='admin-contact-unread'),
    path('admin/contacts/<int:pk>/reply/', views.AdminContactReplyView.as_view(), name='admin-contact-reply'),
]
