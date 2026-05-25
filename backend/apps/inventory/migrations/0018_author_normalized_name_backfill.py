import unicodedata

from django.db import migrations


def _normalize(name: str) -> str:
    if not name:
        return ""
    decomposed = unicodedata.normalize("NFKD", name)
    stripped = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return stripped.casefold().strip()


def forwards_backfill(apps, schema_editor):
    Author = apps.get_model("inventory", "Author")
    queryset = Author.objects.only("id", "name").order_by("id")
    for row in queryset.iterator(chunk_size=500):
        Author.objects.filter(pk=row.pk).update(normalized_name=_normalize(row.name))


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0017_author_normalized_name_step1_nullable"),
    ]

    operations = [
        migrations.RunPython(forwards_backfill, migrations.RunPython.noop),
    ]
