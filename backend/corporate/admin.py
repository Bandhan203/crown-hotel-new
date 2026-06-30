from django.contrib import admin

from .models import AgentCommission, CorporateAccount, TravelAgent


@admin.register(CorporateAccount)
class CorporateAccountAdmin(admin.ModelAdmin):
  list_display = ['company_code', 'company_name', 'status', 'credit_limit', 'negotiated_discount_pct']
  list_filter = ['status']
  search_fields = ['company_name', 'company_code', 'contact_person']


@admin.register(TravelAgent)
class TravelAgentAdmin(admin.ModelAdmin):
  list_display = ['name', 'agent_type', 'commission_rate', 'is_active']
  list_filter = ['agent_type', 'is_active']


@admin.register(AgentCommission)
class AgentCommissionAdmin(admin.ModelAdmin):
  list_display = ['agent', 'commission_date', 'commission_amount', 'status']
  list_filter = ['status']
