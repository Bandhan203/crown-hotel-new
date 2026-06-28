import django_filters

from .models import RoomType


class RoomTypeFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name='price_per_night', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price_per_night', lookup_expr='lte')
    guests = django_filters.NumberFilter(field_name='max_guests', lookup_expr='gte')

    class Meta:
        model = RoomType
        fields = ['is_featured', 'view_type']
