from django.db import migrations


MORE_HOME_DEFAULTS = {
    "sections": {
        "hero": {
            "primary_cta_fallback_text": "Book Your Room",
            "primary_cta_fallback_link": "/rooms",
            "show_booking_bar": True,
            "checkin_label": "Check-in",
            "checkout_label": "Check-out",
            "adults_label": "Adults",
            "children_label": "Children",
            "check_button_text": "Check Now",
            "adult_options": ["1", "2", "3", "4"],
            "children_options": ["0", "1", "2", "3"],
        },
        "rooms": {
            "guest_suffix": "Guests",
            "price_prefix": "BDT",
            "usd_rate": 115,
            "details_button_text": "Details",
            "book_button_text": "Book",
            "fallback_description": (
                "Experience ultimate comfort and luxury in this beautifully designed room, "
                "perfectly suited for your stay in Rajshahi."
            ),
        },
        "booking": {
            "show_form": True,
            "checkin_label": "Check-in Date",
            "checkout_label": "Check-out Date",
            "adults_label": "Adults",
            "children_label": "Children",
            "adult_options": ["1", "2", "3", "4"],
            "children_options": ["0", "1", "2", "3"],
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


def seed_more_home_defaults(apps, schema_editor):
    PageCMS = apps.get_model('cms', 'PageCMS')
    try:
        page = PageCMS.objects.get(page_slug='home')
    except PageCMS.DoesNotExist:
        return
    page.extra_content = merge_defaults(page.extra_content, MORE_HOME_DEFAULTS)
    page.save(update_fields=['extra_content'])


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0005_pagecmsasset_home_defaults'),
    ]

    operations = [
        migrations.RunPython(seed_more_home_defaults, migrations.RunPython.noop),
    ]
