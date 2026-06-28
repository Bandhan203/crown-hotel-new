from django.db import models


class HotelService(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=100, blank=True, default='', help_text='Icon class name e.g. MdRestaurant')
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return self.name


class Facility(models.Model):
    class Category(models.TextChoices):
        COMPLIMENTARY = 'COMPLIMENTARY', 'Complimentary Services'
        GENERAL = 'GENERAL', 'General Facilities'
        FEATURE = 'FEATURE', 'Feature Highlight'

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=100, blank=True, default='')
    image = models.ImageField(upload_to='facilities/', blank=True, null=True)
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.GENERAL,
    )
    subtitle = models.CharField(max_length=100, blank=True, default='')
    link = models.CharField(max_length=255, blank=True, default='')
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'Facilities'
        ordering = ['order']

    def __str__(self):
        return self.name
