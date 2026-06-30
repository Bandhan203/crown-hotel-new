from django.conf import settings
from django.db import models


class ContactMessage(models.Model):
    class Source(models.TextChoices):
        WEBSITE = 'WEBSITE', 'Website'
        PHONE = 'PHONE', 'Phone'
        WALK_IN = 'WALK_IN', 'Walk-in'
        FACEBOOK = 'FACEBOOK', 'Facebook'
        WHATSAPP = 'WHATSAPP', 'WhatsApp'

    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, default='')
    subject = models.CharField(max_length=300, blank=True, default='')
    message = models.TextField()
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.WEBSITE)
    is_read = models.BooleanField(default=False)
    admin_reply = models.TextField(blank=True, default='')
    replied_at = models.DateTimeField(null=True, blank=True)
    replied_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contact_replies',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    @property
    def is_replied(self):
        return bool(self.admin_reply and self.replied_at)

    def __str__(self):
        return f"{self.name} — {self.subject}"
