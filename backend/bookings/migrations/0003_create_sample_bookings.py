from django.db import migrations
from decimal import Decimal
import datetime


def create_sample_bookings(apps, schema_editor):
    User = apps.get_model('accounts', 'CustomUser')
    RoomType = apps.get_model('rooms', 'RoomType')
    Room = apps.get_model('rooms', 'Room')
    Booking = apps.get_model('bookings', 'Booking')

    # Ensure a room type exists
    room_type, _ = RoomType.objects.get_or_create(
        slug='sample-single',
        defaults={
            'name': 'Sample Single',
            'price_per_night': Decimal('100.00'),
            'max_guests': 1,
            'beds': 1,
        }
    )

    # Ensure at least one room exists for that type
    room, _ = Room.objects.get_or_create(
        room_number='101',
        defaults={'room_type': room_type, 'floor': 1}
    )

    emails = [
        'guest1@example.com',
        'guest2@example.com',
        'guest3@example.com',
        'guest4@example.com',
        'guest5@example.com',
    ]

    today = datetime.date.today()

    for i, email in enumerate(emails):
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            continue

        check_in = today + datetime.timedelta(days=i)
        check_out = check_in + datetime.timedelta(days=1)

        total_price = room_type.price_per_night

        Booking.objects.create(
            guest=user,
            room_type=room_type,
            room=room,
            check_in_date=check_in,
            check_out_date=check_out,
            adults=1,
            children=0,
            total_price=total_price,
            grand_total=total_price,
            status='CONFIRMED',
            booking_source='WEBSITE',
        )


def remove_sample_bookings(apps, schema_editor):
    Booking = apps.get_model('bookings', 'Booking')
    Room = apps.get_model('rooms', 'Room')
    RoomType = apps.get_model('rooms', 'RoomType')

    Booking.objects.filter(guest__email__in=[
        'guest1@example.com',
        'guest2@example.com',
        'guest3@example.com',
        'guest4@example.com',
        'guest5@example.com',
    ]).delete()

    # Optionally remove sample room and type if desired
    Room.objects.filter(room_number='101').delete()
    RoomType.objects.filter(slug='sample-single').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0002_booking_actual_check_in_booking_actual_check_out_and_more'),
        ('accounts', '0003_add_sample_guests'),
        ('rooms', '0002_room_housekeeping_status_room_is_smoking_and_more'),
    ]

    operations = [
        migrations.RunPython(create_sample_bookings, remove_sample_bookings),
    ]
