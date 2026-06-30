from django.db.models import Sum
from rest_framework import serializers

from .models import AgentCommission, CorporateAccount, TravelAgent


class CorporateAccountSerializer(serializers.ModelSerializer):
  class Meta:
    model = CorporateAccount
    fields = [
      'id', 'company_code', 'company_name', 'trade_name', 'billing_address', 'tax_id',
      'credit_limit', 'payment_terms_days', 'contact_person', 'contact_birthday',
      'contact_email', 'contact_phone', 'office_phone', 'negotiated_discount_pct',
      'default_folio_window', 'status', 'notes', 'created_at', 'updated_at',
    ]
    read_only_fields = ['id', 'created_at', 'updated_at']


class TravelAgentSerializer(serializers.ModelSerializer):
  total_commissions = serializers.SerializerMethodField()
  pending_commissions = serializers.SerializerMethodField()

  class Meta:
    model = TravelAgent
    fields = [
      'id', 'name', 'agent_type', 'commission_rate', 'contact_person', 'phone', 'email',
      'is_active', 'notes', 'total_commissions', 'pending_commissions', 'created_at', 'updated_at',
    ]
    read_only_fields = ['id', 'created_at', 'updated_at']

  def get_total_commissions(self, obj):
    return float(obj.commissions.aggregate(t=Sum('commission_amount'))['t'] or 0)

  def get_pending_commissions(self, obj):
    return float(
      obj.commissions.filter(status=AgentCommission.Status.PENDING)
      .aggregate(t=Sum('commission_amount'))['t'] or 0
    )


class AgentCommissionSerializer(serializers.ModelSerializer):
  agent_name = serializers.CharField(source='agent.name', read_only=True)

  class Meta:
    model = AgentCommission
    fields = [
      'id', 'agent', 'agent_name', 'booking_ref', 'commission_date',
      'booking_amount', 'commission_amount', 'status', 'paid_date', 'notes', 'created_at',
    ]
    read_only_fields = ['id', 'created_at']
