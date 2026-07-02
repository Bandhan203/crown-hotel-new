from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'admin/hero-slides', views.AdminHeroSlideViewSet, basename='admin-hero-slides')
router.register(r'admin/news', views.AdminNewsPostViewSet, basename='admin-news')
router.register(r'admin/faq', views.AdminFAQViewSet, basename='admin-faq')
router.register(r'admin/testimonials', views.AdminTestimonialViewSet, basename='admin-testimonials')
router.register(r'admin/team', views.AdminTeamMemberViewSet, basename='admin-team')
router.register(r'admin/gallery', views.AdminGalleryImageViewSet, basename='admin-gallery')
router.register(r'admin/site-settings', views.AdminSiteSettingViewSet, basename='admin-site-settings')
router.register(r'admin/pages', views.AdminPageCMSViewSet, basename='admin-pages')
router.register(r'admin/page-assets', views.AdminPageCMSAssetViewSet, basename='admin-page-assets')

urlpatterns = [
    # Public
    path('hero-slides/', views.HeroSlideListView.as_view(), name='hero-slides'),
    path('news/', views.NewsPostListView.as_view(), name='news-list'),
    path('news/<slug:slug>/', views.NewsPostDetailView.as_view(), name='news-detail'),
    path('faq/', views.FAQListView.as_view(), name='faq-list'),
    path('testimonials/', views.TestimonialListView.as_view(), name='testimonials'),
    path('team/', views.TeamMemberListView.as_view(), name='team'),
    path('gallery/', views.GalleryImageListView.as_view(), name='gallery'),
    path('site-settings/', views.SiteSettingPublicView.as_view(), name='site-settings'),
    path('pages/<slug:slug>/', views.PageCMSDetailView.as_view(), name='pages-detail'),
    # Admin (router)
    path('', include(router.urls)),
]
