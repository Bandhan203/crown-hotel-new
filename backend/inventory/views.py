from decimal import Decimal

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffUser

from .models import Item, ItemCategory, Requisition, StockTransaction
from .serializers import (
    ItemCategorySerializer,
    ItemSerializer,
    RequisitionCreateSerializer,
    RequisitionSerializer,
    StockAdjustmentSerializer,
    StockInSerializer,
    StockTransactionSerializer,
)

InventoryPermission = IsStaffUser


class ItemCategoryListCreateView(generics.ListCreateAPIView):
    queryset = ItemCategory.objects.all()
    serializer_class = ItemCategorySerializer
    permission_classes = [InventoryPermission]


class ItemListCreateView(generics.ListCreateAPIView):
    serializer_class = ItemSerializer
    permission_classes = [InventoryPermission]
    search_fields = ['name', 'code', 'category__name']

    def get_queryset(self):
        qs = Item.objects.select_related('category').all()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category_id=category)
        if self.request.query_params.get('low_stock') in ('1', 'true', 'yes'):
            qs = qs.filter(current_stock__lte=F('min_stock_level'))
        return qs


class ItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Item.objects.select_related('category').all()
    serializer_class = ItemSerializer
    permission_classes = [InventoryPermission]


class RequisitionListCreateView(generics.ListCreateAPIView):
    permission_classes = [InventoryPermission]

    def get_queryset(self):
        qs = Requisition.objects.prefetch_related('items__item').select_related(
            'requested_by', 'approved_by'
        ).all()
        status_filter = self.request.query_params.get('status')
        department = self.request.query_params.get('department')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if department:
            qs = qs.filter(department__icontains=department)
        return qs

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RequisitionCreateSerializer
        return RequisitionSerializer

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)


class RequisitionDetailView(generics.RetrieveAPIView):
    queryset = Requisition.objects.prefetch_related('items__item').all()
    serializer_class = RequisitionSerializer
    permission_classes = [InventoryPermission]


class RequisitionApproveView(APIView):
    """Approve requisition — atomic stock deduction with insufficient-stock guard."""
    permission_classes = [InventoryPermission]

    @transaction.atomic
    def post(self, request, pk):
        try:
            req = Requisition.objects.prefetch_related('items__item').select_for_update().get(pk=pk)
        except Requisition.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if req.status != Requisition.Status.PENDING:
            return Response(
                {'detail': 'Only PENDING requisitions can be approved.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shortages = []
        for req_item in req.items.all():
            item = Item.objects.select_for_update().get(pk=req_item.item_id)
            if item.current_stock < req_item.quantity:
                shortages.append({
                    'item': item.name,
                    'requested': float(req_item.quantity),
                    'available': float(item.current_stock),
                })

        if shortages:
            return Response(
                {'detail': 'Insufficient stock for one or more items.', 'shortages': shortages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for req_item in req.items.all():
            item = Item.objects.select_for_update().get(pk=req_item.item_id)
            item.current_stock -= req_item.quantity
            item.save(update_fields=['current_stock'])
            StockTransaction.objects.create(
                item=item,
                transaction_type=StockTransaction.TransactionType.OUT,
                quantity=req_item.quantity,
                reference=f'REQ-{req.id}',
                created_by=request.user,
            )

        req.status = Requisition.Status.APPROVED
        req.approved_by = request.user
        req.approved_at = timezone.now()
        req.save(update_fields=['status', 'approved_by', 'approved_at'])

        return Response(RequisitionSerializer(req).data)


class RequisitionRejectView(APIView):
    permission_classes = [InventoryPermission]

    def post(self, request, pk):
        try:
            req = Requisition.objects.get(pk=pk)
        except Requisition.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if req.status != Requisition.Status.PENDING:
            return Response(
                {'detail': 'Only PENDING requisitions can be rejected.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        req.status = Requisition.Status.REJECTED
        req.approved_by = request.user
        req.approved_at = timezone.now()
        req.save(update_fields=['status', 'approved_by', 'approved_at'])
        return Response({'detail': 'Requisition rejected.'})


class StockInView(APIView):
    """Record stock purchase (IN)."""
    permission_classes = [InventoryPermission]

    @transaction.atomic
    def post(self, request):
        serializer = StockInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = Item.objects.select_for_update().get(pk=serializer.validated_data['item'].pk)
        qty = serializer.validated_data['quantity']
        ref = serializer.validated_data.get('reference', '')
        unit_price = serializer.validated_data.get('unit_price')

        item.current_stock += qty
        if unit_price is not None:
            item.unit_price = unit_price
            item.save(update_fields=['current_stock', 'unit_price'])
        else:
            item.save(update_fields=['current_stock'])

        transaction_row = StockTransaction.objects.create(
            item=item,
            transaction_type=StockTransaction.TransactionType.IN,
            quantity=qty,
            reference=ref,
            created_by=request.user,
        )
        return Response(StockTransactionSerializer(transaction_row).data, status=status.HTTP_201_CREATED)


class StockAdjustmentView(APIView):
    """Manual stock correction (+/- quantity)."""
    permission_classes = [InventoryPermission]

    @transaction.atomic
    def post(self, request):
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = Item.objects.select_for_update().get(pk=serializer.validated_data['item'].pk)
        qty = serializer.validated_data['quantity']
        ref = serializer.validated_data.get('reference', 'Manual adjustment')

        new_stock = item.current_stock + qty
        if new_stock < 0:
            return Response(
                {'detail': f'Adjustment would make stock negative (current: {item.current_stock}).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.current_stock = new_stock
        item.save(update_fields=['current_stock'])
        row = StockTransaction.objects.create(
            item=item,
            transaction_type=StockTransaction.TransactionType.ADJUSTMENT,
            quantity=abs(qty),
            reference=ref,
            created_by=request.user,
        )
        return Response(StockTransactionSerializer(row).data, status=status.HTTP_201_CREATED)


class StockLedgerView(generics.ListAPIView):
    serializer_class = StockTransactionSerializer
    permission_classes = [InventoryPermission]

    def get_queryset(self):
        item_id = self.kwargs.get('item_id')
        return StockTransaction.objects.select_related('item', 'created_by').filter(
            item_id=item_id,
        ).order_by('-created_at')


class RecentStockTransactionsView(generics.ListAPIView):
    """Global recent stock movements (purchases, issues)."""
    serializer_class = StockTransactionSerializer
    permission_classes = [InventoryPermission]

    def get_queryset(self):
        qs = StockTransaction.objects.select_related('item', 'created_by').order_by('-created_at')
        tx_type = self.request.query_params.get('type')
        if tx_type:
            qs = qs.filter(transaction_type=tx_type)
        return qs[:100]
