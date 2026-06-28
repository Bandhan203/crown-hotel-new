from django.db import models


class MenuCategory(models.Model):
    name = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'Menu Categories'
        ordering = ['order']

    def __str__(self):
        return self.name


class MenuItem(models.Model):
    category = models.ForeignKey(MenuCategory, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=8, decimal_places=2)
    image = models.ImageField(upload_to='restaurant/menu/', blank=True, null=True)
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ['category__order', 'name']

    def __str__(self):
        return self.name


class RestaurantGallery(models.Model):
    image = models.ImageField(upload_to='restaurant/gallery/')
    caption = models.CharField(max_length=255, blank=True, default='')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'Restaurant Gallery'
        ordering = ['order']

    def __str__(self):
        return self.caption or f"Image {self.id}"
