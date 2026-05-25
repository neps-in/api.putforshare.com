from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0019_author_normalized_name_step2_notnull"),
    ]

    operations = [
        migrations.AddField(
            model_name="book",
            name="published_date",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="book",
            name="metadata_quality_score",
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name="book",
            name="sources",
            field=models.JSONField(default=dict),
        ),
        migrations.AddField(
            model_name="book",
            name="field_origins",
            field=models.JSONField(default=dict),
        ),
        migrations.AddField(
            model_name="book",
            name="last_fetched_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="book",
            name="last_refreshed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="book",
            name="is_stale",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="book",
            name="manual_review_needed",
            field=models.BooleanField(default=False),
        ),
        migrations.AddIndex(
            model_name="book",
            index=models.Index(fields=["isbn_10"], name="inventory_b_isbn_10_f3b537_idx"),
        ),
        migrations.AddIndex(
            model_name="book",
            index=models.Index(fields=["isbn_13"], name="inventory_b_isbn_13_dd87ce_idx"),
        ),
        migrations.AddIndex(
            model_name="book",
            index=models.Index(fields=["published_year"], name="inventory_b_publish_a6d8e3_idx"),
        ),
        migrations.AddIndex(
            model_name="book",
            index=models.Index(fields=["metadata_quality_score"], name="inventory_b_metadat_2fa613_idx"),
        ),
        migrations.AddIndex(
            model_name="book",
            index=models.Index(fields=["is_stale", "last_fetched_at"], name="inventory_b_is_stal_f07c94_idx"),
        ),
    ]
