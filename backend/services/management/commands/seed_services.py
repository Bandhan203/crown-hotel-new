from django.core.management.base import BaseCommand

from services.models import Facility, HotelService


HOTEL_SERVICES = [
    {'name': 'Elegant Lobby', 'description': 'A welcoming lobby blending elegance, comfort, and sophistication.', 'icon': 'MdMeetingRoom', 'order': 1},
    {'name': 'Banquet Hall', 'description': 'Perfect for weddings, receptions, and corporate events.', 'icon': 'FaGlassCheers', 'order': 2},
    {'name': 'Restaurant', 'description': 'Delightful flavors and exceptional dining experiences.', 'icon': 'MdRestaurant', 'order': 3},
    {'name': 'Spacious Garage', 'description': 'Secure parking for your convenience.', 'icon': 'MdLocalParking', 'order': 4},
    {'name': 'Spa Treatment', 'description': 'Premium spa treatments to restore balance and rejuvenate.', 'icon': 'MdSpa', 'order': 5},
    {'name': 'Room Service', 'description': '24/7 in-room dining with extensive menu options.', 'icon': 'FaConciergeBell', 'order': 6},
    {'name': 'Fibre Internet', 'description': 'High-speed internet throughout the property.', 'icon': 'FaWifi', 'order': 7},
]

FACILITIES = [
    {'name': 'Welcome Drink on Arrival', 'category': Facility.Category.COMPLIMENTARY, 'order': 1, 'icon': 'FaCoffee'},
    {'name': 'Buffet Breakfast', 'category': Facility.Category.COMPLIMENTARY, 'order': 2, 'icon': 'FaCoffee'},
    {'name': 'High Speed Wi-fi', 'category': Facility.Category.COMPLIMENTARY, 'order': 3, 'icon': 'FaWifi'},
    {'name': 'Swimming Pool', 'category': Facility.Category.GENERAL, 'order': 4, 'icon': 'MdPool', 'description': 'Indoor and outdoor pools open daily.'},
    {'name': 'Fitness Center', 'category': Facility.Category.GENERAL, 'order': 5, 'icon': 'MdFitnessCenter', 'description': 'State of the art gym equipment.'},
    {'name': 'Spa & Wellness', 'category': Facility.Category.GENERAL, 'order': 6, 'icon': 'MdSpa', 'description': 'Rejuvenate with our spa treatments.'},
    {'name': 'Restaurant & Bar', 'category': Facility.Category.GENERAL, 'order': 7, 'icon': 'MdRestaurant', 'description': 'Fine dining and rooftop bar.'},
]


class Command(BaseCommand):
    help = 'Seed hotel services and facilities for public/admin modules'

    def handle(self, *args, **options):
        svc_created = fac_created = 0
        for item in HOTEL_SERVICES:
            _, was_new = HotelService.objects.update_or_create(
                name=item['name'],
                defaults={**item, 'is_active': True},
            )
            if was_new:
                svc_created += 1

        for item in FACILITIES:
            _, was_new = Facility.objects.update_or_create(
                name=item['name'],
                defaults={**item, 'is_active': True},
            )
            if was_new:
                fac_created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Services seed done — {svc_created} new services, {fac_created} new facilities '
            f'({HotelService.objects.filter(is_active=True).count()} services, '
            f'{Facility.objects.filter(is_active=True).count()} facilities total)',
        ))
