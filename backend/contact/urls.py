from django.urls import path

from . import views

urlpatterns = [
    # Public
    path('contact/', views.ContactFormView.as_view(), name='contact-form'),
    # Admin
    path('admin/contacts/', views.AdminContactListView.as_view(), name='admin-contact-list'),
    path('admin/contacts/<int:pk>/read/', views.AdminContactMarkReadView.as_view(), name='admin-contact-read'),
]
