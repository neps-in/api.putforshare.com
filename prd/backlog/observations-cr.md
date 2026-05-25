# dashboard - admin dashboard,

    you need to show cards with stats count.

    In the catalogs card display active /  banned catalogs/ Total.
     In users card display active users / banned users / total number of users.
     In Shippers card display active shippers / shippers.
     In staff card display total number of active staff / staffs
     In Admins card display active admins / total number of admins
     In pin codes card display  inactive pincodes / active number of pin codes /total number of pin codes.
     In embargoes list count of pincodes in embargo.
     In packages, total number of packages,
     In storecredit effective store credit ,
     In Pickup Fees total pickup fees that you can have,
     In Inventories, total number of inventories, in-stock inventories, sold out inventories,
     In Pickup Req.
     Display - draft mode / booked / ready for pickup / picked / received / cancelled / total pickups created / and total number of pickup requests,

# Listing & CRUD Operation

## CRUD Operation

1. All Create & Edit operation should have dirty check. If the user edited or input any text or any input and if he cancels, navigates to different section . Alert - Not saved should "return back and save" - Default CTA or ignore changes or cancel.
2. Clicking a row will default to Show operation.
3. All DELETE operation will be soft delete which will make archived to true.
4. Once archived, it will not displayed in user listing and will be displayed only on admin listing.

In the listing, do the following.

## User listing

1. In the user listing, display the following items in the same order, Clicking a row will default to show.

   1. actions,() edit, delete, and view.
   2. Clicking on the row will trigger show action.
   3. These are the following list of items to be displayed for the users.
      1. ID (sortable in ASC or DESC)
      2. add inventory for the user - link. It should be a link to add inventory items with the user selected.
      3. User detail. User detail will have user full name, username, email ID, and what kind of user he is, seller or buyer, or whatever it is.
      4. Email verification email verification token, (sortable in ASC or DESC)
      5. Mobile Number Verification - yes / no.(sortable in ASC or DESC)
      6. Plan (sortable in ASC or DESC)
      7. Donate book option, 50% or 100%.(sortable in ASC or DESC)
      8. Number of inventories (sortable in ASC or DESC)
      9. Number of address, (sortable in ASC or DESC)
      10. Total store credit, (sortable in ASC or DESC)
      11. Net earnings, (sortable in ASC or DESC)
      12. UPI ID,(sortable in ASC or DESC)
      13. UPI Verified yes/no
      14. UPI Verified on (sortable in ASC or DESC)
      15. Active,(sortable in ASC or DESC)
      16. Staff,(sortable in ASC or DESC)
      17. Super user,(sortable in ASC or DESC)
      18. created on,(sortable in ASC or DESC)
      19. updated on.(sortable in ASC or DESC)

## User Show

20. And when clicking on a specific user, we should display show
21. the user's detail with the user profile photo and user basic details like username, email ID, mobile number, earnings.
22. And we should have tabs like pickup request, inventories, sales orders, and the purchase orders.

# Photos listing

1. Photos listing should have the following row. Clicking a row will default to show.
   1. Actions, edit and delete,
   2. ID, (sortable in ASC or DESC)
   3. image preview,
   4. inventory associated with (sortable in ASC or DESC)
   5. image URL (sortable in ASC or DESC)
   6. file name (sortable in ASC or DESC)
   7. alt tag (sortable in ASC or DESC)
   8. status (sortable in ASC or DESC)
   9. is archived (sortable in ASC or DESC)
   10. created on (sortable in ASC or DESC)
   11. updated on (sortable in ASC or DESC)

# Inventory Listing

1. Inventories should have a listing with the following fields in the same order.

   1. action - edit, view, delete.
   2. ID - table header PFS ID, (sortable in ASC or DESC)
   3. Product name, (sortable in ASC or DESC)
   4. Product category, (sortable in ASC or DESC)
   5. Sold by, (sortable in ASC or DESC)
   6. Photo,
   7. Price, (sortable in ASC or DESC)
   8. MRP, (sortable in ASC or DESC)
   9. stock status, (sortable in ASC or DESC)
   10. quantity, (sortable in ASC or DESC)
   11. created on, (sortable in ASC or DESC)
   12. updated on, (sortable in ASC or DESC)
   13. last updated by, (sortable in ASC or DESC)
   14. view counter, (sortable in ASC or DESC)
   15. active - yes or no.(sortable in ASC or DESC)

2. Inventory Create

   1. To add an inventory, there should be a search box.
      1. Provide or scan ISBN number text box.
      2. Scan ISBN BARCODE Button
      3. we should be able to take a photo and scan the ISBN number and fill ISBN Text box.
      4. and then we should be able to retrieve the details from the API using BOOK Meta data API Retrieval section in this prd.
      5. And there should be the following tabs and 1. product detail, 2. images, 3. offer, 4. Safety and Compliance. 5. 6. Product detail Tab. 1. Item name, 2. brand name, 3. Standard external product ID, which is the 1. ISBN-10, 2. ISBN-13, 3. UPC 4. GTIN 5. manufacturer, which will be the publisher, 6. product description, 7. item type name - book or soap or others 8. subject keyword, which will be the SEO keyword. There can be multiple SEO keywords added, and there can be a feature to suggest the list of keywords for this. 9. Number of page units and number of pages, 10. manufacturer contact information, 11. edition that comes under page, 12. and minimum reading age, 13. maximum reading age, minimum reading age units, example years, months, 14. maximum reading age units. 15. Language, 16. language type, published, language, English, 17. publication date, 18. genres, 19. unit count, 20. binding, paperback or coverbook, 21. book binding, 22. unit count, 23. product information, 24. std product information entity HSN code. 25. Subject code, 26. subject code, 27. edition number, 28. contact information, 29. author, author can be multiple authors, should be able to select from. 7. Image Tab. 1. You can add up to eight images, 2. first image will be the featured image. 8. Offer Tab 1. SKU, 2. product type, is it a book or whatever it is, 3. quantity, 4. price, 5. listing price, 6. maximum retail price. 7. There can be a way to automate the pricing - deffered. 8. Item condition, new, like new, very good, good, acceptable. 9. 9. Dimmensions Tab: 1. length, 2. width, 3. height 4. Units - following units, centimeter, feet, inches, millimeter. 5. weight, item weight in unit, milligrams, gram, kilogram, ounces, hundred pounds, pounds, tons.
         . 10. safety and
         compliance tab,
         country,
         region of origin,
         dangerous goods regulation,

   There should be an option to in inventory create save as draft and submit.

# Addressbook

## Search

    Search by email ID, phone number, name, username, and all address field, and
    pin code.

## Listing

The address book listing should have the following fields in the listing, and also there.

the listing has the following fields in the same order.

Action - Edit/ View / Delete, default is View or Show,

ID,(sortable in ASC or DESC)
Name,(sortable in ASC or DESC)
UserName,(sortable in ASC or DESC)
Email ID,(sortable in ASC or DESC)
Mobile #,(sortable in ASC or DESC)
Address.
Landmark,(sortable in ASC or DESC)
Pincode.(sortable in ASC or DESC)
Address type and kind,(sortable in ASC or DESC)
default shipping address,(sortable in ASC or DESC)
default billing address,(sortable in ASC or DESC)
Created on,(sortable in ASC or DESC)
Updated on.(sortable in ASC or DESC)

# Logistics - Packages

## Listing

1. All Package should have
   1. id,
   2. a name,
   3. content info,
   4. No oof items in the box
   5. weight in kg, kg can be different units
   6. length, breadth, height - in cm or different units

## Create

1.  id,
2.  a name,
3.  content info,
4.  No oof items in the box
5.  weight in kg, kg can be different units
6.  length, breadth, height - in cm or different units
7.  created_on, updated_on

in addition to that accept how many boxes in this measurement and in the backend create those many rows or records with unique package id.

## Edit

1.  id,
2.  name,
3.  content info,
4.  No oof items in the box
5.  weight in kg, kg can be different units
6.  length, breadth, height - in cm or different units

# Pickup Req

listing in the following order.

1. action, edit/ view/ delete/ default to view or show.
2. ID,
3. created by,
4. from pincode , to pincode.
5. from address and to address,
6. number of packages,
7. total weight of all packages,
8. fright charges,
9. shipper,
10. pickup scheduled date,
11. pickup instruction any,
12. pickup mode,
13. created on,
14. updated on,
15. pickup status: as draft, booked, ready for pickup, picked up, request cancellation cancellation approved.
16. Download shipping label.
    User can have preferred units for display. but system and shipping labels will be in standard units used across industries
    https://claude.ai/chat/01069e78-6839-4842-bc21-d7eea59291a3
    https://chatgpt.com/c/69929c65-1f3c-8322-92ea-2a355cc6225d

# Book Meta data API Retrieval

Book API, there are different book APIs like Google Books. So we should call those APIs and get the referer information in JSON format. And these APIs returns different keys with values, okay? We have different API calls like Google Books and some other API vendors. We should normalize all those API into API responses with a single key, with proper key and value as we have in our database, and then populate the values in the text boxes. And we should download the image of when you are saving in an asynchronous way using Celery task.

And after the image is downloaded, recreate the image in a different format with the high resolution in different formats like for a webp format and other formats like JPEG or PNG, and in different sizes.

filename-thumbnail-h-height-w-width-px.ext
