from django.db import migrations, models


def forwards_copy_quality_fields(apps, schema_editor):
    Product = apps.get_model("inventory", "Product")
    Book = apps.get_model("inventory", "Book")
    product_table = Product._meta.db_table
    book_table = Book._meta.db_table
    parent_link_column = Book._meta.get_ancestor_link(Product).column
    quoted_product_table = schema_editor.quote_name(product_table)
    quoted_book_table = schema_editor.quote_name(book_table)

    schema_editor.execute(
        f"ALTER TABLE {quoted_book_table} ADD COLUMN quality varchar(200) NOT NULL DEFAULT ''"
    )
    schema_editor.execute(
        f"ALTER TABLE {quoted_book_table} ADD COLUMN quality_note varchar(255) NOT NULL DEFAULT ''"
    )

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            f"""
            UPDATE {book_table}
            SET quality = COALESCE(
                    (SELECT quality FROM {product_table} WHERE {product_table}.id = {book_table}.{parent_link_column}),
                    ''
                ),
                quality_note = COALESCE(
                    (SELECT quality_note FROM {product_table} WHERE {product_table}.id = {book_table}.{parent_link_column}),
                    ''
                )
            WHERE EXISTS (
                SELECT 1 FROM {product_table}
                WHERE {product_table}.id = {book_table}.{parent_link_column}
            )
            """
        )

    schema_editor.execute(f"ALTER TABLE {quoted_product_table} DROP COLUMN quality")
    schema_editor.execute(f"ALTER TABLE {quoted_product_table} DROP COLUMN quality_note")


def backwards_copy_quality_fields(apps, schema_editor):
    Product = apps.get_model("inventory", "Product")
    Book = apps.get_model("inventory", "Book")
    product_table = Product._meta.db_table
    book_table = Book._meta.db_table
    parent_link_column = Book._meta.get_ancestor_link(Product).column
    quoted_product_table = schema_editor.quote_name(product_table)
    quoted_book_table = schema_editor.quote_name(book_table)

    schema_editor.execute(
        f"ALTER TABLE {quoted_product_table} ADD COLUMN quality varchar(200) NOT NULL DEFAULT ''"
    )
    schema_editor.execute(
        f"ALTER TABLE {quoted_product_table} ADD COLUMN quality_note varchar(255) NOT NULL DEFAULT ''"
    )

    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            f"""
            UPDATE {product_table}
            SET quality = COALESCE(
                    (SELECT quality FROM {book_table} WHERE {book_table}.{parent_link_column} = {product_table}.id),
                    ''
                ),
                quality_note = COALESCE(
                    (SELECT quality_note FROM {book_table} WHERE {book_table}.{parent_link_column} = {product_table}.id),
                    ''
                )
            WHERE EXISTS (
                SELECT 1 FROM {book_table}
                WHERE {book_table}.{parent_link_column} = {product_table}.id
            )
            """
        )

    schema_editor.execute(f"ALTER TABLE {quoted_book_table} DROP COLUMN quality")
    schema_editor.execute(f"ALTER TABLE {quoted_book_table} DROP COLUMN quality_note")


class Migration(migrations.Migration):
    dependencies = [
        ("inventory", "0015_quality_book_only"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(
                    model_name="product",
                    name="quality",
                ),
                migrations.RemoveField(
                    model_name="product",
                    name="quality_note",
                ),
                migrations.AddField(
                    model_name="book",
                    name="quality",
                    field=models.CharField(blank=True, default="", max_length=200),
                ),
                migrations.AddField(
                    model_name="book",
                    name="quality_note",
                    field=models.CharField(blank=True, default="", max_length=255),
                ),
            ],
            database_operations=[migrations.RunPython(forwards_copy_quality_fields, backwards_copy_quality_fields)],
        ),
    ]
