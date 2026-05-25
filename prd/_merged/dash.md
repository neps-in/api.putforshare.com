# Merged content — prd/dash/

_16 file(s) combined on this page._


---

# backlog-9-may-2026.md : dash

_Source: `prd/dash/backlog/backlog-9-may-2026.md`_

# Dash Backlog

Created: 9/May/2026

# UI Items

1. Add Help support Icon on the top navbar visible in mobile screen , tab, desktop
2. Add 'Earning Calculator' menu item as first item in the left nav menu and link to component
   earningCalculator - read the code inside
   djre-store/dash/src/earningcalc/

# S3 Browser

Create AWS S3 browser using suitable backend library
list component (grid),
show - detail component
config is at .env file in djre-store/backend/


---

# backlog.md : dash

_Source: `prd/dash/backlog/backlog.md`_

# Backlog

## Micro

1. Add Title to all pages
2. Add Favicon
3. Add PINCODE data
4. Updated the Terms of Service link at Signup Page to https://putforshare.com/terms-of-service.php. [x] PM Verified [ ]
5.

## Inventory Data Strategy

assume We are building book inventory.
We need book metadata,
like all information like ISBN numbers and description, the synopsis of the book, and other information, and also if possible, pricing.

We have different data providers like

Open Library Search
https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data

ISBNDB Search
https://api2.isbndb.com/book/{isbn}

Google Search
https://www.googleapis.com/books/v1/volumes

UPCDB Search
https://api.upcitemdb.com/prod/trial/lookup?upc={isbn}

We need to come up with a strategy to either to crawl all the data and save it on our servers.
or
We can fetch individually as and when required, and then cache the data on our servers and use it if there is a second time we wanted to use the data.

We need to come up with a strategy for implementing this and so that it is efficient and cost effective.

Also, we need to get the images of the book saved on our servers.

If possible, in a different size, or either we generate a high-resolution image in different sizes.

The sizes details are deferred for now, and we will implement it later, and we need to store these in AWS S3 buckets so that it can be used.

If you have any open questions , you may ask.

## My Inventories /my/inventories/

1. CRUD
2. List + Search by title, isbn, author, publisher,
3. List should be sortable by Title, Author, Publisher,
   Price, Qty, Date added, Last updated
4. View

5. Create
   Ask category of product selectbox - Book | Soap | Others

   if books:
   SCAN To Add
   Create should first have a button called scan barcode. And once clicking on that should be able to open the scanner view and scan the barcode.
   And once the barcode is being scanned, it should display -
   Scan Success (in GREEN COLOR) or Failed (in RED COLOR).
   if Success
   it should remove un wanted chars like .,- and space and populate on text box.

   Search by ISBN text box and trigger enter key and search should be triggered.

   There

   And there should be a default enter key press and on key press of that event, there should be a search operation that should be triggered.

   That should fill up all the details on the box,
   along with the URL of the cover image.
   also URL also should be displayed as an image
   and also displayed in the image text box. And other details should be populated in relevant textboxes.

   ### Data API

   Open Library Search
   https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data

   ISBNDB Search
   https://api2.isbndb.com/book/{isbn}

   Google Search
   https://www.googleapis.com/books/v1/volumes

   UPCDB Search
   https://api.upcitemdb.com/prod/trial/lookup?upc={isbn}

   Add Mannually

   The following details are .
   UPC in a universal product code.
   GCID,
   part number,
   sell option, smart sell or self cell, - whatever you have choosen in the profile will be applied.
   product title or a book title,
   short description,
   full description,
   SKU,
   product category ID,
   quality,
   quality note,
   ISBN 10, ISBN_13,
   Language, - Use language lookups from lookups app
   edition,
   cover type, - selectbox
   page count,
   publisher, - from publisher select box.
   published date,
   price,
   maximum retail price,
   sale price,
   quantity,
   and also it should link to the product gallery or photo gallery,

   product dimension,
   length, breadth, height in centimeters,
   and
   weight in grams.
   Authors - Multiple select box
   last edited by - automaticall fill the user id of loggedin user,
   view counter, how many times it is being viewed in storefront.there should be a this view counter should be updated,
   inventory note. This is private to the seller, it should not be displayed on the product listing or product detail page.
   Is featured.
   Select state for tax calculation purpose which state he belongs to
   is_active,
   is_archived.

Also add book original pic - and upload to s3 and link to this inventory

# Aside

All aside should have help & user guide links in form
create / edits / list for inventory, orders - [ ]

---

7. Typography - font should be used in this specific font.
8. We should have one dashboard resource,
9. users resource,
10. inventory resource,

# Inventory

Add inventory for 1 Rupee Store,

# Mobile Screen

listing table to cards, with pagination


---

# backlog_combined_output.txt : dash

_Source: `prd/dash/backlog/backlog_combined_output.txt`_

==================================================
FILE: backlog-9-may-2026.md
==================================================

# Dash Backlog

Created: 9/May/2026

# UI Items

1. Add Help support Icon on the top navbar visible in mobile screen , tab, desktop
2. Add 'Earning Calculator' menu item as first item in the left nav menu and link to component
   earningCalculator - read the code inside
   djre-store/dash/src/earningcalc/

# S3 Browser

Create AWS S3 browser using suitable backend library
list component (grid),
show - detail component
config is at .env file in djre-store/backend/


==================================================
FILE: backlog.md
==================================================

# Backlog

## Micro

1. Add Title to all pages
2. Add Favicon
3. Add PINCODE data
4. Updated the Terms of Service link at Signup Page to https://putforshare.com/terms-of-service.php. [x] PM Verified [ ]
5.

## Inventory Data Strategy

assume We are building book inventory.
We need book metadata,
like all information like ISBN numbers and description, the synopsis of the book, and other information, and also if possible, pricing.

We have different data providers like

Open Library Search
https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data

ISBNDB Search
https://api2.isbndb.com/book/{isbn}

Google Search
https://www.googleapis.com/books/v1/volumes

UPCDB Search
https://api.upcitemdb.com/prod/trial/lookup?upc={isbn}

We need to come up with a strategy to either to crawl all the data and save it on our servers.
or
We can fetch individually as and when required, and then cache the data on our servers and use it if there is a second time we wanted to use the data.

We need to come up with a strategy for implementing this and so that it is efficient and cost effective.

Also, we need to get the images of the book saved on our servers.

If possible, in a different size, or either we generate a high-resolution image in different sizes.

The sizes details are deferred for now, and we will implement it later, and we need to store these in AWS S3 buckets so that it can be used.

If you have any open questions , you may ask.

## My Inventories /my/inventories/

1. CRUD
2. List + Search by title, isbn, author, publisher,
3. List should be sortable by Title, Author, Publisher,
   Price, Qty, Date added, Last updated
4. View

5. Create
   Ask category of product selectbox - Book | Soap | Others

   if books:
   SCAN To Add
   Create should first have a button called scan barcode. And once clicking on that should be able to open the scanner view and scan the barcode.
   And once the barcode is being scanned, it should display -
   Scan Success (in GREEN COLOR) or Failed (in RED COLOR).
   if Success
   it should remove un wanted chars like .,- and space and populate on text box.

   Search by ISBN text box and trigger enter key and search should be triggered.

   There

   And there should be a default enter key press and on key press of that event, there should be a search operation that should be triggered.

   That should fill up all the details on the box,
   along with the URL of the cover image.
   also URL also should be displayed as an image
   and also displayed in the image text box. And other details should be populated in relevant textboxes.

   ### Data API

   Open Library Search
   https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data

   ISBNDB Search
   https://api2.isbndb.com/book/{isbn}

   Google Search
   https://www.googleapis.com/books/v1/volumes

   UPCDB Search
   https://api.upcitemdb.com/prod/trial/lookup?upc={isbn}

   Add Mannually

   The following details are .
   UPC in a universal product code.
   GCID,
   part number,
   sell option, smart sell or self cell, - whatever you have choosen in the profile will be applied.
   product title or a book title,
   short description,
   full description,
   SKU,
   product category ID,
   quality,
   quality note,
   ISBN 10, ISBN_13,
   Language, - Use language lookups from lookups app
   edition,
   cover type, - selectbox
   page count,
   publisher, - from publisher select box.
   published date,
   price,
   maximum retail price,
   sale price,
   quantity,
   and also it should link to the product gallery or photo gallery,

   product dimension,
   length, breadth, height in centimeters,
   and
   weight in grams.
   Authors - Multiple select box
   last edited by - automaticall fill the user id of loggedin user,
   view counter, how many times it is being viewed in storefront.there should be a this view counter should be updated,
   inventory note. This is private to the seller, it should not be displayed on the product listing or product detail page.
   Is featured.
   Select state for tax calculation purpose which state he belongs to
   is_active,
   is_archived.

Also add book original pic - and upload to s3 and link to this inventory

# Aside

All aside should have help & user guide links in form
create / edits / list for inventory, orders - [ ]

---

7. Typography - font should be used in this specific font.
8. We should have one dashboard resource,
9. users resource,
10. inventory resource,

# Inventory

Add inventory for 1 Rupee Store,

# Mobile Screen

listing table to cards, with pagination


==================================================
FILE: inventory-completed.md
==================================================

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


==================================================
FILE: react-admin-dash-v1.md
==================================================

# React Admin Based - Seller Dashboard - dash v1

## General

1. Delete - Soft delete & Restore [ ]

## Address

1. Delete - Soft delete & Restore [ ]
2. View - Show component - Restore - show Restore btn for deleted items at the bottom.

## Logistics > Packages /my/packages/

1. Delete - Soft delete & Restore [ ]
2. View - Show component - Restore - show Restore btn for deleted items at the bottom.

## Logistics > Pickup Request - /my/pickups/

#### Validations to be done

1.  Ensure pickup_scheduled_for is greater than pickup_created_at or pickup last updated

scheduled date must be atleast one day after the date of creation(today). Please contact support phone number in that case immediately to prioritize your pickup.'

priority_pickup - boolean field if true it is a priority pickup ignore
the validation and do the pickup.

2.  from_user and to_user should not be same or equal

3.  from_address and to_address should not be same else
    raise validation error.

4.  Make sure pickup req has at least one package

    ```py
    if self.no_of_packages <= 0:
    raise ValidationError({
    'no_of_packages': 'Make sure you are sending at least one package.'
    })

    def save(self, *args, **kwargs):
            # Run full_clean before saving to ensure validations are applied
            self.full_clean()
            super().save(*args, \*\*kwargs)

    ```


==================================================
FILE: react-admin-superadmin-dash.md
==================================================

# dash.putforshare.com/admin/

## General

1. Add copyright at bottom using snippet in
   prd/dash/ra-code/

## Users

1. List User
1. Edit User,
1. BAN A user with reason.
1. Delete - soft_delete user
1. List all Users
   1. sort by created on, updated on, id, earnings, inventories, username, fullname
1. View / Show user - row click default behavior
1. filter by today, this week, this month, from date and to date

## View / Show of User

Should have - two sections
top section - disolay
User Profile pic, Name, email, upi id
created on, updated on, active
Inventories count,
earnings

bottom section
should have tabs - Packages, Pickup Req, Inventories, Addresses, Photos uploaded, Orders, Transactions

## Pickup Request

1. CRUD
2. List All Pickup Req of all users
   1. search by pickup id, contact number, address , pincode, email,
   2. sort by id, weight, package count, created date,
   3. filter by today, this week, this month, from date and to date

## Packages

1. CRUD
2. List All Packages of all users
3. List My Packages

## Address

1. CRUD
2. List All Address of all users
3. List My Addresses

## Photos

1. CRUD meta data
2. upload to s3
3. list

## Inventories

1. CRUD
2. View / Show rowclick default action
3. List

##

1. users,
2. all inventory,
3. all media,
4. complete address book,
5. list of all the authors,
6. list of all the publishers,
7. logistics,
   1. all the shippers available,
   2. all the packages,
   3. all pickup requests,
   4. all carts,
   5. abandoned cart of all users
   6. all the orders of all,
   7. all the purchase orders.
   8. all the sales orders of all the sellers.

## User detail / Show

## User

1. Edit profile So on the header, there should be a My Profile icon at the top right, which will have the initial of the user.[x]
2. on clicking that, you should have something like help,
3. edit my profile,
4. change my password,
5. logout. Okay,
6.
7. And coming back to the seller's admin, so any user who logged in can see his in my inventory, my address, my packages, my pickup request, my uploads,
8. my abandoned cart,
9. my orders,
10. my notifications,
11. my seller dashboard.

## my seller dashboard.

1. upload counts
   1. linked to inventories / orphan / total files count / total media size
2. Inventories sold / total
3. my abandoned cart,
4. my orders,
5. my notifications,
6. my seller dashboard.


==================================================
FILE: super-admin.md
==================================================

## Super Admin

- Create `/admin` entry point in Super Admin UI. [x] PM Verified [ ]
- Implement `/admin` List view with search, filters, and pagination. [x] PM Verified [ ]
- Implement `/admin` Create flow with validation and default values. [x] PM Verified [ ]
- Implement `/admin` Edit flow with validation and state sync. [x] PM Verified [ ]
- Implement `/admin` Show view with summary + related data sections. [x] PM Verified [ ]
- Add AddressBook management under `/admin` (List, Create, Edit, Show). [x] PM Verified [ ]
- Add Inventories management under `/admin` (List, Create, Edit, Show). [x] PM Verified [ ]
- Add Photos management under `/admin` (List, Create, Edit, Show). [x] PM Verified [ ]
- Add Packages management under `/admin` (List, Create, Edit, Show). [x] PM Verified [ ]
- Add Pickup Requests management under `/admin` (List, Create, Edit, Show). [x] PM Verified [ ]

Create a filter. number of user sign UPS Today this week this month. and between two dates in django backend and react admin for users, pickup request, inventories.

› mimic ui of my/pickup-requests in the pickup request in addition to username, fullname, mobile name display. Search by
username, email, mobile, fullname, pincode, from address. Also mimic my/pickup-req/uuid/show.


---

# inventory-completed.md : dash

_Source: `prd/dash/backlog/inventory-completed.md`_

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


---

# react-admin-dash-v1.md : dash

_Source: `prd/dash/backlog/react-admin-dash-v1.md`_

# React Admin Based - Seller Dashboard - dash v1

## General

1. Delete - Soft delete & Restore [ ]

## Address

1. Delete - Soft delete & Restore [ ]
2. View - Show component - Restore - show Restore btn for deleted items at the bottom.

## Logistics > Packages /my/packages/

1. Delete - Soft delete & Restore [ ]
2. View - Show component - Restore - show Restore btn for deleted items at the bottom.

## Logistics > Pickup Request - /my/pickups/

#### Validations to be done

1.  Ensure pickup_scheduled_for is greater than pickup_created_at or pickup last updated

scheduled date must be atleast one day after the date of creation(today). Please contact support phone number in that case immediately to prioritize your pickup.'

priority_pickup - boolean field if true it is a priority pickup ignore
the validation and do the pickup.

2.  from_user and to_user should not be same or equal

3.  from_address and to_address should not be same else
    raise validation error.

4.  Make sure pickup req has at least one package

    ```py
    if self.no_of_packages <= 0:
    raise ValidationError({
    'no_of_packages': 'Make sure you are sending at least one package.'
    })

    def save(self, *args, **kwargs):
            # Run full_clean before saving to ensure validations are applied
            self.full_clean()
            super().save(*args, \*\*kwargs)

    ```


---

# react-admin-superadmin-dash.md : dash

_Source: `prd/dash/backlog/react-admin-superadmin-dash.md`_

# dash.putforshare.com/admin/

## General

1. Add copyright at bottom using snippet in
   prd/dash/ra-code/

## Users

1. List User
1. Edit User,
1. BAN A user with reason.
1. Delete - soft_delete user
1. List all Users
   1. sort by created on, updated on, id, earnings, inventories, username, fullname
1. View / Show user - row click default behavior
1. filter by today, this week, this month, from date and to date

## View / Show of User

Should have - two sections
top section - disolay
User Profile pic, Name, email, upi id
created on, updated on, active
Inventories count,
earnings

bottom section
should have tabs - Packages, Pickup Req, Inventories, Addresses, Photos uploaded, Orders, Transactions

## Pickup Request

1. CRUD
2. List All Pickup Req of all users
   1. search by pickup id, contact number, address , pincode, email,
   2. sort by id, weight, package count, created date,
   3. filter by today, this week, this month, from date and to date

## Packages

1. CRUD
2. List All Packages of all users
3. List My Packages

## Address

1. CRUD
2. List All Address of all users
3. List My Addresses

## Photos

1. CRUD meta data
2. upload to s3
3. list

## Inventories

1. CRUD
2. View / Show rowclick default action
3. List

##

1. users,
2. all inventory,
3. all media,
4. complete address book,
5. list of all the authors,
6. list of all the publishers,
7. logistics,
   1. all the shippers available,
   2. all the packages,
   3. all pickup requests,
   4. all carts,
   5. abandoned cart of all users
   6. all the orders of all,
   7. all the purchase orders.
   8. all the sales orders of all the sellers.

## User detail / Show

## User

1. Edit profile So on the header, there should be a My Profile icon at the top right, which will have the initial of the user.[x]
2. on clicking that, you should have something like help,
3. edit my profile,
4. change my password,
5. logout. Okay,
6.
7. And coming back to the seller's admin, so any user who logged in can see his in my inventory, my address, my packages, my pickup request, my uploads,
8. my abandoned cart,
9. my orders,
10. my notifications,
11. my seller dashboard.

## my seller dashboard.

1. upload counts
   1. linked to inventories / orphan / total files count / total media size
2. Inventories sold / total
3. my abandoned cart,
4. my orders,
5. my notifications,
6. my seller dashboard.


---

# super-admin.md : dash

_Source: `prd/dash/backlog/super-admin.md`_

## Super Admin

- Create `/admin` entry point in Super Admin UI. [x] PM Verified [ ]
- Implement `/admin` List view with search, filters, and pagination. [x] PM Verified [ ]
- Implement `/admin` Create flow with validation and default values. [x] PM Verified [ ]
- Implement `/admin` Edit flow with validation and state sync. [x] PM Verified [ ]
- Implement `/admin` Show view with summary + related data sections. [x] PM Verified [ ]
- Add AddressBook management under `/admin` (List, Create, Edit, Show). [x] PM Verified [ ]
- Add Inventories management under `/admin` (List, Create, Edit, Show). [x] PM Verified [ ]
- Add Photos management under `/admin` (List, Create, Edit, Show). [x] PM Verified [ ]
- Add Packages management under `/admin` (List, Create, Edit, Show). [x] PM Verified [ ]
- Add Pickup Requests management under `/admin` (List, Create, Edit, Show). [x] PM Verified [ ]

Create a filter. number of user sign UPS Today this week this month. and between two dates in django backend and react admin for users, pickup request, inventories.

› mimic ui of my/pickup-requests in the pickup request in addition to username, fullname, mobile name display. Search by
username, email, mobile, fullname, pincode, from address. Also mimic my/pickup-req/uuid/show.


---

# branding_combined_output.txt : dash

_Source: `prd/dash/branding/branding_combined_output.txt`_

==================================================
FILE: colors-typography.md
==================================================

1. remove AI gradient background across all sections, all cards.

# Colors

Navbar background color:
--e-global-color-primary: #007073;

Other colors you can use

--e-global-color-secondary: #007073;
--e-global-color-text: #424242;
--e-global-color-accent: #007073;
--e-global-color-3fdf10c: #731d00;
--e-global-color-0038742: #666;
--e-global-color-e36957e: #262626;
--e-global-color-de602a8: #f3f9f9;
--e-global-color-1a519d7: #f4c833;
--e-global-color-4990f41: #fff1ec;
--e-global-color-d9e3bd8: #d8e6e6;
--e-global-color-d491196: #f13aff;
--e-global-color-898a5ca: #f81284;

"& .RaDatagrid-headerCell": {
backgroundColor: "#007073",
color: '#ede039'
},

"& .RaMenuItemLink-active": {
backgroundColor: 'yellow',
},


---

# colors-typography.md : dash

_Source: `prd/dash/branding/colors-typography.md`_

1. remove AI gradient background across all sections, all cards.

# Colors

Navbar background color:
--e-global-color-primary: #007073;

Other colors you can use

--e-global-color-secondary: #007073;
--e-global-color-text: #424242;
--e-global-color-accent: #007073;
--e-global-color-3fdf10c: #731d00;
--e-global-color-0038742: #666;
--e-global-color-e36957e: #262626;
--e-global-color-de602a8: #f3f9f9;
--e-global-color-1a519d7: #f4c833;
--e-global-color-4990f41: #fff1ec;
--e-global-color-d9e3bd8: #d8e6e6;
--e-global-color-d491196: #f13aff;
--e-global-color-898a5ca: #f81284;

"& .RaDatagrid-headerCell": {
backgroundColor: "#007073",
color: '#ede039'
},

"& .RaMenuItemLink-active": {
backgroundColor: 'yellow',
},


---

# author-publishers.md : dash

_Source: `prd/dash/completed/author-publishers.md`_

What I changed

- Backend serializers:
  - Added AuthorSerializer in backend/apps/api/serializers.py:225
  - Added PublisherSerializer in backend/apps/api/serializers.py:231
- Backend viewsets:
  - Added AuthorViewSet in backend/apps/api/views.py:313
  - Added PublisherViewSet in backend/apps/api/views.py:328
  - Both support list/create/retrieve/update/delete with search + ordering, lookup_field = "uuid", and seller/admin write
    permissions.
- Backend routes:
  - Registered router resources:
    - inventory/authors
    - inventory/publishers
  - Moved count endpoints to avoid path conflict:
    - inventory/authors/with-product-count/
    - inventory/publishers/with-product-count/
  - File: backend/apps/api/urls.py:77
- Frontend react-admin resources:

  - Added Author CRUD screens:
    - AuthorList dash/src/index.jsx:1841
    - AuthorCreate dash/src/index.jsx:1886
    - AuthorEdit dash/src/index.jsx:1896
    - AuthorShow dash/src/index.jsx:1908
  - Added Publisher CRUD screens:
    - PublisherList dash/src/index.jsx:1923
    - PublisherCreate dash/src/index.jsx:1968
    - PublisherEdit dash/src/index.jsx:1980
    - PublisherShow dash/src/index.jsx:1992
  - Added resources to admin:

    - inventory/authors dash/src/index.jsx:4538
    - inventory/publishers dash/src/index.jsx:4548

  - AuthorShow now uses AuthorShowContent:
    - Header card with name/slug + status chips (Active/Inactive, Featured/Not Featured)
    - Biography card
    - Meta card (UUID, Created On, Updated On)
  - PublisherShow now uses PublisherShowContent:
    - Header card with name/slug + status chips
    - Description card
    - Meta card (UUID, Created On, Updated On)


---

# completed.md : dash

_Source: `prd/dash/completed/completed.md`_

## General requirement [x]

1. Use Vite + Material ui + react admin setup
2. No Tailwind CSS for dashboard

## Layout Creation [x]

1. Create Top Navbar with 1 row [x]

   1. Row ht: 60px
   2. Columns : 3 cols
   3. from left - 1st col - width: 30%
   4. 1st col - Added PutForShare as h1 next to the logo in navbar left column.
   5. Set logo container background to #FFF (white).
   6. In the mob screen - Logo is hidden, search box is displayed at the bottom row in navbar
   7. Set logo container background to #FFF (white).

2. from left 2nd col - width 50%
3. from left 3rd col - width 20%.
4. In 2nd col add search box Center to navbar.
5. in 3rd col add CTA right aligned

## User Auth - Use react admin

# Note: All forms to be centered to its container

### Signup Page / component [x]

1. should not have top navbar, or left nav [x]
2. split screen in 2 folds left , right equally, [x]
3. in the left have signup form. ra-code/pfssignup.jsx [x]

4. Signup - req field [x]

   1. Email [x]
   2. Full Name [x]
   3. username @username - must be unique , user should not type @, use a masked field
      http://putforshare.com/@user_name - [x]
      3.1 Generate user name - should generate cool tree name, plant name, fruit name - [x]
   4. Password with show/hide password option in UI.
   5. Accept Terms checkbox at the left aligned. [x]
   6. Add Terms of Service link right aligned. [x]

### Login

1. (ra-code/pfslogin.jsx) email & password [x]
2. In the navbar - in 3rd col After login - Add loggedin Welcome {username} instead of CTA, [x]
3. Add User Profile Menu Icon next to username. [x]

### Logout

1. Logout [x]

### Forgot password

1. Forgot password -> (ra-code/forgotpass.jsx) email link -> Reset password flow [x]

### Change My password

2. Change My password - notify via email. [x]

in all auth screens have this [x]
Trouble with signup ? hi@putforshare.com - or call +91 89516 00629

## Super Admin Dash dash.putforshare.com/#/admin/ - [x]

List Important KPI

1. Total Number of users with active/baned
2. Total Orders - list orders in each status (Booked (4) / Picked (3) / Delivered (1))
3. Total Revenue
4. Total Address
5. Total Packages - Packages Used in pickup req, Orphan packages.
6. Total Pickup req - Draft (3) / Booked (2) / Picked (3) / Cancelled (1)

# Seller Dashboard /my/dashboard/ [x]

List key metrics like

1. Number of orders
2. Revenue
3. Average order value

# Aside

All aside should have help & user guide links in form
create / edits / list for packages, pickup req - [x]

## Logistics > Packages /my/packages/

1. Resource - Packages - List + CRUD - only created by the logged in user [x]
2. Create form [x]
   1. Package Name
   2. Package contains
   3. Weight in Kg
   4. Length , Breadth, Height in CM
   5. No. of packages in the given weight and dimensions
   6. When u create the package in the backend, create individual rows or records based on No. of packages
3. Edit - Edit individual package [x]

## Logistics > Addresses /my/addresses/

1. Resource - Address - List + CRUD - only created by the logged in user [x]
2. Create Address with all the fields in the model [x]

   1. full_name - Contact Person Name , Contact Mob #
   2. building_name - Flat # , House No, Apartment name
   3. company_name
   4. area_sector - Area / Colony / Street / Sector / Village
   5. landmark
   6. town_city
   7. state_region
   8. address_type

      # Hint:

      Display below address_type
      residence (7am to 9pm delivery time)
      commercial (7am to 9pm delivery time)

   9. default_shipping_address = models.BooleanField(default=True)
   10. default_billing_address = models.BooleanField(default=True)

3. Edit - Edit individual address [x]

## Pickup

3. List My Pickup request [x]

## Address

1. CRUD [x]
2. List My Addresses [x]

## Logistics > Addresses /my/addresses/

1. Resource - Address - List + CRUD - only created by the logged in user [x]
2. Create Address with all the fields in the model [x]

   1. full_name - Contact Person Name , Contact Mob #
   2. building_name - Flat # , House No, Apartment name
   3. company_name
   4. area_sector - Area / Colony / Street / Sector / Village
   5. landmark
   6. town_city
   7. state_region
   8. address_type

      # Hint:

      Display below address_type
      residence (7am to 9pm delivery time)
      commercial (7am to 9pm delivery time)

   9. default_shipping_address = models.BooleanField(default=True)
   10. default_billing_address = models.BooleanField(default=True)

3. Edit - Edit individual address [x]

4. owner - Fill this automatically in the backend - user who loggedin and created the pickup req. [x]

5. package - FK To Package,
   One Pickup req can have many packages
6. awb_number = models.CharField(max_length=255)
   shipper
7. from_user - Fill this automatically in the backend - user who loggedin and created the pickup req.

8. from_address - FK to address, Fill this automatically in the backend - user who loggedin and created the pickup req.

9. to_user = models.ForeignKey(User) # FK to user - Always to Warehouse Admin , fetch by email = hi@putforshare.com

10. to_address = models.ForeignKey(Address) - FK to addressbook , fetch by email = hi@putforshare.com

    pickup_request_num = models.CharField(
    max_length=255, blank=True, default='') # Generated by Shipper
    pickup_scheduled_date = models.DateField(auto_now_add=False)
    pickup_ready_start_time = models.DateTimeField(blank=True, null=True)
    pickup_ready_end_time = models.DateTimeField(blank=True, null=True)

    Sum packages by pickup id and fill this value in the backend api

    no_of_packages = models.IntegerField(default=0)

    total_weight = models.DecimalField(
    max_digits=10, decimal_places=2, default='1.00')

    total_invoice_value = models.DecimalField(
    max_digits=10, decimal_places=2, default='1.00')

    fright_charges = models.DecimalField(
    max_digits=10, decimal_places=2, default='1.00')

    status = models.CharField(max_length=255, choices=settings.INBOUND_PICKUP_STATUS_CHOICES,
    blank=True, null=True, default='')

    pickup_mode = models.CharField(
    max_length=50,
    choices=settings.SHIPMENT_MODE_CHOICES,
    default='ROADWAYS_ECONOMY'
    )

    # Any pickup instructions for the admin / logistics team

    pickup_instruction = models.CharField(
    max_length=255, blank=True, null=True, default='')

# AI

we are going to build

1. a seller dashboard using React Admin latest version. [x]
2. Certain components are already done, certain components are yet to be done.
3. Signup, login, logout, signup, [x].
4. Forgot pass -> reset link [ ]
5. The header should have this specific color [x],
6. the header's background, and the height of the header should be 60 pixels. [x]

# Frontend React admin

• Frontend - Features - completed

1. Added shipping label actions in pickup request show page with download flows for All, Summary, and Package Labels.
2. Added status-based visibility for label downloads (BOOKED / READY_FOR_PICKUP only).
3. Added paper size selection a4 or 4x6 thermal printer - in UI and changed it from buttons to radio options (A4 / 4x6 Thermal).
4. Converted /my/packages mobile list to card-based layout with per-card Edit/Delete actions.
5. Converted /my/pickup-requests mobile list to card-based layout with per-card Show/Edit/Delete actions.
6. Added pickup mobile card fields: total weight, pickup instruction, cancellation reason (if any).
7. Added reusable intro blocks (title + brief) for Packages and Pickup Request across list/create/edit/show.
8. Enhanced Edit Profile with username URL masking, plant-style username generation, and WhatsApp share support.

Frontend - Small Tasks

1. Added/updated left menu icons for My Dashboard, Super Admin Dashboard, My Addresses, My Packages, My Pickup Requests.
2. Added package guide aside content and later added package image (card-board-box.png) at top.
3. Added pickup guide aside content for list/create/edit/show.
4. Changed intro titles to include My (My Packages, My Pickup Request).
5. Added 10px margin on all sides for intro sections.
6. Removed spacing after https://putforshare.com/@ in profile username input.
7. Added light background styling for masked username prefix.
8. Updated WhatsApp share message template to: I have put for share few book on https://putforshare.com/@<username>.

Backend - Big Tasks

1. Built shipping label generation system for pickup requests (backend/apps/logistics/labels.py).
2. Added pickup-request label endpoint action: /logistics/pickup-requests/{uuid}/shipping-labels/ with type and paper query
   params.
3. Implemented dual print formats where both summary and package slips follow selected paper size (A4 or 4x6).
4. Reworked address rendering logic for labels: SHIP TO first, Ship From follows, with requested layout offsets.
5. Reworked table layout so package slip also uses table format (one package per label row).

Backend - Updates

1. Removed quantity from summary/package labels.
2. Removed AWB column/fields from labels.
3. Removed tracking info box and related top tracking/package id info.
4. Added Pickup Req #: {id} top-right in both summary and package slips (16px, bold).
5. Removed word Logistics from summary heading.
6. Added CM to dimensions column header (Dimensions (LxBxH) CM).
7. Updated ship-to typography (bold/larger body), then removed ship-to background.
8. Removed borders from ship-to/ship-from blocks.
9. Set ship-from left gap to 40%.
10. Address field ordering/format updates:

- Door No and Street in one line after company name.
- Landmark moved to last line in ship-to.
- Removed email from both ship-to/ship-from.
- Moved mobile to last line in both ship-to/ship-from.

• Implemented my/address backlog tasks from prd/dash/backlog/backlog.md.

### Done

1. Added address_name in backend address model (after user) and migration.

- backend/apps/users/models.py:80
- backend/apps/users/migrations/0006_address_address_name.py:1

2. Made company_name explicitly optional at serializer level.

- backend/apps/api/serializers.py:173

3. Updated admin to include/search address_name.

- backend/apps/users/admin.py:64

4. Refined my/address UI with cleaner create/edit/show/list layout and typography.

- New address intro + helpful aside tips: dash/src/index.jsx:233, dash/src/index.jsx:387
- Better card-style list with show/edit/delete actions: dash/src/index.jsx:540
- Structured create/edit forms (sectioned cards): dash/src/index.jsx:689
- Clean show page (card layout + meta): dash/src/index.jsx:840
- Included address_name in pickup address dropdown text: dash/src/index.jsx:1408

- Created On and Updated On should display in my/address show.


---

# completed_combined_output.txt : dash

_Source: `prd/dash/completed/completed_combined_output.txt`_

==================================================
FILE: author-publishers.md
==================================================

What I changed

- Backend serializers:
  - Added AuthorSerializer in backend/apps/api/serializers.py:225
  - Added PublisherSerializer in backend/apps/api/serializers.py:231
- Backend viewsets:
  - Added AuthorViewSet in backend/apps/api/views.py:313
  - Added PublisherViewSet in backend/apps/api/views.py:328
  - Both support list/create/retrieve/update/delete with search + ordering, lookup_field = "uuid", and seller/admin write
    permissions.
- Backend routes:
  - Registered router resources:
    - inventory/authors
    - inventory/publishers
  - Moved count endpoints to avoid path conflict:
    - inventory/authors/with-product-count/
    - inventory/publishers/with-product-count/
  - File: backend/apps/api/urls.py:77
- Frontend react-admin resources:

  - Added Author CRUD screens:
    - AuthorList dash/src/index.jsx:1841
    - AuthorCreate dash/src/index.jsx:1886
    - AuthorEdit dash/src/index.jsx:1896
    - AuthorShow dash/src/index.jsx:1908
  - Added Publisher CRUD screens:
    - PublisherList dash/src/index.jsx:1923
    - PublisherCreate dash/src/index.jsx:1968
    - PublisherEdit dash/src/index.jsx:1980
    - PublisherShow dash/src/index.jsx:1992
  - Added resources to admin:

    - inventory/authors dash/src/index.jsx:4538
    - inventory/publishers dash/src/index.jsx:4548

  - AuthorShow now uses AuthorShowContent:
    - Header card with name/slug + status chips (Active/Inactive, Featured/Not Featured)
    - Biography card
    - Meta card (UUID, Created On, Updated On)
  - PublisherShow now uses PublisherShowContent:
    - Header card with name/slug + status chips
    - Description card
    - Meta card (UUID, Created On, Updated On)


==================================================
FILE: completed.md
==================================================

## General requirement [x]

1. Use Vite + Material ui + react admin setup
2. No Tailwind CSS for dashboard

## Layout Creation [x]

1. Create Top Navbar with 1 row [x]

   1. Row ht: 60px
   2. Columns : 3 cols
   3. from left - 1st col - width: 30%
   4. 1st col - Added PutForShare as h1 next to the logo in navbar left column.
   5. Set logo container background to #FFF (white).
   6. In the mob screen - Logo is hidden, search box is displayed at the bottom row in navbar
   7. Set logo container background to #FFF (white).

2. from left 2nd col - width 50%
3. from left 3rd col - width 20%.
4. In 2nd col add search box Center to navbar.
5. in 3rd col add CTA right aligned

## User Auth - Use react admin

# Note: All forms to be centered to its container

### Signup Page / component [x]

1. should not have top navbar, or left nav [x]
2. split screen in 2 folds left , right equally, [x]
3. in the left have signup form. ra-code/pfssignup.jsx [x]

4. Signup - req field [x]

   1. Email [x]
   2. Full Name [x]
   3. username @username - must be unique , user should not type @, use a masked field
      http://putforshare.com/@user_name - [x]
      3.1 Generate user name - should generate cool tree name, plant name, fruit name - [x]
   4. Password with show/hide password option in UI.
   5. Accept Terms checkbox at the left aligned. [x]
   6. Add Terms of Service link right aligned. [x]

### Login

1. (ra-code/pfslogin.jsx) email & password [x]
2. In the navbar - in 3rd col After login - Add loggedin Welcome {username} instead of CTA, [x]
3. Add User Profile Menu Icon next to username. [x]

### Logout

1. Logout [x]

### Forgot password

1. Forgot password -> (ra-code/forgotpass.jsx) email link -> Reset password flow [x]

### Change My password

2. Change My password - notify via email. [x]

in all auth screens have this [x]
Trouble with signup ? hi@putforshare.com - or call +91 89516 00629

## Super Admin Dash dash.putforshare.com/#/admin/ - [x]

List Important KPI

1. Total Number of users with active/baned
2. Total Orders - list orders in each status (Booked (4) / Picked (3) / Delivered (1))
3. Total Revenue
4. Total Address
5. Total Packages - Packages Used in pickup req, Orphan packages.
6. Total Pickup req - Draft (3) / Booked (2) / Picked (3) / Cancelled (1)

# Seller Dashboard /my/dashboard/ [x]

List key metrics like

1. Number of orders
2. Revenue
3. Average order value

# Aside

All aside should have help & user guide links in form
create / edits / list for packages, pickup req - [x]

## Logistics > Packages /my/packages/

1. Resource - Packages - List + CRUD - only created by the logged in user [x]
2. Create form [x]
   1. Package Name
   2. Package contains
   3. Weight in Kg
   4. Length , Breadth, Height in CM
   5. No. of packages in the given weight and dimensions
   6. When u create the package in the backend, create individual rows or records based on No. of packages
3. Edit - Edit individual package [x]

## Logistics > Addresses /my/addresses/

1. Resource - Address - List + CRUD - only created by the logged in user [x]
2. Create Address with all the fields in the model [x]

   1. full_name - Contact Person Name , Contact Mob #
   2. building_name - Flat # , House No, Apartment name
   3. company_name
   4. area_sector - Area / Colony / Street / Sector / Village
   5. landmark
   6. town_city
   7. state_region
   8. address_type

      # Hint:

      Display below address_type
      residence (7am to 9pm delivery time)
      commercial (7am to 9pm delivery time)

   9. default_shipping_address = models.BooleanField(default=True)
   10. default_billing_address = models.BooleanField(default=True)

3. Edit - Edit individual address [x]

## Pickup

3. List My Pickup request [x]

## Address

1. CRUD [x]
2. List My Addresses [x]

## Logistics > Addresses /my/addresses/

1. Resource - Address - List + CRUD - only created by the logged in user [x]
2. Create Address with all the fields in the model [x]

   1. full_name - Contact Person Name , Contact Mob #
   2. building_name - Flat # , House No, Apartment name
   3. company_name
   4. area_sector - Area / Colony / Street / Sector / Village
   5. landmark
   6. town_city
   7. state_region
   8. address_type

      # Hint:

      Display below address_type
      residence (7am to 9pm delivery time)
      commercial (7am to 9pm delivery time)

   9. default_shipping_address = models.BooleanField(default=True)
   10. default_billing_address = models.BooleanField(default=True)

3. Edit - Edit individual address [x]

4. owner - Fill this automatically in the backend - user who loggedin and created the pickup req. [x]

5. package - FK To Package,
   One Pickup req can have many packages
6. awb_number = models.CharField(max_length=255)
   shipper
7. from_user - Fill this automatically in the backend - user who loggedin and created the pickup req.

8. from_address - FK to address, Fill this automatically in the backend - user who loggedin and created the pickup req.

9. to_user = models.ForeignKey(User) # FK to user - Always to Warehouse Admin , fetch by email = hi@putforshare.com

10. to_address = models.ForeignKey(Address) - FK to addressbook , fetch by email = hi@putforshare.com

    pickup_request_num = models.CharField(
    max_length=255, blank=True, default='') # Generated by Shipper
    pickup_scheduled_date = models.DateField(auto_now_add=False)
    pickup_ready_start_time = models.DateTimeField(blank=True, null=True)
    pickup_ready_end_time = models.DateTimeField(blank=True, null=True)

    Sum packages by pickup id and fill this value in the backend api

    no_of_packages = models.IntegerField(default=0)

    total_weight = models.DecimalField(
    max_digits=10, decimal_places=2, default='1.00')

    total_invoice_value = models.DecimalField(
    max_digits=10, decimal_places=2, default='1.00')

    fright_charges = models.DecimalField(
    max_digits=10, decimal_places=2, default='1.00')

    status = models.CharField(max_length=255, choices=settings.INBOUND_PICKUP_STATUS_CHOICES,
    blank=True, null=True, default='')

    pickup_mode = models.CharField(
    max_length=50,
    choices=settings.SHIPMENT_MODE_CHOICES,
    default='ROADWAYS_ECONOMY'
    )

    # Any pickup instructions for the admin / logistics team

    pickup_instruction = models.CharField(
    max_length=255, blank=True, null=True, default='')

# AI

we are going to build

1. a seller dashboard using React Admin latest version. [x]
2. Certain components are already done, certain components are yet to be done.
3. Signup, login, logout, signup, [x].
4. Forgot pass -> reset link [ ]
5. The header should have this specific color [x],
6. the header's background, and the height of the header should be 60 pixels. [x]

# Frontend React admin

• Frontend - Features - completed

1. Added shipping label actions in pickup request show page with download flows for All, Summary, and Package Labels.
2. Added status-based visibility for label downloads (BOOKED / READY_FOR_PICKUP only).
3. Added paper size selection a4 or 4x6 thermal printer - in UI and changed it from buttons to radio options (A4 / 4x6 Thermal).
4. Converted /my/packages mobile list to card-based layout with per-card Edit/Delete actions.
5. Converted /my/pickup-requests mobile list to card-based layout with per-card Show/Edit/Delete actions.
6. Added pickup mobile card fields: total weight, pickup instruction, cancellation reason (if any).
7. Added reusable intro blocks (title + brief) for Packages and Pickup Request across list/create/edit/show.
8. Enhanced Edit Profile with username URL masking, plant-style username generation, and WhatsApp share support.

Frontend - Small Tasks

1. Added/updated left menu icons for My Dashboard, Super Admin Dashboard, My Addresses, My Packages, My Pickup Requests.
2. Added package guide aside content and later added package image (card-board-box.png) at top.
3. Added pickup guide aside content for list/create/edit/show.
4. Changed intro titles to include My (My Packages, My Pickup Request).
5. Added 10px margin on all sides for intro sections.
6. Removed spacing after https://putforshare.com/@ in profile username input.
7. Added light background styling for masked username prefix.
8. Updated WhatsApp share message template to: I have put for share few book on https://putforshare.com/@<username>.

Backend - Big Tasks

1. Built shipping label generation system for pickup requests (backend/apps/logistics/labels.py).
2. Added pickup-request label endpoint action: /logistics/pickup-requests/{uuid}/shipping-labels/ with type and paper query
   params.
3. Implemented dual print formats where both summary and package slips follow selected paper size (A4 or 4x6).
4. Reworked address rendering logic for labels: SHIP TO first, Ship From follows, with requested layout offsets.
5. Reworked table layout so package slip also uses table format (one package per label row).

Backend - Updates

1. Removed quantity from summary/package labels.
2. Removed AWB column/fields from labels.
3. Removed tracking info box and related top tracking/package id info.
4. Added Pickup Req #: {id} top-right in both summary and package slips (16px, bold).
5. Removed word Logistics from summary heading.
6. Added CM to dimensions column header (Dimensions (LxBxH) CM).
7. Updated ship-to typography (bold/larger body), then removed ship-to background.
8. Removed borders from ship-to/ship-from blocks.
9. Set ship-from left gap to 40%.
10. Address field ordering/format updates:

- Door No and Street in one line after company name.
- Landmark moved to last line in ship-to.
- Removed email from both ship-to/ship-from.
- Moved mobile to last line in both ship-to/ship-from.

• Implemented my/address backlog tasks from prd/dash/backlog/backlog.md.

### Done

1. Added address_name in backend address model (after user) and migration.

- backend/apps/users/models.py:80
- backend/apps/users/migrations/0006_address_address_name.py:1

2. Made company_name explicitly optional at serializer level.

- backend/apps/api/serializers.py:173

3. Updated admin to include/search address_name.

- backend/apps/users/admin.py:64

4. Refined my/address UI with cleaner create/edit/show/list layout and typography.

- New address intro + helpful aside tips: dash/src/index.jsx:233, dash/src/index.jsx:387
- Better card-style list with show/edit/delete actions: dash/src/index.jsx:540
- Structured create/edit forms (sectioned cards): dash/src/index.jsx:689
- Clean show page (card layout + meta): dash/src/index.jsx:840
- Included address_name in pickup address dropdown text: dash/src/index.jsx:1408

- Created On and Updated On should display in my/address show.


==================================================
FILE: inventory-show.md
==================================================

in the inventory show do the following
card 1
two blocks -
{Book cover image}s(4) and s(8) - Book info
Book title
by - {authors}
PFS ID - {ID} big font
Publisher : {publisher}

                                    price
                                    Price: ₹100.00
                                    Max Retail Price: ₹200.00
                                    Sale Price: ₹100.00

                                    Stock Qty: 10

                                    Featured: No (Green - yes, Red - No)

                                    Active: No (Green - yes, Red - No)

---

Card 2
Short description :{short desc}
Long description: {long desc}

---

Card 3

Dimensions:
L x B x H in cm s(6) Weight in grams s(6)
{l} x {b} x h {weight}

---

Card 4

Meta:

--

all created_on , updated_on should be in this format across all resources
Sat 21 Feb 2025 10:34 AM or  
Sat 21 Feb 2025 15:34 PM


---

# inventory-show.md : dash

_Source: `prd/dash/completed/inventory-show.md`_

in the inventory show do the following
card 1
two blocks -
{Book cover image}s(4) and s(8) - Book info
Book title
by - {authors}
PFS ID - {ID} big font
Publisher : {publisher}

                                    price
                                    Price: ₹100.00
                                    Max Retail Price: ₹200.00
                                    Sale Price: ₹100.00

                                    Stock Qty: 10

                                    Featured: No (Green - yes, Red - No)

                                    Active: No (Green - yes, Red - No)

---

Card 2
Short description :{short desc}
Long description: {long desc}

---

Card 3

Dimensions:
L x B x H in cm s(6) Weight in grams s(6)
{l} x {b} x h {weight}

---

Card 4

Meta:

--

all created_on , updated_on should be in this format across all resources
Sat 21 Feb 2025 10:34 AM or  
Sat 21 Feb 2025 15:34 PM


---

# dash_combined_output.txt : dash

_Source: `prd/dash/dash_combined_output.txt`_

==================================================
FILE: observations.md
==================================================

# Author

1. Remove Authors CRUD, listing for SELLERS

# Author for /admin - ADMIN Role

2. In edit author, create author, slug should not be asked as input
3. In edit when author name changes slug should be auto generated
4. Slug should be displayed in the show component.
5. listing: row click should be edit

# Publishers

Remove Publishers CRUD, listing for SELLERS

# Publisher for /admin - ADMIN Role

1. listing: in Publisher listing add sort by Created on, last updated. Default : last updated.
2. listing: row click should be edit
3. edit: when author name changes slug should be auto generated

# My Address

1. Edit address, Create Address look and feel, can expand in mobile screen to full mob width

2. Pincode should be before Area colony and should auto populate the Area, Town, State values.
3. Also pincode once entered should be checked for validity and service availability check and should display - Service Available - green color bg / Service Not Available - red color bg
4. Only company name, landmark are optional other fields are required in the form, make required changes in the Address model, serializer if required, views if required.

in Address aside -
Helpful info
Address Tips

Use a clear address name like Home, Office, or Warehouse.
Keep pincode, city, and state correct to avoid pickup issues.
User Service Availability to check if service is available in your locality.
Set defaults so shipping and billing are auto-selected.

# Profile

http://localhost:5173/#/my/profile/edit
isSellerPlanLocked is not defined - error

# Change my password

Add eye icon for Current password, New Password.

# My Dashboard

Add Pincode Service Availablity Count Metrics

Pincodes servicable / Total Pincodes

# All Resource listing

Remove Export in all listing in all resources.

My Photos

Help
Alt Tag -


---

# observations.md : dash

_Source: `prd/dash/observations.md`_

# Author

1. Remove Authors CRUD, listing for SELLERS

# Author for /admin - ADMIN Role

2. In edit author, create author, slug should not be asked as input
3. In edit when author name changes slug should be auto generated
4. Slug should be displayed in the show component.
5. listing: row click should be edit

# Publishers

Remove Publishers CRUD, listing for SELLERS

# Publisher for /admin - ADMIN Role

1. listing: in Publisher listing add sort by Created on, last updated. Default : last updated.
2. listing: row click should be edit
3. edit: when author name changes slug should be auto generated

# My Address

1. Edit address, Create Address look and feel, can expand in mobile screen to full mob width

2. Pincode should be before Area colony and should auto populate the Area, Town, State values.
3. Also pincode once entered should be checked for validity and service availability check and should display - Service Available - green color bg / Service Not Available - red color bg
4. Only company name, landmark are optional other fields are required in the form, make required changes in the Address model, serializer if required, views if required.

in Address aside -
Helpful info
Address Tips

Use a clear address name like Home, Office, or Warehouse.
Keep pincode, city, and state correct to avoid pickup issues.
User Service Availability to check if service is available in your locality.
Set defaults so shipping and billing are auto-selected.

# Profile

http://localhost:5173/#/my/profile/edit
isSellerPlanLocked is not defined - error

# Change my password

Add eye icon for Current password, New Password.

# My Dashboard

Add Pincode Service Availablity Count Metrics

Pincodes servicable / Total Pincodes

# All Resource listing

Remove Export in all listing in all resources.

My Photos

Help
Alt Tag -


---

# ra-code_combined_output.txt : dash

_Source: `prd/dash/ra-code/ra-code_combined_output.txt`_


