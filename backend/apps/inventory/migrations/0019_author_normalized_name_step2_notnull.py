from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0018_author_normalized_name_backfill"),
    ]

    operations = [
        migrations.AlterField(
            model_name="author",
            name="normalized_name",
            field=models.CharField(db_index=True, max_length=255),
        ),
    ]
