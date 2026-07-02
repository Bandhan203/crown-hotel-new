from django.contrib import admin
from .models import FAQ, GalleryImage, HeroSlide, NewsPost, PageCMS, PageCMSAsset, SiteSetting, TeamMember, Testimonial

@admin.register(HeroSlide)
class HeroSlideAdmin(admin.ModelAdmin):
    list_display = ['title', 'order', 'is_active']
    list_filter = ['is_active']

@admin.register(NewsPost)
class NewsPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'is_published', 'published_at']
    list_filter = ['is_published', 'category']
    search_fields = ['title']
    prepopulated_fields = {'slug': ('title',)}

@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ['question', 'order', 'is_active']
    list_filter = ['is_active']

@admin.register(Testimonial)
class TestimonialAdmin(admin.ModelAdmin):
    list_display = ['guest_name', 'rating', 'is_active']
    list_filter = ['is_active', 'rating']

@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ['name', 'role', 'order']
    search_fields = ['name']

@admin.register(GalleryImage)
class GalleryImageAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'is_published', 'order', 'created_at']
    list_filter = ['category', 'is_published']
    search_fields = ['title', 'description', 'alt_text', 'caption']

@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    list_display = ['name']
    fieldsets = (
        ('Branding', {
            'fields': ('name', 'site_name', 'light_logo', 'dark_logo', 'favicon')
        }),
        ('Contact Information', {
            'fields': ('contact_phone', 'contact_email', 'address', 'map_embed_url')
        }),
        ('Social Links', {
            'fields': ('social_links',),
            'description': 'Enter social links as JSON, e.g., {"facebook": "https://facebook.com/...", "instagram": "..."}'
        }),
    )

    def has_add_permission(self, request):
        if self.model.objects.exists():
            return False
        return super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(PageCMS)
class PageCMSAdmin(admin.ModelAdmin):
    list_display = ['get_page_slug_display', 'title']
    search_fields = ['title', 'page_slug']
    fieldsets = (
        ('Page Identification', {
            'fields': ('page_slug',)
        }),
        ('Header / Hero Section', {
            'fields': ('title', 'subtitle', 'hero_image')
        }),
        ('SEO Options', {
            'fields': ('meta_description',)
        }),
        ('Dynamic Content', {
            'fields': ('extra_content',),
            'description': 'Store page-specific dynamic blocks as JSON'
        }),
    )


@admin.register(PageCMSAsset)
class PageCMSAssetAdmin(admin.ModelAdmin):
    list_display = ['page', 'key', 'alt_text', 'updated_at']
    list_filter = ['page']
    search_fields = ['key', 'alt_text', 'page__page_slug']
