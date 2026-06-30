from django.db import models


class CorporateAccount(models.Model):
  class Status(models.TextChoices):
    ACTIVE = 'ACTIVE', 'Active'
    SUSPENDED = 'SUSPENDED', 'Suspended'
    INACTIVE = 'INACTIVE', 'Inactive'

  company_code = models.CharField(max_length=20, unique=True)
  company_name = models.CharField(max_length=200, db_index=True)
  trade_name = models.CharField(max_length=200, blank=True, default='')
  billing_address = models.TextField(blank=True, default='')
  tax_id = models.CharField(max_length=50, blank=True, default='')
  credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
  payment_terms_days = models.PositiveIntegerField(default=30)
  contact_person = models.CharField(max_length=200, blank=True, default='')
  contact_birthday = models.DateField(null=True, blank=True)
  contact_email = models.EmailField(blank=True, default='')
  contact_phone = models.CharField(max_length=20, blank=True, default='')
  office_phone = models.CharField(max_length=20, blank=True, default='')
  negotiated_discount_pct = models.DecimalField(max_digits=5, decimal_places=2, default=0)
  default_folio_window = models.PositiveSmallIntegerField(default=2)
  status = models.CharField(max_length=15, choices=Status.choices, default=Status.ACTIVE)
  notes = models.TextField(blank=True, default='')
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ['company_name']

  def __str__(self):
    return f'{self.company_code} — {self.company_name}'


class TravelAgent(models.Model):
  class AgentType(models.TextChoices):
    OTA = 'OTA', 'OTA'
    TA = 'TA', 'Travel Agent'
    CORPORATE = 'CORPORATE', 'Corporate'
    WALK_IN = 'WALK_IN', 'Walk-in'

  name = models.CharField(max_length=200)
  agent_type = models.CharField(max_length=15, choices=AgentType.choices, default=AgentType.TA)
  commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
  contact_person = models.CharField(max_length=200, blank=True, default='')
  phone = models.CharField(max_length=20, blank=True, default='')
  email = models.EmailField(blank=True, default='')
  is_active = models.BooleanField(default=True)
  notes = models.TextField(blank=True, default='')
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

  class Meta:
    ordering = ['name']

  def __str__(self):
    return self.name


class AgentCommission(models.Model):
  class Status(models.TextChoices):
    PENDING = 'PENDING', 'Pending'
    PAID = 'PAID', 'Paid'

  agent = models.ForeignKey(TravelAgent, on_delete=models.CASCADE, related_name='commissions')
  booking_ref = models.CharField(max_length=30, blank=True, default='')
  commission_date = models.DateField()
  booking_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
  commission_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
  status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
  paid_date = models.DateField(null=True, blank=True)
  notes = models.TextField(blank=True, default='')
  created_at = models.DateTimeField(auto_now_add=True)

  class Meta:
    ordering = ['-commission_date', '-id']

  def __str__(self):
    return f'{self.agent.name} — {self.commission_amount}'
