from django.db import migrations


def create_sample_guests(apps, schema_editor):
    User = apps.get_model('accounts', 'CustomUser')
    GuestProfile = apps.get_model('accounts', 'GuestProfile')

    samples = [
        {'email': 'guest1@example.com', 'full_name': 'Guest One', 'phone': '1111111111'},
        {'email': 'guest2@example.com', 'full_name': 'Guest Two', 'phone': '2222222222'},
        {'email': 'guest3@example.com', 'full_name': 'Guest Three', 'phone': '3333333333'},
        {'email': 'guest4@example.com', 'full_name': 'Guest Four', 'phone': '4444444444'},
        {'email': 'guest5@example.com', 'full_name': 'Guest Five', 'phone': '5555555555'},
    ]

    for s in samples:
        user, created = User.objects.get_or_create(
            email=s['email'],
            defaults={
                'full_name': s['full_name'],
                'phone': s.get('phone', ''),
                'role': 'GUEST',
            }
        )
        if created:
            # historical models may not have set_unusable_password available; use empty password
            user.password = ''
            user.save()

        GuestProfile.objects.get_or_create(user=user)


def remove_sample_guests(apps, schema_editor):
    User = apps.get_model('accounts', 'CustomUser')
    emails = [
        'guest1@example.com',
        'guest2@example.com',
        'guest3@example.com',
        'guest4@example.com',
        'guest5@example.com',
    ]
    User.objects.filter(email__in=emails).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_guestprofile'),
    ]

    operations = [
        migrations.RunPython(create_sample_guests, remove_sample_guests),
    ]
