"""Corporate CRM business helpers."""
from decimal import Decimal

from django.db.models import Sum

from bookings.models import Payment


def get_active_corporate_accounts():
  from .models import CorporateAccount
  return CorporateAccount.objects.filter(status=CorporateAccount.Status.ACTIVE).order_by('company_name')


def get_checkout_company_names():
  """Merged list: managed CRM accounts + legacy booking company names."""
  from .models import CorporateAccount
  from bookings.models import Booking

  managed = list(
    CorporateAccount.objects.filter(status=CorporateAccount.Status.ACTIVE)
    .values_list('company_name', flat=True)
  )
  legacy = list(
    Booking.objects.exclude(company_name='')
    .values_list('company_name', flat=True)
    .distinct()
  )
  seen = set()
  merged = []
  for name in managed + sorted(legacy):
    key = name.strip().lower()
    if key and key not in seen:
      seen.add(key)
      merged.append(name.strip())
  return merged[:200]


def assert_corporate_credit_available(company_name: str, amount: Decimal) -> None:
  from .models import CorporateAccount

  if not company_name or amount <= 0:
    return
  account = CorporateAccount.objects.filter(
    company_name__iexact=company_name.strip(),
    status=CorporateAccount.Status.ACTIVE,
  ).first()
  if not account or account.credit_limit <= 0:
    return

  outstanding = Payment.objects.filter(
    payment_method='COMPANY_CREDIT',
    company_name__iexact=company_name.strip(),
  ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

  if outstanding + amount > account.credit_limit:
    raise ValueError(
      f'Company credit limit exceeded for {company_name}. '
      f'Limit BDT {account.credit_limit:.2f}, outstanding BDT {outstanding:.2f}, '
      f'requested BDT {amount:.2f}.'
    )


def resolve_corporate_account(company_name: str):
  from .models import CorporateAccount
  if not company_name:
    return None
  return CorporateAccount.objects.filter(
    company_name__iexact=company_name.strip(),
    status=CorporateAccount.Status.ACTIVE,
  ).first()
