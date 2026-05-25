User details to be captured are

1. email,
2. username,
3. password,
4. UUID,
5. full name,
6. email verification token
7. email verified 0/1
8. email verification expiry
9. mobile,
10. mobile verified 0/1,
11. mobile last verified on,
12. UPI ID,
13. UPI ID last verified on,
14. seller plan - options () self-sell, smart sell, donate)
15. And in the donation, how much percentage? 50% or 100%.
16. Net earnings and
17. role - GUEST, BUYER, SELLER,
18. created on,
19. updated on,
20. active - 0/1,
21. favorite_book
22. archived - 0/1

0/1 means its a boolean field , True or False

In the user profile table, the nickname field should be auto-generated with unique cool names formed, something like Reddit usernames. Okay,

We need to have a media model. That media model should have the following things like,
UUID, file name, alt tag,
file type - that should be captured from the content type,
S3 URL,
media upload,
and when it was created on,
status should be a Boolean field,
archived should be a Boolean field.

This media model acts as a central repository for all media,
whether it is used as a profile image in the profile model or whether it is in an image that is associated with the inventory in the inventory model.
any image can be reused so that one image can be associated with multiple inventories or multiple profiles,
And one inventory can have multiple images, that linking should be taken care.

There is no need to upgrade role.
By default, if a user has inventory to sell, he becomes a seller, and otherwise, he is a buyer the moment he logs in.
So the default user role once for every authenticated user will be a buyer role.

user after login should be able to change password

## Rename these

2. don't use listing rather use Inventory
3. Use UserProfile instead of sellerprofile

## update 2

1. for css use tailwind css

2. Allow user to create nickname, make sure its unique if not suggest 5 alternate nicknames.

## Inventory

4. There are three inventory category
   1. Books
   2. Soaps
   3. Electronics Goods
5. Each inventory type has some common fields like ID, UUID, title, description - which is a text field, and created on, updated on, is active, archive. And there are specific fields to different categories,
   1. like for the soap, you have a separate set of fields,
   2. Net weight - it should be a number in grams.
   3. Ingredients, it should be a text field.
   4. Scent or essential oil, that should be a text field. 10. Skin type, that should be a text field.
   5. Shelf life in months, that should be a number.
   6. How to use, that should be a text field.
   7. Safety information, text field.
   8. Soap care, text field.
   9. Disclaimer, text field.
6. and for electronic goods, it should be extensible for different inventories type there are a separate set of fields. Okay, so you need to manage this model in the best possible way.

7.
