from django.db import models
from django.conf import settings

class ItemCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')

    def __str__(self):
        return self.name

class Item(models.Model):
    category = models.ForeignKey(ItemCategory, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=200)
    unit = models.CharField(max_length=50, help_text='e.g., kg, pieces, liters')
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    current_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_stock_level = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} ({self.category.name})"

class Requisition(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        COMPLETED = 'COMPLETED', 'Completed'

    department = models.CharField(max_length=100)
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='requisitions')
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_requisitions')

    def __str__(self):
        return f"Req #{self.id} - {self.department}"

class RequisitionItem(models.Model):
    requisition = models.ForeignKey(Requisition, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.item.name}"

class StockTransaction(models.Model):
    class TransactionType(models.TextChoices):
        IN = 'IN', 'Stock In (Purchase)'
        OUT = 'OUT', 'Stock Out (Requisition)'
        ADJUSTMENT = 'ADJUSTMENT', 'Adjustment'

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=15, choices=TransactionType.choices)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.item.name} ({self.quantity})"
