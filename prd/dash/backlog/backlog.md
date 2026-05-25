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
