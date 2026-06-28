from django.db import migrations, models


def backfill_gallery_titles(apps, schema_editor):
    GalleryImage = apps.get_model('cms', 'GalleryImage')
    for item in GalleryImage.objects.all():
        changed = False
        if not item.title:
            item.title = item.caption or f"{item.get_category_display()} Image"
            changed = True
        if item.alt_text == '':
            item.alt_text = item.title
            changed = True
        if changed:
            item.save(update_fields=['title', 'alt_text'])


class Migration(migrations.Migration):

    dependencies = [
        ('cms', '0002_alter_newspost_slug'),
    ]

    operations = [
        migrations.AddField(
            model_name='galleryimage',
            name='title',
            field=models.CharField(blank=True, default='', max_length=200),
        ),
        migrations.AddField(
            model_name='galleryimage',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='galleryimage',
            name='alt_text',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='galleryimage',
            name='is_published',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='galleryimage',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, null=True),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='galleryimage',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, null=True),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_gallery_titles, migrations.RunPython.noop),
    ]
