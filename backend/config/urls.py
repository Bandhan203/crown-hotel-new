from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path('django-admin/', admin.site.urls),
    # API endpoints
    path('api/', include('accounts.urls')),
    path('api/', include('rooms.urls')),
    path('api/', include('bookings.urls')),
    path('api/', include('restaurant.urls')),
    path('api/', include('spa.urls')),
    path('api/', include('services.urls')),
    path('api/', include('cms.urls')),
    path('api/', include('contact.urls')),
    path('api/', include('staff.urls')),
    path('api/', include('dashboard.urls')),
    path('api/', include('inventory.urls')),
    # Media files (served in all environments)
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
else:
    # In production, serve React SPA for all non-API/admin/media/static routes
    from django.views.generic import TemplateView
    urlpatterns += [
        re_path(r'^(?!api/|django-admin/|media/|static/).*$',
                TemplateView.as_view(template_name='index.html')),
    ]
