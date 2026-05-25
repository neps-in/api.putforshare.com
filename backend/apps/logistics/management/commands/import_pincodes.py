import csv
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.dateparse import parse_datetime

from apps.logistics.models import Pincode
from apps.logistics.regioning import derive_region, is_metro_city


class Command(BaseCommand):
    help = "Import pincodes CSV into logistics.Pincode with same-name field mapping."

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv",
            default="data/pincodes_pincodes.csv",
            help="Path to source CSV file.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=5000,
            help="Number of rows per bulk upsert batch.",
        )
        parser.add_argument(
            "--truncate",
            action="store_true",
            help="Delete existing Pincode rows before import.",
        )

    def handle(self, *args, **options):
        csv_path = Path(options["csv"])
        batch_size = options["batch_size"]
        truncate = options["truncate"]

        if not csv_path.exists():
            alt_path = Path("backend") / csv_path
            if alt_path.exists():
                csv_path = alt_path
            else:
                raise CommandError(f"CSV file not found: {csv_path}")
        if batch_size <= 0:
            raise CommandError("--batch-size must be greater than 0")

        model_fields = {
            field.name: field
            for field in Pincode._meta.fields
            if field.concrete and not field.many_to_many
        }
        model_field_names = set(model_fields.keys())

        imported = 0
        invalid_decimal_count = 0
        invalid_datetime_count = 0
        skipped_extra_fields = set()
        alias_map = {"status": "is_active"}

        with csv_path.open("r", encoding="utf-8", newline="") as fh:
            reader = csv.DictReader(fh)
            if not reader.fieldnames:
                raise CommandError("CSV has no header row.")

            csv_fields = set(reader.fieldnames)
            direct_fields = [name for name in reader.fieldnames if name in model_field_names]
            mapped_aliases = {src: dst for src, dst in alias_map.items() if src in csv_fields and dst in model_field_names}
            skipped_extra_fields = csv_fields - set(direct_fields) - set(mapped_aliases.keys())

            update_fields = [name for name in direct_fields if name != "id"]
            for dst in mapped_aliases.values():
                if dst != "id" and dst not in update_fields:
                    update_fields.append(dst)

            if truncate:
                self.stdout.write("Truncating existing logistics_pincode rows...")
                Pincode.objects.all().delete()

            batch = []

            def flush_batch():
                nonlocal batch, imported
                if not batch:
                    return
                Pincode.objects.bulk_create(
                    batch,
                    batch_size=batch_size,
                    update_conflicts=True,
                    unique_fields=["id"],
                    update_fields=update_fields,
                )
                imported += len(batch)
                batch = []

            with transaction.atomic():
                for row in reader:
                    payload = {}

                    for field_name in direct_fields:
                        value = row.get(field_name, "")
                        parsed, bad_decimal, bad_datetime = self._coerce(value, model_fields[field_name])
                        payload[field_name] = parsed
                        invalid_decimal_count += bad_decimal
                        invalid_datetime_count += bad_datetime

                    for src_name, dst_name in mapped_aliases.items():
                        value = row.get(src_name, "")
                        parsed, bad_decimal, bad_datetime = self._coerce(value, model_fields[dst_name])
                        payload[dst_name] = parsed
                        invalid_decimal_count += bad_decimal
                        invalid_datetime_count += bad_datetime

                    payload["region"] = derive_region(payload.get("state_name"), payload.get("district_name"))
                    payload["metro"] = is_metro_city(payload.get("state_name"), payload.get("district_name"))

                    batch.append(Pincode(**payload))
                    if len(batch) >= batch_size:
                        flush_batch()

                flush_batch()

        self.stdout.write(self.style.SUCCESS(f"Import complete. Upserted rows: {imported}"))
        self.stdout.write(f"CSV path: {csv_path}")
        self.stdout.write(f"Direct same-name mapped fields: {', '.join(direct_fields)}")
        if mapped_aliases:
            aliases_text = ", ".join(f"{src}->{dst}" for src, dst in mapped_aliases.items())
            self.stdout.write(f"Additional aliases applied: {aliases_text}")
        if skipped_extra_fields:
            self.stdout.write(f"CSV fields not in model: {', '.join(sorted(skipped_extra_fields))}")
        if invalid_decimal_count:
            self.stdout.write(
                self.style.WARNING(
                    f"Invalid decimal values replaced with defaults: {invalid_decimal_count}"
                )
            )
        if invalid_datetime_count:
            self.stdout.write(
                self.style.WARNING(
                    f"Invalid datetime values replaced with defaults: {invalid_datetime_count}"
                )
            )

    def _coerce(self, raw_value, field):
        value = (raw_value or "").strip()
        internal_type = field.get_internal_type()
        default = field.get_default() if field.has_default() else None

        if value in ("", "NA", "N/A", "NULL", "null", "None"):
            if field.null:
                return None, 0, 0
            return default, 0, 0

        if internal_type in {"BooleanField", "NullBooleanField"}:
            normalized = value.lower()
            if normalized in {"t", "true", "1", "yes", "y"}:
                return True, 0, 0
            if normalized in {"f", "false", "0", "no", "n"}:
                return False, 0, 0
            return default if default is not None else False, 0, 0

        if internal_type in {"IntegerField", "BigIntegerField", "PositiveIntegerField", "BigAutoField"}:
            try:
                return int(value), 0, 0
            except (TypeError, ValueError):
                return default if default is not None else 0, 0, 0

        if internal_type in {"DecimalField", "FloatField"}:
            try:
                return Decimal(value), 0, 0
            except (InvalidOperation, TypeError, ValueError):
                return default if default is not None else Decimal("0"), 1, 0

        if internal_type == "DateTimeField":
            parsed = parse_datetime(value)
            if parsed is None:
                return default, 0, 1
            return parsed, 0, 0

        return value, 0, 0
