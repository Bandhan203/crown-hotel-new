from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0013_booking_currency'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='billing_type',
            field=models.CharField(
                blank=True,
                choices=[('GUEST', 'Guest Payment'), ('COMPANY', 'Company Payment')],
                default='GUEST',
                max_length=10,
            ),
        ),
    ]
