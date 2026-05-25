# Generated manually to add and backfill pincode metro flag.

from django.db import migrations, models

METRO_CITY_RULES = (
    ("DELHI", None),
    ("MAHARASHTRA", ("MUMBAI",)),
    ("WEST BENGAL", ("KOLKATA", "CALCUTTA")),
    ("TAMIL NADU", ("CHENNAI",)),
    ("KARNATAKA", ("BENGALURU", "BANGALORE")),
    ("TELANGANA", ("HYDERABAD",)),
    ("MAHARASHTRA", ("PUNE",)),
    ("GUJARAT", ("AHMEDABAD",)),
)


def _normalize(value):
    return (value or "").strip().upper()


def is_metro_city(state_name, district_name):
    state = _normalize(state_name)
    district = _normalize(district_name)
    if not state:
        return False
    for rule_state, rule_keywords in METRO_CITY_RULES:
        if state != rule_state:
            continue
        if rule_keywords is None:
            return True
        if district and any(keyword in district for keyword in rule_keywords):
            return True
    return False


def backfill_metro(apps, schema_editor):
    Pincode = apps.get_model("logistics", "Pincode")
    batch = []
    batch_size = 2000
    queryset = Pincode.objects.all().only("id", "state_name", "district_name")
    for row in queryset.iterator(chunk_size=batch_size):
        row.metro = is_metro_city(row.state_name, row.district_name)
        batch.append(row)
        if len(batch) >= batch_size:
            Pincode.objects.bulk_update(batch, ["metro"], batch_size=batch_size)
            batch = []
    if batch:
        Pincode.objects.bulk_update(batch, ["metro"], batch_size=batch_size)


def clear_metro(apps, schema_editor):
    Pincode = apps.get_model("logistics", "Pincode")
    Pincode.objects.update(metro=False)


class Migration(migrations.Migration):
    dependencies = [
        ("logistics", "0004_pincode_region"),
    ]

    operations = [
        migrations.AddField(
            model_name="pincode",
            name="metro",
            field=models.BooleanField(db_index=True, default=False),
        ),
        migrations.RunPython(backfill_metro, clear_metro),
    ]
