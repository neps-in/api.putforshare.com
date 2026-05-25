# Inventory Completed

## My Inventories

1. Added seller-scoped inventory API endpoint `inventory/my-products`.
2. Implemented seller-only CRUD behavior with auto-owner assignment on create (`seller=request.user`).
3. Added search and sorting support for:
   - title
   - ISBN
   - author
   - publisher
   - price
   - quantity
   - created date
   - updated date
4. Added `MyInventorySerializer` with:
   - writable `category_uuid`
   - auto SKU generation when missing
   - default fallback values for pricing and quantity
   - flattened read fields (`isbn_10`, `isbn_13`, `author_name`, `publisher_name`)
5. Added React Admin resource `my/inventories` with:
   - list
   - create
   - edit
   - show
   - helpful aside
6. Wired frontend data provider mapping:
   - `my/inventories -> inventory/my-products`
7. Added backend tests for:
   - seller isolation (list shows only current seller records)
   - owner auto-assignment on create
   - search by ISBN, author, publisher
8. Fixed inventory model save issues:
   - corrected slug uniqueness checks
   - added missing `super().save()` call in `Product.save`

## Verification

1. `backend/.conda/bin/python backend/manage.py check` passed.
2. `backend/.conda/bin/python backend/manage.py test apps.api.tests.MyInventoryAPITests -v 2` passed (3/3).

- Persist ISBN/author/publisher (and related book metadata) into Book on inventory create/update:
  - Added write-only fields in serializer:
    - isbn_10_input, isbn_13_input, author_name_input, publisher_name_input, etc.
    - backend/apps/api/serializers.py:398
  - Added safe book upsert logic that copies parent Product fields before creating the Book child row (fixes the created_on
    integrity error):
    - backend/apps/api/serializers.py:491
    - backend/apps/api/serializers.py:515
  - Wired create/update to call that logic:
    - backend/apps/api/serializers.py:638
    - backend/apps/api/serializers.py:650
- Wired fetched ISBN data into those persistent input fields in UI:
  - Auto-fill from API fetch:
    - dash/src/index.jsx:1029
    - dash/src/index.jsx:1031
    - dash/src/index.jsx:1032
  - Added form inputs so values are submitted:
    - dash/src/index.jsx:1156
    - dash/src/index.jsx:1158
    - dash/src/index.jsx:1159
- Added test coverage for persistence:

  - backend/apps/api/tests.py:273

  Book Language in inventory form is now a selectbox sourced from the lookups app (/api/v1/lookups/languages/) instead of a free-
  text input.

  ### Language choices

  - Added lookup-driven language select component:
    - dash/src/index.jsx:1107 (InventoryBookLanguageInput)
  - Replaced text input with select input:
    - dash/src/index.jsx:1188
  - Kept ISBN fetch autofill writing into book_language_input so selection auto-fills when possible:
    - dash/src/index.jsx:1033
  - Ensured edit payload/response prefills these input fields (including book_language_input) from existing Book data:
    - backend/apps/api/serializers.py:631 (to_representation mapping)

## Authors

- Authors now uses AutocompleteArrayInput in dash/src/index.jsx:1184
- Publishers now uses AutocompleteInput in dash/src/index.jsx:1230
- Both are fed from model-backed endpoints:
  - inventory/authors
  - inventory/publishers
- Kept backend compatibility:
  - authors are still saved to author_name_input as comma-separated text via parse/format
  - publisher remains publisher_name_input string

Also cleaned leftover interrupted imports (Tab, Tabs) from dash/src/index.jsx.

## Pending (Not Yet Implemented)

1. Barcode scan UI flow in inventory create.
2. External ISBN metadata fetch/autofill (OpenLibrary/Google/ISBNDB/UPCDB).
3. Full typed create flow for `Book`/`Soap` subclass records from dashboard forms.
