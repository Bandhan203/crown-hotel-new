from django.db.models import Sum
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsStaffUser

from .models import AgentCommission, CorporateAccount, TravelAgent
from .serializers import AgentCommissionSerializer, CorporateAccountSerializer, TravelAgentSerializer

CorporatePermission = IsStaffUser


class CorporateAccountListCreateView(generics.ListCreateAPIView):
  queryset = CorporateAccount.objects.all()
  serializer_class = CorporateAccountSerializer
  permission_classes = [CorporatePermission]
  search_fields = ['company_name', 'company_code', 'contact_person']

  def get_queryset(self):
    qs = CorporateAccount.objects.all()
    status_filter = self.request.query_params.get('status')
    if status_filter:
      qs = qs.filter(status=status_filter)
    active_only = self.request.query_params.get('active')
    if active_only in ('1', 'true', 'yes'):
      qs = qs.filter(status=CorporateAccount.Status.ACTIVE)
    return qs


class CorporateAccountDetailView(generics.RetrieveUpdateDestroyAPIView):
  queryset = CorporateAccount.objects.all()
  serializer_class = CorporateAccountSerializer
  permission_classes = [CorporatePermission]


class TravelAgentListCreateView(generics.ListCreateAPIView):
  queryset = TravelAgent.objects.all()
  serializer_class = TravelAgentSerializer
  permission_classes = [CorporatePermission]

  def get_queryset(self):
    qs = TravelAgent.objects.prefetch_related('commissions').all()
    if self.request.query_params.get('active') in ('1', 'true', 'yes'):
      qs = qs.filter(is_active=True)
    return qs


class TravelAgentDetailView(generics.RetrieveUpdateDestroyAPIView):
  queryset = TravelAgent.objects.prefetch_related('commissions').all()
  serializer_class = TravelAgentSerializer
  permission_classes = [CorporatePermission]


class AgentCommissionListCreateView(generics.ListCreateAPIView):
  serializer_class = AgentCommissionSerializer
  permission_classes = [CorporatePermission]

  def get_queryset(self):
    qs = AgentCommission.objects.select_related('agent').all()
    status_filter = self.request.query_params.get('status')
    if status_filter:
      qs = qs.filter(status=status_filter)
    return qs


class AgentCommissionDetailView(generics.RetrieveUpdateAPIView):
  queryset = AgentCommission.objects.select_related('agent').all()
  serializer_class = AgentCommissionSerializer
  permission_classes = [CorporatePermission]


class AgentCommissionMarkPaidView(APIView):
  permission_classes = [CorporatePermission]

  def post(self, request, pk):
    try:
      row = AgentCommission.objects.get(pk=pk)
    except AgentCommission.DoesNotExist:
      return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if row.status == AgentCommission.Status.PAID:
      return Response({'detail': 'Already paid.'}, status=status.HTTP_400_BAD_REQUEST)
    row.status = AgentCommission.Status.PAID
    row.paid_date = timezone.localdate()
    row.save(update_fields=['status', 'paid_date'])
    return Response(AgentCommissionSerializer(row).data)


class CorporateAccountPickerView(APIView):
  """Active accounts for checkout / reservation pickers."""
  permission_classes = [IsAdmin]

  def get(self, request):
    accounts = CorporateAccount.objects.filter(status=CorporateAccount.Status.ACTIVE).order_by('company_name')
    return Response({
      'companies': [
        {
          'id': a.id,
          'company_code': a.company_code,
          'company_name': a.company_name,
          'credit_limit': float(a.credit_limit),
          'negotiated_discount_pct': float(a.negotiated_discount_pct),
        }
        for a in accounts
      ],
    })
