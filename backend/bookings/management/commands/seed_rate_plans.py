from datetime import date, timedelta

from django.core.management.base import BaseCommand

from bookings.models import RatePlan
from rooms.models import RoomType


class Command(BaseCommand):
    help = 'Seed standard rate plans (BAR, weekend, long-stay)'

    def handle(self, *args, **options):
        today = date.today()
        all_types = list(RoomType.objects.all())
        type_ids = [rt.id for rt in all_types]

        plans = [
            dict(
                name='Standard Rate',
                code='STD',
                description='Best available rate — no discount.',
                discount_type='PERCENTAGE',
                discount_value=0,
                min_nights=1,
                is_active=True,
            ),
            dict(
                name='Weekend Special',
                code='WKND',
                description='10% off Friday–Sunday check-ins.',
                discount_type='PERCENTAGE',
                discount_value=10,
                min_nights=2,
                valid_from=today,
                valid_to=today + timedelta(days=365),
                is_active=True,
            ),
            dict(
                name='Long Stay',
                code='LONG7',
                description='15% off stays of 7 nights or more.',
                discount_type='PERCENTAGE',
                discount_value=15,
                min_nights=7,
                is_active=True,
            ),
            dict(
                name='Early Bird',
                code='EARLY',
                description='BDT 500 off per night when booked 14+ days ahead.',
                discount_type='FIXED',
                discount_value=500,
                min_nights=1,
                is_active=True,
            ),
        ]

        created = 0
        for data in plans:
            plan, was_created = RatePlan.objects.get_or_create(code=data['code'], defaults=data)
            if was_created:
                created += 1
            if type_ids and not plan.room_types.exists():
                plan.room_types.set(type_ids)

        self.stdout.write(self.style.SUCCESS(
            f'Rate plans seed done — {created} new, {RatePlan.objects.count()} total',
        ))
