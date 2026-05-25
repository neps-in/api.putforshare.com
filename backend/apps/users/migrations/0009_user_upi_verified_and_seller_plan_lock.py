from django.db import migrations, models


def backfill_upi_verified_and_unlock_non_sellers(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.filter(upi_last_verified_on__isnull=False).update(upi_verified=True)
    User.objects.exclude(pfs_role="SELLER").update(plan_locked=False)


def reverse_backfill_upi_verified_and_unlock_non_sellers(apps, schema_editor):
    User = apps.get_model("users", "User")
    User.objects.update(upi_verified=False)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0008_user_profile_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="upi_verified",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(
            backfill_upi_verified_and_unlock_non_sellers,
            reverse_backfill_upi_verified_and_unlock_non_sellers,
        ),
    ]
