from django.conf import settings
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


# ── F&B → PMS Folio Bridge ─────────────────────────────────────────────────

class RestaurantOrder(models.Model):
    """Links an F&B order to a guest booking for folio posting."""

    class OrderType(models.TextChoices):
        DINE_IN = 'DINE_IN', 'Dine In'
        ROOM_SERVICE = 'ROOM_SERVICE', 'Room Service'
        TAKEAWAY = 'TAKEAWAY', 'Takeaway'

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        SERVED = 'SERVED', 'Served'
        POSTED = 'POSTED', 'Posted to Folio'
        CANCELLED = 'CANCELLED', 'Cancelled'

    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='restaurant_orders',
        help_text='Linked booking for folio posting (leave blank for non-resident orders)',
    )
    room = models.ForeignKey(
        'rooms.Room',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='restaurant_orders',
    )
    order_type = models.CharField(max_length=20, choices=OrderType.choices, default=OrderType.DINE_IN)
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)
    order_date = models.DateField(auto_now_add=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True, default='')
    posted_to_folio = models.BooleanField(default=False)
    folio_charge = models.OneToOneField(
        'bookings.FolioCharge',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='restaurant_order',
        help_text='The folio charge created when posting to the guest bill',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='restaurant_orders_created',
    )
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='restaurant_orders_posted',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        booking_ref = self.booking.booking_ref if self.booking else 'Walk-in'
        return f"Order #{self.id} ({booking_ref}) — {self.total}"

    def recalculate_total(self):
        """Recompute totals from line items."""
        from django.db.models import Sum
        subtotal = self.items.aggregate(t=Sum('total'))['t'] or 0
        self.subtotal = subtotal
        self.total = subtotal + self.tax_amount
        self.save(update_fields=['subtotal', 'total', 'updated_at'])


class RestaurantOrderItem(models.Model):
    """A single line item within a RestaurantOrder."""
    order = models.ForeignKey(RestaurantOrder, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(
        MenuItem,
        on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    name = models.CharField(max_length=200, help_text='Snapshot of menu item name at order time')
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity}x {self.name} @ {self.unit_price}"

    def save(self, *args, **kwargs):
        self.total = self.unit_price * self.quantity
        if not self.name and self.menu_item:
            self.name = self.menu_item.name
        super().save(*args, **kwargs)
