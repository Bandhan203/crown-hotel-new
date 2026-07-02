from rest_framework import serializers

from .models import FAQ, GalleryImage, HeroSlide, NewsPost, PageCMS, PageCMSAsset, SiteSetting, TeamMember, Testimonial


# ── Hero Slides ──────────────────────────────

class HeroSlideSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroSlide
        fields = ['id', 'subtitle', 'title', 'background_image', 'cta_text', 'cta_link', 'order', 'is_active']


# ── News ─────────────────────────────────────

class NewsPostListSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True, default=None)

    class Meta:
        model = NewsPost
        fields = ['id', 'title', 'slug', 'category', 'excerpt', 'image', 'author_name', 'published_at']


class NewsPostDetailSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True, default=None)

    class Meta:
        model = NewsPost
        fields = [
            'id', 'title', 'slug', 'category', 'content', 'excerpt',
            'image', 'author', 'author_name', 'is_published', 'published_at',
            'created_at', 'updated_at',
        ]


class NewsPostAdminSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.full_name', read_only=True, default=None)

    class Meta:
        model = NewsPost
        fields = '__all__'


# ── FAQ ──────────────────────────────────────

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer', 'order', 'is_active']


# ── Testimonials ─────────────────────────────

class TestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = ['id', 'guest_name', 'guest_role', 'content', 'avatar', 'rating', 'is_active']


# ── Team ─────────────────────────────────────

class TeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamMember
        fields = ['id', 'name', 'role', 'image', 'bio', 'social_links', 'order']


# ── Gallery ──────────────────────────────────

class GalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GalleryImage
        fields = [
            'id', 'image', 'category', 'title', 'description', 'alt_text',
            'is_published', 'caption', 'order', 'created_at', 'updated_at'
        ]


# ── Site Settings ────────────────────────────

class SiteSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        fields = [
            'site_name', 'light_logo', 'dark_logo', 'favicon',
            'contact_phone', 'contact_email', 'address', 'map_embed_url',
            'social_links'
        ]

class SiteSettingAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        fields = '__all__'


# ── Page CMS ─────────────────────────────────

class PageCMSSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageCMS
        fields = [
            'page_slug', 'title', 'subtitle', 'hero_image',
            'meta_description', 'extra_content'
        ]

class PageCMSAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = PageCMS
        fields = '__all__'


class PageCMSAssetSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = PageCMSAsset
        fields = ['id', 'page', 'key', 'image', 'image_url', 'alt_text', 'updated_at']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url
