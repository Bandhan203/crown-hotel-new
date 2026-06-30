from django.core.management.base import BaseCommand

from spa.models import SpaService

SEED = [
    ('Swedish Massage', 'Full body relaxation massage', 60, 2500),
    ('Deep Tissue Massage', 'Therapeutic pressure for muscle tension', 60, 3000),
    ('Aromatherapy', 'Essential oil massage therapy', 75, 3500),
    ('Head & Shoulder', 'Quick relief for neck and shoulder tension', 30, 1200),
    ('Foot Reflexology', 'Pressure point foot therapy', 45, 1500),
    ('Facial Treatment', 'Cleansing and rejuvenating facial', 45, 2000),
    ('Couples Spa Package', 'Side-by-side massage for two', 90, 5500),
]


class Command(BaseCommand):
    help = 'Seed spa services catalog'

    def handle(self, *args, **options):
        created = 0
        for name, desc, duration, price in SEED:
            _, was_created = SpaService.objects.get_or_create(
                name=name,
                defaults={
                    'description': desc,
                    'duration': duration,
                    'price': price,
                    'is_available': True,
                },
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(
            f'Spa seed done — {created} new services, {SpaService.objects.count()} total'
        ))
