from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Item, ItemCategory, Requisition, StockTransaction
from .serializers import (
    ItemCategorySerializer, ItemSerializer, RequisitionSerializer,
    RequisitionCreateSerializer, StockInSerializer, StockTransactionSerializer,
)


class ItemCategoryListCreateView(generics.ListCreateAPIView):
    queryset = ItemCategory.objects.all()
    serializer_class = ItemCategorySerializer
    permission_classes = [IsAuthenticated]


class ItemListCreateView(generics.ListCreateAPIView):
    queryset = Item.objects.select_related('category').all()
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]
    search_fields = ['name', 'category__name']
    filterset_fields = ['category']


class ItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]


class RequisitionListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'department']

    def get_queryset(self):
        return Requisition.objects.prefetch_related('items__item').select_related(
            'requested_by', 'approved_by'
        ).all()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return RequisitionCreateSerializer
        return RequisitionSerializer

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)


class RequisitionDetailView(generics.RetrieveAPIView):
    queryset = Requisition.objects.prefetch_related('items__item').all()
    serializer_class = RequisitionSerializer
    permission_classes = [IsAuthenticated]


class RequisitionApproveView(APIView):
    """Approve a requisition — deducts stock for each item."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            req = Requisition.objects.prefetch_related('items__item').get(pk=pk)
        except Requisition.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if req.status != 'PENDING':
            return Response({'detail': 'Only PENDING requisitions can be approved.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Deduct stock and create stock-out transactions
        for req_item in req.items.all():
            item = req_item.item
            item.current_stock = max(0, item.current_stock - req_item.quantity)
            item.save()
            StockTransaction.objects.create(
                item=item,
                transaction_type='OUT',
                quantity=req_item.quantity,
                reference=f'REQ-{req.id}',
                created_by=request.user,
            )

        req.status = 'APPROVED'
        req.approved_by = request.user
        req.approved_at = timezone.now()
        req.save()

        return Response(RequisitionSerializer(req).data)


class RequisitionRejectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            req = Requisition.objects.get(pk=pk)
        except Requisition.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        if req.status != 'PENDING':
            return Response({'detail': 'Only PENDING requisitions can be rejected.'},
                            status=status.HTTP_400_BAD_REQUEST)

        req.status = 'REJECTED'
        req.approved_by = request.user
        req.approved_at = timezone.now()
        req.save()
        return Response({'detail': 'Requisition rejected.'})


class StockInView(APIView):
    """Record a stock purchase (stock in)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = StockInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.validated_data['item']
        qty = serializer.validated_data['quantity']
        ref = serializer.validated_data.get('reference', '')

        item.current_stock += qty
        item.save()

        transaction = StockTransaction.objects.create(
            item=item,
            transaction_type='IN',
            quantity=qty,
            reference=ref,
            created_by=request.user,
        )
        return Response(StockTransactionSerializer(transaction).data, status=status.HTTP_201_CREATED)


class StockLedgerView(generics.ListAPIView):
    serializer_class = StockTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        item_id = self.kwargs.get('item_id')
        return StockTransaction.objects.select_related('item', 'created_by').filter(
            item_id=item_id
        ).order_by('-created_at')
