# Generated migration for Registration model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import bookings.models


def backfill_registrations(apps, schema_editor):
    Booking = apps.get_model('bookings', 'Booking')
    Registration = apps.get_model('bookings', 'Registration')
    GuestProfile = apps.get_model('accounts', 'GuestProfile')

    for booking in Booking.objects.select_related('guest', 'room_type', 'room').iterator():
        if Registration.objects.filter(booking_id=booking.id).exists():
            continue
        profile = GuestProfile.objects.filter(user_id=booking.guest_id).first()
        status = 'CHECKED_IN' if booking.status == 'CHECKED_IN' else 'REGISTERED'
        Registration.objects.create(
            booking_id=booking.id,
            guest_id=booking.guest_id,
            mode='ADVANCE',
            status=status,
            billing_type=getattr(booking, 'billing_type', 'GUEST') or 'GUEST',
            guest_email=booking.guest.email,
            guest_phone=booking.guest.phone or '',
            first_name=profile.first_name if profile else '',
            last_name=profile.last_name if profile else '',
            designation=profile.designation if profile else '',
            date_of_birth=profile.date_of_birth if profile else None,
            gender=profile.gender if profile else '',
            nationality=profile.nationality if profile else '',
            country=profile.country if profile else '',
            address=profile.address_line1 if profile else '',
            occupation=profile.occupation if profile else '',
            place_of_issue=profile.place_of_issue if profile else '',
            visa_no=profile.visa_no if profile else '',
            id_type=booking.id_type or '',
            id_number=booking.id_number or '',
            contact_person=booking.contact_person or '',
            room_type_id=booking.room_type_id,
            room_id=booking.room_id,
            check_in_date=booking.check_in_date,
            check_out_date=booking.check_out_date,
            arrival_time=booking.arrival_time,
            adults=booking.adults,
            children=booking.children,
            infants=booking.infants,
            extra_bed=booking.extra_bed,
            guest_type=booking.guest_type or '',
            purpose_of_visit=booking.purpose_of_visit or '',
            coming_from=booking.coming_from or '',
            company_name=booking.company_name or '',
            booking_source=booking.booking_source or 'PHONE',
            special_requests=booking.special_requests or '',
            rack_rate=booking.rack_rate or 0,
            offer_rate=booking.offer_rate or 0,
            discount_amount=booking.discount_amount or 0,
            deposit_amount=booking.deposit_amount or 0,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('rooms', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('bookings', '0014_booking_billing_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='Registration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('registration_ref', models.CharField(default=bookings.models.generate_registration_ref, max_length=20, unique=True)),
                ('mode', models.CharField(choices=[('ADVANCE', 'Advance Booking'), ('WALK_IN', 'Walk-in')], default='ADVANCE', max_length=10)),
                ('status', models.CharField(choices=[('DRAFT', 'Draft'), ('REGISTERED', 'Registered'), ('CHECKED_IN', 'Checked In')], default='DRAFT', max_length=15)),
                ('billing_type', models.CharField(blank=True, choices=[('GUEST', 'Guest Payment'), ('COMPANY', 'Company Payment')], default='GUEST', max_length=10)),
                ('guest_email', models.EmailField(blank=True, default='', max_length=254)),
                ('guest_phone', models.CharField(blank=True, default='', max_length=20)),
                ('first_name', models.CharField(blank=True, default='', max_length=100)),
                ('last_name', models.CharField(blank=True, default='', max_length=100)),
                ('designation', models.CharField(blank=True, default='', max_length=10)),
                ('date_of_birth', models.DateField(blank=True, null=True)),
                ('gender', models.CharField(blank=True, default='', max_length=10)),
                ('nationality', models.CharField(blank=True, default='', max_length=100)),
                ('country', models.CharField(blank=True, default='', max_length=100)),
                ('address', models.CharField(blank=True, default='', max_length=500)),
                ('occupation', models.CharField(blank=True, default='', max_length=100)),
                ('place_of_issue', models.CharField(blank=True, default='', max_length=100)),
                ('visa_no', models.CharField(blank=True, default='', max_length=50)),
                ('id_type', models.CharField(blank=True, default='', max_length=30)),
                ('id_number', models.CharField(blank=True, default='', max_length=50)),
                ('contact_person', models.CharField(blank=True, default='', max_length=200)),
                ('check_in_date', models.DateField(blank=True, null=True)),
                ('check_out_date', models.DateField(blank=True, null=True)),
                ('arrival_time', models.TimeField(blank=True, null=True)),
                ('adults', models.PositiveIntegerField(default=1)),
                ('children', models.PositiveIntegerField(default=0)),
                ('infants', models.PositiveIntegerField(default=0)),
                ('extra_bed', models.PositiveIntegerField(default=0)),
                ('guest_type', models.CharField(blank=True, default='', max_length=20)),
                ('purpose_of_visit', models.CharField(blank=True, default='', max_length=200)),
                ('coming_from', models.CharField(blank=True, default='', max_length=200)),
                ('company_name', models.CharField(blank=True, default='', max_length=200)),
                ('booking_source', models.CharField(blank=True, default='WALK_IN', max_length=20)),
                ('special_requests', models.TextField(blank=True, default='')),
                ('rack_rate', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('offer_rate', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('discount_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('deposit_amount', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('booking', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='registration_record', to='bookings.booking')),
                ('guest', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='registrations', to=settings.AUTH_USER_MODEL)),
                ('room', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='rooms.room')),
                ('room_type', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='rooms.roomtype')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.RunPython(backfill_registrations, migrations.RunPython.noop),
    ]
