"""
Seed FAQ entries and published news posts for Hotel Crown.

Usage (from backend/):
    python seed_cms_content.py
"""
import os
from pathlib import Path

import django
from django.core.files import File
from django.utils import timezone
from django.db import transaction

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from cms.models import FAQ, NewsPost, SiteSetting, Testimonial  # noqa: E402
from services.models import Facility, HotelService  # noqa: E402

User = get_user_model()
BASE_DIR = Path(__file__).resolve().parent
MEDIA_HOTEL = BASE_DIR / 'media' / 'hotel'

FAQS = [
    {
        'order': 1,
        'question': 'What are the check-in and check-out times at Hotel Crown?',
        'answer': (
            'Check-in starts at 2:00 PM and check-out is by 12:00 PM. '
            'Early check-in or late check-out may be arranged subject to availability.'
        ),
    },
    {
        'order': 2,
        'question': 'Where is Hotel Crown located?',
        'answer': (
            'Hotel Crown is located at House# 310, Road 7, Padma housing state, '
            'Padma abasik, Boalia, Rajshahi city, Rajshahi, Bangladesh.'
        ),
    },
    {
        'order': 3,
        'question': 'Do you offer parking for guests?',
        'answer': (
            'Yes. We provide spacious and secure parking facilities for hotel guests '
            'at no extra charge, subject to availability.'
        ),
    },
    {
        'order': 4,
        'question': 'Does the hotel have a restaurant?',
        'answer': (
            'Yes. Our on-site restaurant serves a variety of local and international dishes '
            'for breakfast, lunch, and dinner. Room service is also available.'
        ),
    },
    {
        'order': 5,
        'question': 'What payment methods do you accept?',
        'answer': (
            'We accept cash, major credit/debit cards, and online payment through our '
            'booking system. For group or event bookings, please contact reservations.'
        ),
    },
    {
        'order': 6,
        'question': 'Can I cancel or modify my reservation?',
        'answer': (
            'Reservation changes and cancellations depend on the rate plan selected at booking. '
            'Please contact our reservations team at 01334 945 376 or 01334 945 377 for assistance.'
        ),
    },
    {
        'order': 7,
        'question': 'Do you have spa and wellness services?',
        'answer': (
            'Yes. Hotel Crown offers spa treatments including massage and wellness therapies. '
            'Visit our Spa & Wellness page or inquire at the front desk for the current menu.'
        ),
    },
    {
        'order': 8,
        'question': 'Is the hotel suitable for events and meetings?',
        'answer': (
            'Yes. We have banquet and meeting facilities suitable for weddings, receptions, '
            'corporate meetings, and social gatherings. Contact us for packages and availability.'
        ),
    },
]

NEWS_POSTS = [
    {
        'title': 'Welcome to Hotel Crown Rajshahi',
        'slug': 'welcome-to-hotel-crown-rajshahi',
        'category': 'ANNOUNCEMENT',
        'excerpt': (
            'Experience comfort, luxury, and warm hospitality in the heart of Rajshahi. '
            'Hotel Crown is ready to welcome you.'
        ),
        'content': (
            'Hotel Crown brings refined hospitality to Padma Abasik, Rajshahi. '
            'Our thoughtfully designed rooms, attentive staff, and premium services '
            'make every stay comfortable and memorable. Whether you are visiting for '
            'business or leisure, we look forward to hosting you.'
        ),
        'image_file': 'hotel-001.jpg',
    },
    {
        'title': 'Explore Rajshahi: A City of Heritage and Culture',
        'slug': 'explore-rajshahi-heritage-culture',
        'category': 'TRAVEL',
        'excerpt': (
            'Discover the rich history, river views, and cultural landmarks that make '
            'Rajshahi a wonderful destination.'
        ),
        'content': (
            'Rajshahi is known for its mango orchards, silk traditions, and proximity to the Padma River. '
            'Guests at Hotel Crown can easily explore local markets, universities, and historic sites '
            'while enjoying a relaxing base in the city.'
        ),
        'image_file': 'hotel-015.jpg',
    },
    {
        'title': 'Dining at Hotel Crown Restaurant',
        'slug': 'dining-at-hotel-crown-restaurant',
        'category': 'DINING',
        'excerpt': (
            'From hearty breakfasts to flavorful dinners, our restaurant offers a welcoming '
            'dining experience for every guest.'
        ),
        'content': (
            'Our restaurant team focuses on quality ingredients, attentive service, and a comfortable '
            'atmosphere. Enjoy local favorites and international selections in a setting designed '
            'for both casual meals and special occasions.'
        ),
        'image_file': 'hotel-030.jpg',
    },
    {
        'title': 'Spa & Wellness: Relax and Rejuvenate',
        'slug': 'spa-wellness-relax-rejuvenate',
        'category': 'WELLNESS',
        'excerpt': (
            'Unwind with our spa treatments designed to restore balance and refresh your mind and body.'
        ),
        'content': (
            'After a day of travel or meetings, treat yourself to a soothing massage or wellness therapy. '
            'Our spa services are crafted to help guests relax, recharge, and make the most of their stay at Hotel Crown.'
        ),
        'image_file': 'hotel-045.jpg',
    },
    {
        'title': 'Host Your Next Event at Hotel Crown',
        'slug': 'host-your-event-at-hotel-crown',
        'category': 'EVENTS',
        'excerpt': (
            'Our banquet and meeting spaces are ideal for weddings, receptions, and corporate gatherings.'
        ),
        'content': (
            'Hotel Crown offers flexible event spaces with professional support for planning and execution. '
            'Contact our team to discuss capacity, catering, and customized packages for your special occasion.'
        ),
        'image_file': 'hotel-060.jpg',
    },
    {
        'title': 'Room Types for Every Traveler',
        'slug': 'room-types-for-every-traveler',
        'category': 'ROOMS',
        'excerpt': (
            'From Crown Classic to Crown Signature, find the room that fits your stay.'
        ),
        'content': (
            'Choose from our range of room categories designed for solo travelers, couples, and guests '
            'seeking extra comfort. Each room features modern amenities, elegant décor, and the warm '
            'service Hotel Crown is known for.'
        ),
        'image_file': 'hotel-075.jpg',
    },
]


def _pick_image(filename: str) -> Path | None:
    path = MEDIA_HOTEL / filename
    if path.exists():
        return path
    candidates = sorted(MEDIA_HOTEL.glob('*.jpg'))
    return candidates[0] if candidates else None


@transaction.atomic
def seed_faqs() -> int:
    created = 0
    for item in FAQS:
        _, was_created = FAQ.objects.update_or_create(
            question=item['question'],
            defaults={
                'answer': item['answer'],
                'order': item['order'],
                'is_active': True,
            },
        )
        if was_created:
            created += 1
    return created


@transaction.atomic
def seed_news(author) -> int:
    created = 0
    now = timezone.now()
    for idx, item in enumerate(NEWS_POSTS):
        defaults = {
            'title': item['title'],
            'category': item['category'],
            'excerpt': item['excerpt'],
            'content': item['content'],
            'author': author,
            'is_published': True,
            'published_at': now - timezone.timedelta(days=idx * 3),
        }
        post, was_created = NewsPost.objects.update_or_create(
            slug=item['slug'],
            defaults=defaults,
        )
        image_path = _pick_image(item['image_file'])
        if image_path and not post.image:
            with image_path.open('rb') as fh:
                post.image.save(image_path.name, File(fh), save=True)
        if was_created:
            created += 1
    return created


SITE_SETTINGS = {
    'site_name': 'Hotel Crown',
    'site_tagline': 'Experience Comfort, Luxury & Hospitality at Hotel Crown, Padma Abasik, Rajshahi.',
    'primary_cta_label': 'Book Your Room',
    'primary_cta_link': '/rooms',
    'footer_copyright': '© Copyright 2026 Hotel Crown. All Rights Reserved.',
    'contact_phone': '01334 945 375',
    'contact_phone_href': '01334945375',
    'contact_phone_reservations': '01334 945 376, 01334 945 377',
    'contact_phone_reservations_href': '01334945376',
    'contact_email': 'hotelcrownbd@gmail.com',
    'contact_website': 'www.hotelcrownbd.com',
    'contact_address': (
        'House# 310, Road 7, Padma housing state, Padma abasik, Boalia, '
        'Rajshahi city, Rajshahi, Bangladesh (Rajshahi - 6200)'
    ),
    'about_title': 'Experience Comfort, Luxury & Hospitality',
    'about_body': (
        'Discover a world of comfort and refined hospitality. Ideally located in Padma Abasik, '
        'Rajshahi, the hotel offers elegant accommodations, contemporary facilities, and attentive '
        'service in a welcoming environment. From relaxing stays to business visits, every detail '
        'is thoughtfully designed to provide an exceptional guest experience.'
    ),
    'home_services_intro': (
        'From elegant arrivals to memorable dining and rejuvenating spa experiences, Hotel Crown '
        'offers thoughtfully curated services designed for comfort, convenience, and exceptional '
        'hospitality throughout your stay in Rajshahi.'
    ),
    'home_booking_tagline': 'Experience Comfort, Luxury & Hospitality at Hotel Crown, Padma Abasik, Rajshahi.',
    'home_video_title': 'Experience Rajshahi',
    'home_video_url': 'https://youtu.be/7BGNAGahig8',
    'seo_default_title': 'Hotel Crown | Rajshahi',
    'seo_meta_description': (
        'Experience Comfort, Luxury & Hospitality at Hotel Crown, Padma Abasik, Rajshahi, Bangladesh.'
    ),
    'seo_keywords': 'Hotel Crown, Rajshahi hotel, Padma Abasik, luxury hotel Bangladesh',
}

TESTIMONIALS = [
    {
        'guest_name': 'Rahim Uddin',
        'guest_role': 'Business Guest',
        'content': (
            'Hotel Crown exceeded my expectations. The room was spotless, staff were courteous, '
            'and the location in Padma Abasik is very convenient for my meetings in Rajshahi.'
        ),
        'rating': 5,
    },
    {
        'guest_name': 'Nusrat Jahan',
        'guest_role': 'Family Stay',
        'content': (
            'We stayed with family and loved the warm hospitality. Breakfast was excellent and the '
            'front office team helped us with local sightseeing recommendations.'
        ),
        'rating': 5,
    },
    {
        'guest_name': 'Karim Hassan',
        'guest_role': 'Event Organizer',
        'content': (
            'We hosted a corporate dinner in the banquet hall. Professional service, elegant setup, '
            'and smooth coordination from the events team throughout the evening.'
        ),
        'rating': 5,
    },
]

HOTEL_SERVICES = [
    {
        'name': 'Elegant Lobby',
        'description': 'A welcoming lobby blending elegance, comfort, and sophistication for every guest\'s arrival.',
        'icon': 'MdMeetingRoom',
        'order': 1,
    },
    {
        'name': 'Banquet Hall',
        'description': 'Our elegant banquet hall is perfect for weddings, receptions, and corporate events.',
        'icon': 'FaGlassCheers',
        'order': 2,
    },
    {
        'name': 'Restaurant',
        'description': 'A perfect destination for delightful flavors, memorable meals, and exceptional dining experiences.',
        'icon': 'MdRestaurant',
        'order': 3,
    },
    {
        'name': 'Spacious Garage',
        'description': 'Spacious and secure parking facilities designed for your convenience and peace of mind.',
        'icon': 'MdLocalParking',
        'order': 4,
    },
    {
        'name': 'Spa Treatment',
        'description': (
            'Indulge in a world of relaxation with our premium spa treatments designed to restore '
            'balance and rejuvenate both body and mind.'
        ),
        'icon': 'MdSpa',
        'order': 5,
    },
]

FACILITIES = [
    {'name': 'Welcome Drink on Arrival', 'category': Facility.Category.COMPLIMENTARY, 'order': 1},
    {'name': 'Mineral Water', 'category': Facility.Category.COMPLIMENTARY, 'order': 2},
    {'name': 'Buffet Breakfast', 'category': Facility.Category.COMPLIMENTARY, 'order': 3},
    {'name': 'High Speed Wi-fi', 'category': Facility.Category.COMPLIMENTARY, 'order': 4},
    {'name': 'Health Club Access', 'category': Facility.Category.COMPLIMENTARY, 'order': 5},
    {'name': 'Room Amenities & Supplies', 'category': Facility.Category.COMPLIMENTARY, 'order': 6},
    {'name': 'On Arrival Fruit Basket', 'category': Facility.Category.COMPLIMENTARY, 'order': 7},
    {'name': 'In Room Tea/Coffee Making Facilities', 'category': Facility.Category.COMPLIMENTARY, 'order': 8},
    {'name': 'Cold Towel', 'category': Facility.Category.COMPLIMENTARY, 'order': 9},
    {'name': 'Car Parking', 'category': Facility.Category.COMPLIMENTARY, 'order': 10},
    {'name': '24 Hours Room Service', 'category': Facility.Category.GENERAL, 'order': 11},
    {'name': '24 Hours Front Office', 'category': Facility.Category.GENERAL, 'order': 12},
    {'name': 'Fully Air Conditioned', 'category': Facility.Category.GENERAL, 'order': 13},
    {'name': 'Banquet & Conference', 'category': Facility.Category.GENERAL, 'order': 14},
    {'name': 'Private Meeting Room', 'category': Facility.Category.GENERAL, 'order': 15},
    {'name': 'Multicuisine Restaurant', 'category': Facility.Category.GENERAL, 'order': 16},
    {'name': 'Out & Industrial Catering', 'category': Facility.Category.GENERAL, 'order': 17},
    {'name': 'On Call Doctor', 'category': Facility.Category.GENERAL, 'order': 18},
    {'name': 'Pick Up & Drop Off Service', 'category': Facility.Category.GENERAL, 'order': 19},
    {'name': 'Access Controlled Elevator', 'category': Facility.Category.GENERAL, 'order': 20},
    {'name': 'Electronic Safe Box In Room', 'category': Facility.Category.GENERAL, 'order': 21},
    {'name': 'Basement Parking', 'category': Facility.Category.GENERAL, 'order': 22},
    {
        'name': 'Elegant Lobby',
        'description': 'A welcoming lobby blending elegance, comfort, and sophistication for every guest\'s arrival.',
        'category': Facility.Category.FEATURE,
        'subtitle': 'WELCOME',
        'link': '/about',
        'order': 1,
        'image_file': 'hotel-020.jpg',
    },
    {
        'name': 'Banquet Hall',
        'description': 'Our elegant banquet hall is perfect for weddings, receptions, and corporate events.',
        'category': Facility.Category.FEATURE,
        'subtitle': 'EVENTS',
        'link': '/facilities',
        'order': 2,
        'image_file': 'hotel-040.jpg',
    },
    {
        'name': 'Restaurant',
        'description': 'A perfect destination for delightful flavors, memorable meals, and exceptional dining experiences.',
        'category': Facility.Category.FEATURE,
        'subtitle': 'DINING',
        'link': '/restaurant',
        'order': 3,
        'image_file': 'hotel-050.jpg',
    },
    {
        'name': 'Spacious Garage',
        'description': 'Spacious and secure parking facilities designed for your convenience and peace of mind.',
        'category': Facility.Category.FEATURE,
        'subtitle': 'CONVENIENCE',
        'link': '/facilities',
        'order': 4,
        'image_file': 'hotel-060.jpg',
    },
    {
        'name': 'Spa Treatment',
        'description': (
            'Indulge in a world of relaxation with our premium spa treatments designed to restore '
            'balance and rejuvenate both body and mind.'
        ),
        'category': Facility.Category.FEATURE,
        'subtitle': 'WELLNESS',
        'link': '/spa',
        'order': 5,
        'image_file': 'hotel-070.jpg',
    },
]


@transaction.atomic
def seed_site_settings() -> int:
    created = 0
    for key, value in SITE_SETTINGS.items():
        _, was_created = SiteSetting.objects.update_or_create(
            key=key,
            defaults={'value': value},
        )
        if was_created:
            created += 1
    return created


@transaction.atomic
def seed_testimonials() -> int:
    created = 0
    for item in TESTIMONIALS:
        _, was_created = Testimonial.objects.update_or_create(
            guest_name=item['guest_name'],
            defaults={
                'guest_role': item['guest_role'],
                'content': item['content'],
                'rating': item['rating'],
                'is_active': True,
            },
        )
        if was_created:
            created += 1
    return created


@transaction.atomic
def seed_hotel_services() -> int:
    created = 0
    for item in HOTEL_SERVICES:
        _, was_created = HotelService.objects.update_or_create(
            name=item['name'],
            defaults={
                'description': item['description'],
                'icon': item['icon'],
                'order': item['order'],
                'is_active': True,
            },
        )
        if was_created:
            created += 1
    # Activate any legacy services from populate_live
    HotelService.objects.filter(is_active=False).update(is_active=True)
    return created


@transaction.atomic
def seed_facilities() -> int:
    created = 0
    for item in FACILITIES:
        defaults = {
            'category': item['category'],
            'order': item['order'],
            'is_active': True,
            'description': item.get('description', ''),
            'subtitle': item.get('subtitle', ''),
            'link': item.get('link', ''),
        }
        facility, was_created = Facility.objects.update_or_create(
            name=item['name'],
            defaults=defaults,
        )
        image_file = item.get('image_file')
        if image_file:
            image_path = _pick_image(image_file)
            if image_path and not facility.image:
                with image_path.open('rb') as fh:
                    facility.image.save(image_path.name, File(fh), save=True)
        if was_created:
            created += 1
    Facility.objects.filter(is_active=False).update(is_active=True)
    return created


def main() -> None:
    author = User.objects.filter(is_staff=True).order_by('id').first()
    if not author:
        print('No staff user found. Create an admin user first.')
        return

    faq_count = seed_faqs()
    news_count = seed_news(author)
    settings_count = seed_site_settings()
    testimonial_count = seed_testimonials()
    service_count = seed_hotel_services()
    facility_count = seed_facilities()
    print(f'FAQ entries ready: {FAQ.objects.filter(is_active=True).count()} ({faq_count} new)')
    print(f'Published news posts: {NewsPost.objects.filter(is_published=True).count()} ({news_count} new)')
    print(f'Site settings: {SiteSetting.objects.count()} ({settings_count} new)')
    print(f'Testimonials: {Testimonial.objects.filter(is_active=True).count()} ({testimonial_count} new)')
    print(f'Active services: {HotelService.objects.filter(is_active=True).count()} ({service_count} new)')
    print(f'Active facilities: {Facility.objects.filter(is_active=True).count()} ({facility_count} new)')


if __name__ == '__main__':
    main()
