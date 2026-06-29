"""
Crown HMS — cms/models.py (Enterprise Blueprint)
================================================
Headless CMS — frontend landing page is 100% API-driven. No hardcoded content.
"""
from django.conf import settings
from django.db import models
from django.utils.text import slugify


class HeroSlide(models.Model):
    """Homepage carousel — served via GET /api/hero-slides/"""
    subtitle = models.CharField(max_length=200, blank=True, default='')
    title = models.CharField(max_length=200)
    background_image = models.ImageField(upload_to='hero/')
    cta_text = models.CharField(max_length=100, blank=True, default='')
    cta_link = models.CharField(max_length=255, blank=True, default='')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ['order']


class Offer(models.Model):
    """Promotional offers block — target addition for landing page."""
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField()
    image = models.ImageField(upload_to='offers/', null=True, blank=True)
    valid_from = models.DateField(null=True, blank=True)
    valid_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)


class NewsPost(models.Model):
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    category = models.CharField(max_length=100, blank=True, default='')
    content = models.TextField()
    excerpt = models.TextField(max_length=500, blank=True, default='')
    image = models.ImageField(upload_to='news/', blank=True, null=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    is_published = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-published_at']


class FAQ(models.Model):
    question = models.CharField(max_length=500)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']


class Testimonial(models.Model):
    guest_name = models.CharField(max_length=200)
    guest_role = models.CharField(max_length=200, blank=True, default='')
    content = models.TextField()
    avatar = models.ImageField(upload_to='testimonials/', blank=True, null=True)
    rating = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True)


class TeamMember(models.Model):
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    image = models.ImageField(upload_to='team/', blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    social_links = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField(default=0)


class GalleryImage(models.Model):
    class Category(models.TextChoices):
        ROOMS = 'ROOMS', 'Rooms'
        RESTAURANT = 'RESTAURANT', 'Restaurant'
        SPA = 'SPA', 'Spa'
        POOL = 'POOL', 'Pool'
        EXTERIOR = 'EXTERIOR', 'Exterior'

    image = models.ImageField(upload_to='gallery/')
    category = models.CharField(max_length=20, choices=Category.choices, db_index=True)
    title = models.CharField(max_length=200, blank=True, default='')
    alt_text = models.CharField(max_length=255, blank=True, default='')
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)


class SiteSetting(models.Model):
    """Singleton — global branding + contact. Frontend bootstraps from GET /api/site-settings/"""

    site_name = models.CharField(max_length=255, default='Crown Hotel')
    light_logo = models.ImageField(upload_to='settings/', null=True, blank=True)
    dark_logo = models.ImageField(upload_to='settings/', null=True, blank=True)
    favicon = models.ImageField(upload_to='settings/', null=True, blank=True)
    contact_phone = models.CharField(max_length=50, blank=True, default='')
    contact_email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    map_embed_url = models.TextField(blank=True, default='')
    social_links = models.JSONField(default=dict, blank=True)

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)


class PageCMS(models.Model):
    """
    Per-page dynamic blocks — React fetches by slug, renders JSON sections.
    Enables zero-deploy content changes from Admin Panel.
    """
    page_slug = models.CharField(max_length=50, unique=True)  # home, about, rooms, contact
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=200, blank=True, default='')
    hero_image = models.ImageField(upload_to='pages/hero/', null=True, blank=True)
    meta_description = models.CharField(max_length=255, blank=True, default='')
    extra_content = models.JSONField(default=dict, blank=True, help_text='Section blocks for headless rendering')
