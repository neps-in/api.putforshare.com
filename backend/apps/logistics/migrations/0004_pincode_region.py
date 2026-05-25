# Generated manually to add and backfill pincode region buckets.

from django.db import migrations, models

NORTH_EAST_STATES = {
    "ARUNACHAL PRADESH",
    "ASSAM",
    "MANIPUR",
    "MEGHALAYA",
    "MIZORAM",
    "NAGALAND",
    "SIKKIM",
    "TRIPURA",
}

SOUTH_STATES = {
    "ANDHRA PRADESH",
    "KARNATAKA",
    "KERALA",
    "TAMIL NADU",
    "TELANGANA",
    "PONDICHERRY",
}

EAST_STATES = {
    "BIHAR",
    "JHARKHAND",
    "ODISHA",
    "WEST BENGAL",
}

WEST_STATES = {
    "GOA",
    "GUJARAT",
    "MAHARASHTRA",
    "DADRA & NAGAR HAVELI",
    "DAMAN & DIU",
}

CENTRAL_STATES = {
    "MADHYA PRADESH",
    "CHATTISGARH",
}

ISLAND_STATES = {
    "ANDAMAN & NICOBAR ISLANDS",
    "LAKSHADWEEP",
}

NORTH_STATES = {
    "CHANDIGARH",
    "DELHI",
    "HARYANA",
    "HIMACHAL PRADESH",
    "JAMMU & KASHMIR",
    "PUNJAB",
    "RAJASTHAN",
    "UTTAR PRADESH",
    "UTTARAKHAND",
}


def derive_region(state_name):
    state = (state_name or "").strip().upper()
    if state in NORTH_EAST_STATES:
        return "North East"
    if state in SOUTH_STATES:
        return "South"
    if state in EAST_STATES:
        return "East"
    if state in WEST_STATES:
        return "West"
    if state in CENTRAL_STATES:
        return "Central"
    if state in ISLAND_STATES:
        return "Islands"
    if state in NORTH_STATES:
        return "North"
    return "Central"


def backfill_region(apps, schema_editor):
    Pincode = apps.get_model("logistics", "Pincode")
    batch = []
    batch_size = 2000
    queryset = Pincode.objects.all().only("id", "state_name")
    for row in queryset.iterator(chunk_size=batch_size):
        row.region = derive_region(row.state_name)
        batch.append(row)
        if len(batch) >= batch_size:
            Pincode.objects.bulk_update(batch, ["region"], batch_size=batch_size)
            batch = []
    if batch:
        Pincode.objects.bulk_update(batch, ["region"], batch_size=batch_size)


def clear_region(apps, schema_editor):
    Pincode = apps.get_model("logistics", "Pincode")
    Pincode.objects.update(region="")


class Migration(migrations.Migration):
    dependencies = [
        ("logistics", "0003_alter_package_pickup"),
    ]

    operations = [
        migrations.AddField(
            model_name="pincode",
            name="region",
            field=models.CharField(
                blank=True,
                choices=[
                    ("North", "North"),
                    ("South", "South"),
                    ("East", "East"),
                    ("West", "West"),
                    ("Central", "Central"),
                    ("North East", "North East"),
                    ("Islands", "Islands"),
                    ("Metro", "Metro"),
                ],
                db_index=True,
                default="",
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_region, clear_region),
    ]
