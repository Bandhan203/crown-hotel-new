from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('bookings', '0012_foliocharge_folio_window_foliocharge_is_adjustment_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='currency',
            field=models.CharField(blank=True, default='BDT', max_length=3),
        ),
    ]
