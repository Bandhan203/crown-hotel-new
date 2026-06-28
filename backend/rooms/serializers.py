from rest_framework import serializers

from .models import Room, RoomAmenity, RoomImage, RoomType, HousekeepingTask


class RoomAmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomAmenity
        fields = ['id', 'name', 'icon']


class RoomImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomImage
        fields = ['id', 'room_type', 'image', 'is_primary', 'order']
        extra_kwargs = {
            'room_type': {'write_only': True},
        }


class RoomTypeListSerializer(serializers.ModelSerializer):
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = RoomType
        fields = ['id', 'name', 'slug', 'price_per_night', 'max_guests', 'beds', 'size', 'view_type', 'is_featured', 'primary_image']

    def get_primary_image(self, obj):
        img = obj.images.filter(is_primary=True).first() or obj.images.first()
        if img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(img.image.url)
            return img.image.url
        return None


class RoomTypeDetailSerializer(serializers.ModelSerializer):
    images = RoomImageSerializer(many=True, read_only=True)
    amenities = RoomAmenitySerializer(many=True, read_only=True)
    available_rooms = serializers.SerializerMethodField()

    class Meta:
        model = RoomType
        fields = [
            'id', 'name', 'slug', 'description', 'price_per_night',
            'max_guests', 'beds', 'size', 'view_type', 'is_featured',
            'amenities', 'images', 'available_rooms', 'created_at', 'updated_at',
        ]

    def get_available_rooms(self, obj):
        return obj.rooms.filter(status='AVAILABLE').count()


# ── Admin serializers ────────────────────────

class RoomTypeAdminSerializer(serializers.ModelSerializer):
    room_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = RoomType
        fields = [
            'id', 'name', 'slug', 'description', 'price_per_night',
            'max_guests', 'beds', 'size', 'view_type', 'is_featured',
            'amenities', 'created_at', 'updated_at', 'room_count',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'room_count']

    def validate_price_per_night(self, value):
        if value <= 0:
            raise serializers.ValidationError('Rack rate must be greater than zero.')
        return value

    def validate_max_guests(self, value):
        if value < 1:
            raise serializers.ValidationError('Max guests must be at least 1.')
        return value

    def validate_beds(self, value):
        if value < 1:
            raise serializers.ValidationError('Beds must be at least 1.')
        return value


class RoomSerializer(serializers.ModelSerializer):
    room_type_name = serializers.CharField(source='room_type.name', read_only=True)
    max_guests = serializers.IntegerField(source='room_type.max_guests', read_only=True)
    rack_rate = serializers.DecimalField(
        source='room_type.price_per_night', max_digits=10, decimal_places=2, read_only=True,
    )

    class Meta:
        model = Room
        fields = [
            'id', 'room_type', 'room_type_name', 'max_guests', 'rack_rate',
            'room_number', 'floor', 'status', 'housekeeping_status',
            'last_cleaned_at', 'is_smoking', 'notes',
        ]


class HousekeepingTaskSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source='room.room_number', read_only=True)
    room_type_name = serializers.CharField(source='room.room_type.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True, default=None)
    inspected_by_name = serializers.CharField(source='inspected_by.full_name', read_only=True, default=None)

    class Meta:
        model = HousekeepingTask
        fields = [
            'id', 'room', 'room_number', 'room_type_name',
            'task_type', 'priority', 'status',
            'assigned_to', 'assigned_to_name', 'notes',
            'scheduled_date', 'started_at', 'completed_at',
            'inspected_by', 'inspected_by_name', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class HousekeepingBoardRoomSerializer(serializers.ModelSerializer):
    room_type_name = serializers.CharField(source='room_type.name', read_only=True)

    class Meta:
        model = Room
        fields = ['id', 'room_number', 'room_type_name', 'floor', 'status',
                  'housekeeping_status', 'last_cleaned_at', 'is_smoking', 'notes']
