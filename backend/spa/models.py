from django.db import models


class SpaService(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=8, decimal_places=2)
    duration = models.PositiveIntegerField(help_text='Duration in minutes', default=60)
    image = models.ImageField(upload_to='spa/', blank=True, null=True)
    is_available = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
