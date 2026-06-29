from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0016_payment_company_credit'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='is_refund',
            field=models.BooleanField(
                default=False,
                help_text='True when cash/card is returned to the guest at checkout',
            ),
        ),
        migrations.AddField(
            model_name='payment',
            name='business_date',
            field=models.DateField(
                blank=True,
                help_text='Hotel business date when payment/refund was posted',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='payment',
            name='posted_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name='posted_payments',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
