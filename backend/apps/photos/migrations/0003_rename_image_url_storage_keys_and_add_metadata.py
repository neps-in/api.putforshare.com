from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("photos", "0002_alter_photo_uuid_alter_photoattachment_uuid"),
    ]

    operations = [
        # Data-preserving renames (image_url -> cdn_url, s3_key -> storage_key)
        migrations.RenameField(
            model_name="photo",
            old_name="image_url",
            new_name="cdn_url",
        ),
        migrations.RenameField(
            model_name="photo",
            old_name="s3_key",
            new_name="storage_key",
        ),
        # Tighten max_length (1000 -> 500 and 1024 -> 500). See migration notes:
        # run a length check before applying in production.
        migrations.AlterField(
            model_name="photo",
            name="cdn_url",
            field=models.URLField(blank=True, default="", max_length=500),
        ),
        migrations.AlterField(
            model_name="photo",
            name="storage_key",
            field=models.CharField(max_length=500, unique=True),
        ),
        # New fields
        migrations.AddField(
            model_name="photo",
            name="source",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
        migrations.AddField(
            model_name="photo",
            name="size",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="photo",
            name="format",
            field=models.CharField(blank=True, default="", max_length=10),
        ),
    ]
