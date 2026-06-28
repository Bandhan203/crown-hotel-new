from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('services', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='hotelservice',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='facility',
            name='category',
            field=models.CharField(
                choices=[
                    ('COMPLIMENTARY', 'Complimentary Services'),
                    ('GENERAL', 'General Facilities'),
                    ('FEATURE', 'Feature Highlight'),
                ],
                default='GENERAL',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='facility',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='facility',
            name='link',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='facility',
            name='subtitle',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
