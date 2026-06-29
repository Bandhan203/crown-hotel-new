from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0015_registration'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='company_name',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AlterField(
            model_name='payment',
            name='payment_method',
            field=models.CharField(
                choices=[
                    ('CARD', 'Card'),
                    ('CASH', 'Cash'),
                    ('ONLINE', 'Online'),
                    ('ONLINE_SSLCOMMERZ', 'Online (SSLCommerz)'),
                    ('BANK_TRANSFER', 'Bank Transfer'),
                    ('POS', 'POS Terminal'),
                    ('COMPANY_CREDIT', 'Company Credit'),
                ],
                default='ONLINE',
                max_length=50,
            ),
        ),
    ]
