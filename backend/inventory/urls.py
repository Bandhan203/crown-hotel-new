from django.urls import path
from .views import (
    ItemCategoryListCreateView, ItemListCreateView, ItemDetailView,
    RequisitionListCreateView, RequisitionDetailView,
    RequisitionApproveView, RequisitionRejectView,
    StockInView, StockLedgerView,
)

urlpatterns = [
    # Items
    path('inventory/categories/', ItemCategoryListCreateView.as_view(), name='inventory-categories'),
    path('inventory/items/', ItemListCreateView.as_view(), name='inventory-items'),
    path('inventory/items/<int:pk>/', ItemDetailView.as_view(), name='inventory-item-detail'),
    # Requisitions
    path('inventory/requisitions/', RequisitionListCreateView.as_view(), name='inventory-requisitions'),
    path('inventory/requisitions/<int:pk>/', RequisitionDetailView.as_view(), name='inventory-requisition-detail'),
    path('inventory/requisitions/<int:pk>/approve/', RequisitionApproveView.as_view(), name='inventory-requisition-approve'),
    path('inventory/requisitions/<int:pk>/reject/', RequisitionRejectView.as_view(), name='inventory-requisition-reject'),
    # Stock
    path('inventory/stock-in/', StockInView.as_view(), name='inventory-stock-in'),
    path('inventory/stock-ledger/<int:item_id>/', StockLedgerView.as_view(), name='inventory-stock-ledger'),
]
