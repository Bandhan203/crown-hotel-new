from django.urls import path

from .views import (
  AgentCommissionDetailView,
  AgentCommissionListCreateView,
  AgentCommissionMarkPaidView,
  CorporateAccountDetailView,
  CorporateAccountListCreateView,
  CorporateAccountPickerView,
  TravelAgentDetailView,
  TravelAgentListCreateView,
)

urlpatterns = [
  path('admin/corporate/accounts/', CorporateAccountListCreateView.as_view(), name='corporate-accounts'),
  path('admin/corporate/accounts/<int:pk>/', CorporateAccountDetailView.as_view(), name='corporate-account-detail'),
  path('admin/corporate/accounts/picker/', CorporateAccountPickerView.as_view(), name='corporate-account-picker'),
  path('admin/corporate/agents/', TravelAgentListCreateView.as_view(), name='corporate-agents'),
  path('admin/corporate/agents/<int:pk>/', TravelAgentDetailView.as_view(), name='corporate-agent-detail'),
  path('admin/corporate/commissions/', AgentCommissionListCreateView.as_view(), name='corporate-commissions'),
  path('admin/corporate/commissions/<int:pk>/', AgentCommissionDetailView.as_view(), name='corporate-commission-detail'),
  path('admin/corporate/commissions/<int:pk>/mark-paid/', AgentCommissionMarkPaidView.as_view(), name='corporate-commission-paid'),
]
