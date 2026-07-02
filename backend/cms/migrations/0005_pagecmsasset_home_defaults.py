from django.db import migrations, models
import django.db.models.deletion


HOME_DEFAULTS = {
    "section_order": [
        "hero", "about", "rooms", "services", "video", "facilities",
        "testimonials", "features", "news", "gallery", "booking",
    ],
    "sections": {
        "hero": {
            "enabled": True,
            "secondary_cta_text": "Explore Facilities",
            "secondary_cta_link": "/facilities",
        },
        "about": {
            "enabled": True,
            "subtitle": "HOTEL CROWN",
            "title": "Experience Comfort, Luxury & Hospitality",
            "body": (
                "Discover a world of comfort and refined hospitality. Ideally located in Padma Abasik, "
                "Rajshahi, the hotel offers elegant accommodations, contemporary facilities, and attentive "
                "service in a welcoming environment. From relaxing stays to business visits, every detail is "
                "thoughtfully designed to provide an exceptional guest experience."
            ),
            "address": (
                "Padma Abasik, Rajshahi, Bangladesh (Rajshahi - 6200). House# 310, Road 7, "
                "Padma housing state, Padma abasik, Boalia, Rajshahi city, Rajshahi."
            ),
            "phone_label": "Front Office",
            "phone": "01334 945 375",
            "phone_href": "01334945375",
        },
        "rooms": {
            "enabled": True,
            "subtitle": "HOTEL CROWN",
            "title": "Rooms & Suites",
            "limit": 6,
            "selected_ids": [],
        },
        "services": {
            "enabled": True,
            "subtitle": "CORE SERVICES",
            "title": "Our Premium Services",
            "intro": (
                "From elegant arrivals to memorable dining and rejuvenating spa experiences, Hotel Crown "
                "offers thoughtfully curated services designed for comfort, convenience, and exceptional "
                "hospitality throughout your stay in Rajshahi."
            ),
            "phone_label": "Reservations",
            "phone": "01334 945 376",
            "phone_href": "01334945376",
            "limit": 6,
            "selected_ids": [],
        },
        "video": {
            "enabled": True,
            "subtitle": "HOTEL CROWN",
            "title": "Experience Rajshahi",
            "video_url": "https://youtu.be/7BGNAGahig8",
        },
        "facilities": {
            "enabled": True,
            "subtitle": "HOTEL CROWN",
            "title": "Amenities & Facilities",
            "complimentary_title": "Complimentary Services",
            "general_title": "General Facilities",
            "complimentary_limit": 20,
            "general_limit": 20,
            "complimentary_selected_ids": [],
            "general_selected_ids": [],
        },
        "testimonials": {
            "enabled": True,
            "subtitle": "TESTIMONIALS",
            "title": "What Client's Say?",
            "limit": 6,
            "selected_ids": [],
        },
        "features": {
            "enabled": True,
            "limit": 5,
            "selected_ids": [],
            "button_text": "LEARN MORE",
        },
        "news": {
            "enabled": True,
            "subtitle": "HOTEL BLOG",
            "title": "Our News",
            "limit": 6,
            "selected_ids": [],
        },
        "gallery": {
            "enabled": True,
            "subtitle": "HOTEL GALLERY",
            "title": "Our Gallery",
            "button_text": "VIEW ALL",
            "button_link": "/gallery",
            "limit": 6,
            "selected_ids": [],
        },
        "booking": {
            "enabled": True,
            "subtitle": "HOTEL CROWN",
            "title": "Book Your Stay",
            "button_text": "Check Availability",
            "tagline": "Experience Comfort, Luxury & Hospitality at Hotel Crown, Padma Abasik, Rajshahi.",
            "front_label": "Front Office",
            "front_phone": "01334 945 375",
            "front_phone_href": "01334945375",
            "reservations_label": "Reservations",
            "reservations_phone": "01334 945 376, 01334 945 377",
            "reservations_phone_href": "01334945376",
            "email": "hotelcrownbd@gmail.com",
            "website": "www.hotelcrownbd.com",
        },
    },
}


def merge_defaults(current, defaults):
    if not isinstance(current, dict):
        current = {}
    merged = {**current}
    for key, value in defaults.items():
        if isinstance(value, dict):
            merged[key] = merge_defaults(merged.get(key), value)
        else:
            merged.setdefault(key, value)
    return merged


def seed_home_page(apps, schema_editor):
    PageCMS = apps.get_model('cms', 'PageCMS')
    page, _ = PageCMS.objects.get_or_create(
        page_slug='home',
        defaults={
            'title': 'Hotel Crown',
            'subtitle': 'Experience Comfort, Luxury & Hospitality',
            'meta_description': 'Hotel Crown in Rajshahi offers elegant rooms, premium services, facilities, dining, and warm hospitality.',
        },
    )
    page.extra_content = merge_defaults(page.extra_content, HOME_DEFAULTS)
    if not page.title:
        page.title = 'Hotel Crown'
    if not page.subtitle:
        page.subtitle = 'Experience Comfort, Luxury & Hospitality'
    page.save()


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0004_pagecms_alter_galleryimage_options_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='PageCMSAsset',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.SlugField(max_length=100)),
                ('image', models.ImageField(upload_to='pages/assets/')),
                ('alt_text', models.CharField(blank=True, default='', max_length=255)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('page', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assets', to='cms.pagecms')),
            ],
            options={
                'ordering': ['page__page_slug', 'key'],
                'unique_together': {('page', 'key')},
            },
        ),
        migrations.RunPython(seed_home_page, migrations.RunPython.noop),
    ]
