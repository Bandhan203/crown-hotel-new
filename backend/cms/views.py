from rest_framework import generics, permissions, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from accounts.permissions import IsAdmin
from .models import FAQ, GalleryImage, HeroSlide, NewsPost, PageCMS, PageCMSAsset, SiteSetting, TeamMember, Testimonial
from .serializers import (
    FAQSerializer,
    GalleryImageSerializer,
    HeroSlideSerializer,
    NewsPostAdminSerializer,
    NewsPostDetailSerializer,
    NewsPostListSerializer,
    PageCMSSerializer,
    PageCMSAdminSerializer,
    PageCMSAssetSerializer,
    SiteSettingSerializer,
    SiteSettingAdminSerializer,
    TeamMemberSerializer,
    TestimonialSerializer,
)


# ══════════════════════════════════════════════
# PUBLIC VIEWS
# ══════════════════════════════════════════════

class HeroSlideListView(generics.ListAPIView):
    """GET /api/hero-slides/"""
    queryset = HeroSlide.objects.filter(is_active=True)
    serializer_class = HeroSlideSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class NewsPostListView(generics.ListAPIView):
    """GET /api/news/"""
    queryset = NewsPost.objects.filter(is_published=True).select_related('author')
    serializer_class = NewsPostListSerializer
    permission_classes = [permissions.AllowAny]
    search_fields = ['title', 'category']
    ordering_fields = ['published_at', 'title']


class NewsPostDetailView(generics.RetrieveAPIView):
    """GET /api/news/{slug}/"""
    queryset = NewsPost.objects.filter(is_published=True).select_related('author')
    serializer_class = NewsPostDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'


class FAQListView(generics.ListAPIView):
    """GET /api/faq/"""
    queryset = FAQ.objects.filter(is_active=True)
    serializer_class = FAQSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class TestimonialListView(generics.ListAPIView):
    """GET /api/testimonials/"""
    queryset = Testimonial.objects.filter(is_active=True)
    serializer_class = TestimonialSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class TeamMemberListView(generics.ListAPIView):
    """GET /api/team/"""
    queryset = TeamMember.objects.all()
    serializer_class = TeamMemberSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class GalleryImageListView(generics.ListAPIView):
    """GET /api/gallery/"""
    queryset = GalleryImage.objects.filter(is_published=True)
    serializer_class = GalleryImageSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['category']
    pagination_class = None


class SiteSettingPublicView(generics.RetrieveAPIView):
    """GET /api/site-settings/ -> Returns the singleton object"""
    serializer_class = SiteSettingSerializer
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        return SiteSetting.objects.first()


class PageCMSDetailView(generics.RetrieveAPIView):
    """GET /api/pages/<slug>/ -> Returns Page data + Global Settings in 1 query"""
    queryset = PageCMS.objects.all()
    serializer_class = PageCMSSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'page_slug'
    lookup_url_kwarg = 'slug'

    def retrieve(self, request, *args, **kwargs):
        # Get page content
        try:
            page = self.get_object()
            page_data = self.get_serializer(page).data
        except:
            # Fallback for missing pages to prevent 404s
            page_data = {"page_slug": kwargs.get('slug'), "title": "Page Not Found", "extra_content": {}}
        
        # Get global settings
        site_settings = SiteSetting.objects.first()
        settings_data = SiteSettingSerializer(site_settings, context={'request': request}).data if site_settings else {}
        assets = {}
        if page_data.get("page_slug"):
            for asset in PageCMSAsset.objects.filter(page__page_slug=page_data["page_slug"]):
                assets[asset.key] = PageCMSAssetSerializer(asset, context={'request': request}).data
        
        return Response({
            "page": page_data,
            "global_settings": settings_data,
            "assets": assets,
        })


# ══════════════════════════════════════════════
# ADMIN VIEWS
# ══════════════════════════════════════════════

class AdminHeroSlideViewSet(viewsets.ModelViewSet):
    queryset = HeroSlide.objects.all()
    serializer_class = HeroSlideSerializer
    permission_classes = [IsAdmin]


class AdminNewsPostViewSet(viewsets.ModelViewSet):
    queryset = NewsPost.objects.select_related('author')
    serializer_class = NewsPostAdminSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['is_published', 'category']
    search_fields = ['title']
    ordering_fields = ['published_at', 'created_at']


class AdminFAQViewSet(viewsets.ModelViewSet):
    queryset = FAQ.objects.all()
    serializer_class = FAQSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['is_active']
    search_fields = ['question', 'answer']
    ordering_fields = ['order', 'id']


class AdminTestimonialViewSet(viewsets.ModelViewSet):
    queryset = Testimonial.objects.all()
    serializer_class = TestimonialSerializer
    permission_classes = [IsAdmin]


class AdminTeamMemberViewSet(viewsets.ModelViewSet):
    queryset = TeamMember.objects.all()
    serializer_class = TeamMemberSerializer
    permission_classes = [IsAdmin]


class AdminGalleryImageViewSet(viewsets.ModelViewSet):
    queryset = GalleryImage.objects.all()
    serializer_class = GalleryImageSerializer
    permission_classes = [IsAdmin]
    filterset_fields = ['category', 'is_published']
    search_fields = ['title', 'description', 'alt_text', 'caption']
    ordering_fields = ['created_at', 'updated_at', 'order']


class AdminSiteSettingViewSet(viewsets.ModelViewSet):
    queryset = SiteSetting.objects.all()
    serializer_class = SiteSettingAdminSerializer
    permission_classes = [IsAdmin]

class AdminPageCMSViewSet(viewsets.ModelViewSet):
    queryset = PageCMS.objects.all()
    serializer_class = PageCMSAdminSerializer
    permission_classes = [IsAdmin]
    lookup_field = 'page_slug'


class AdminPageCMSAssetViewSet(viewsets.ModelViewSet):
    queryset = PageCMSAsset.objects.select_related('page')
    serializer_class = PageCMSAssetSerializer
    permission_classes = [IsAdmin]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['page', 'key']
