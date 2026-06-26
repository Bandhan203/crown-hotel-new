from django.conf import settings
from django.db import models
from django.utils.text import slugify


class HeroSlide(models.Model):
    subtitle = models.CharField(max_length=200, blank=True, default='')
    title = models.CharField(max_length=200)
    background_image = models.ImageField(upload_to='hero/')
    cta_text = models.CharField(max_length=100, blank=True, default='')
    cta_link = models.CharField(max_length=255, blank=True, default='')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.title


class NewsPost(models.Model):
    title = models.CharField(max_length=300)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    category = models.CharField(max_length=100, blank=True, default='')
    content = models.TextField()
    excerpt = models.TextField(max_length=500, blank=True, default='')
    image = models.ImageField(upload_to='news/', blank=True, null=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts'
    )
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class FAQ(models.Model):
    question = models.CharField(max_length=500)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'
        ordering = ['order']

    def __str__(self):
        return self.question


class Testimonial(models.Model):
    guest_name = models.CharField(max_length=200)
    guest_role = models.CharField(max_length=200, blank=True, default='')
    content = models.TextField()
    avatar = models.ImageField(upload_to='testimonials/', blank=True, null=True)
    rating = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return f"{self.guest_name} — {self.rating}★"


class TeamMember(models.Model):
    name = models.CharField(max_length=200)
    role = models.CharField(max_length=200)
    image = models.ImageField(upload_to='team/', blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    social_links = models.JSONField(default=dict, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name


class GalleryImage(models.Model):
    class Category(models.TextChoices):
        ROOMS = 'ROOMS', 'Rooms'
        RESTAURANT = 'RESTAURANT', 'Restaurant'
        SPA = 'SPA', 'Spa'
        POOL = 'POOL', 'Pool'
        EXTERIOR = 'EXTERIOR', 'Exterior'

    image = models.ImageField(upload_to='gallery/')
    category = models.CharField(max_length=20, choices=Category.choices)
    title = models.CharField(max_length=200, blank=True, default='')
    description = models.TextField(blank=True, default='')
    alt_text = models.CharField(max_length=255, blank=True, default='')
    is_published = models.BooleanField(default=False)
    caption = models.CharField(max_length=255, blank=True, default='')
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return f"{self.category} — {self.caption or self.id}"


class SiteSetting(models.Model):
    name = models.CharField(max_length=255, default="Global Site Settings")
    
    # Branding
    site_name = models.CharField(max_length=255, default="Hotel Crown")
    light_logo = models.ImageField(upload_to='settings/', null=True, blank=True)
    dark_logo = models.ImageField(upload_to='settings/', null=True, blank=True)
    favicon = models.ImageField(upload_to='settings/', null=True, blank=True)
    
    # Contact Info
    contact_phone = models.CharField(max_length=50, blank=True)
    contact_email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    map_embed_url = models.TextField(blank=True, help_text="Google Maps iframe src URL")
    
    # Social Links
    social_links = models.JSONField(default=dict, blank=True, help_text="Format: {'facebook': 'url', 'twitter': 'url'}")

    class Meta:
        verbose_name = "Global Site Setting"
        verbose_name_plural = "Global Site Settings"
        
    def save(self, *args, **kwargs):
        self.pk = 1  # Force single row
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class PageCMS(models.Model):
    PAGE_CHOICES = (
        ('home', 'Home'),
        ('about', 'About'),
        ('faq', 'FAQ'),
        ('rooms', 'Rooms'),
        ('news', 'News'),
        ('contact', 'Contact'),
    )
    page_slug = models.CharField(max_length=50, choices=PAGE_CHOICES, unique=True)
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=200, blank=True)
    hero_image = models.ImageField(upload_to='pages/hero/', null=True, blank=True)
    meta_description = models.CharField(max_length=255, blank=True, help_text="For SEO purposes")
    extra_content = models.JSONField(default=dict, blank=True, help_text="Dynamic section blocks")
    
    class Meta:
        verbose_name = "Page Content"
        verbose_name_plural = "Page Contents"

    def __str__(self):
        return f"Page: {self.get_page_slug_display()}"
