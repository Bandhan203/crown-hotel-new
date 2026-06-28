from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0007_merge_20260402_0420'),
    ]

    operations = [
        # Operational flags
        migrations.AddField(
            model_name='booking',
            name='dnm',
            field=models.BooleanField(default=False, help_text='Do Not Move'),
        ),
        migrations.AddField(
            model_name='booking',
            name='no_post',
            field=models.BooleanField(default=False, help_text='Do not post charges to folio'),
        ),
        migrations.AddField(
            model_name='booking',
            name='is_travel_agency',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='booking',
            name='non_smoking',
            field=models.BooleanField(default=False),
        ),
        # Profile note
        migrations.AddField(
            model_name='booking',
            name='profile_note',
            field=models.TextField(blank=True, default=''),
        ),
        # Room count
        migrations.AddField(
            model_name='booking',
            name='num_rooms',
            field=models.PositiveIntegerField(default=1),
        ),
        # Rate & charges
        migrations.AddField(
            model_name='booking',
            name='discount_pct',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Discount percentage', max_digits=5),
        ),
        migrations.AddField(
            model_name='booking',
            name='service_charge_pct',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Service charge %', max_digits=5),
        ),
        migrations.AddField(
            model_name='booking',
            name='vat_pct',
            field=models.DecimalField(decimal_places=2, default=0, help_text='VAT %', max_digits=5),
        ),
        # Flight / transport
        migrations.AddField(
            model_name='booking',
            name='flight_pickup_no',
            field=models.CharField(blank=True, default='', help_text='Pickup flight number', max_length=50),
        ),
        migrations.AddField(
            model_name='booking',
            name='flight_eta',
            field=models.CharField(blank=True, default='', help_text='Estimated time of arrival', max_length=10),
        ),
        migrations.AddField(
            model_name='booking',
            name='pickup_required',
            field=models.CharField(
                choices=[('YES', 'Yes'), ('NO', 'No')],
                default='NO',
                max_length=3,
            ),
        ),
        migrations.AddField(
            model_name='booking',
            name='flight_drop_no',
            field=models.CharField(blank=True, default='', help_text='Drop-off flight number', max_length=50),
        ),
        migrations.AddField(
            model_name='booking',
            name='flight_etd',
            field=models.CharField(blank=True, default='', help_text='Estimated time of departure', max_length=10),
        ),
        migrations.AddField(
            model_name='booking',
            name='drop_required',
            field=models.CharField(
                choices=[('YES', 'Yes'), ('NO', 'No')],
                default='NO',
                max_length=3,
            ),
        ),
    ]
