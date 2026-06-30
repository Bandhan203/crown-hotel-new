from django.core.management.base import BaseCommand

from corporate.models import AgentCommission, CorporateAccount, TravelAgent


class Command(BaseCommand):
  help = 'Seed demo corporate accounts and travel agents'

  def handle(self, *args, **options):
    accounts = [
      dict(company_code='GP01', company_name='Grameenphone Ltd.', contact_person='Tanvir Ahmed',
           contact_phone='01711900001', office_phone='09600000001', contact_email='tanvir@gp.com.bd',
           negotiated_discount_pct=15, credit_limit=500000, notes='Corporate account. Monthly invoice.'),
      dict(company_code='BRAC01', company_name='BRAC', contact_person='Nasrin Sultana',
           contact_phone='01711900002', office_phone='02-8824180', contact_email='nasrin@brac.net',
           negotiated_discount_pct=10, credit_limit=300000, notes='NGO rate.'),
      dict(company_code='SQ01', company_name='Square Group', contact_person='Rahim Chowdhury',
           contact_phone='01711900003', negotiated_discount_pct=20, credit_limit=1000000),
    ]
    for data in accounts:
      CorporateAccount.objects.get_or_create(company_code=data['company_code'], defaults=data)

    agents = [
      dict(name='Booking.com', agent_type='OTA', commission_rate=15, email='partner@booking.com'),
      dict(name='Expedia', agent_type='OTA', commission_rate=12, email='partner@expedia.com'),
      dict(name='Cox Travel Agency', agent_type='TA', commission_rate=8, contact_person='Kabir Hassan', phone='01811000001'),
    ]
    for data in agents:
      TravelAgent.objects.get_or_create(name=data['name'], defaults=data)

    agent = TravelAgent.objects.filter(name='Booking.com').first()
    if agent and not AgentCommission.objects.filter(agent=agent, booking_ref='DEMO-001').exists():
      from datetime import date, timedelta
      AgentCommission.objects.create(
        agent=agent, booking_ref='DEMO-001', commission_date=date.today() - timedelta(days=1),
        booking_amount=15000, commission_amount=2250, status='PENDING',
      )

    self.stdout.write(self.style.SUCCESS('Corporate CRM seed complete'))
