from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0016_move_quality_fields_to_book"),
    ]

    operations = [
        migrations.AddField(
            model_name="author",
            name="normalized_name",
            field=models.CharField(max_length=255, null=True, db_index=True),
        ),
    ]
