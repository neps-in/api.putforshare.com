# PINCODE

# Backend v1 PRD

- Profile edit endpoint missing
- if mobile_verified_on && mobile_verified_on is not null indication present not double tick. [x]
  following fields should be read only.
- inventories - positive integer [x]
- Net earnings - Not positive integer [x]
- Add link to change my password saying "Change My Password" [x]

# Inventory

- Search to be done with ISBN/GTIN/tags/author/category backend search APIs. - [ ] Verify
- Category - crud , listing - suggest best django packages for categories, sub categories and we can use one of them [ ] toDo
- pages with image + inventory counts not implemented.
- Invoice PDF and shipping label not implemented. [ ] toDo
- PRD v1.1 slug auto-populate is not implemented across models - [ ] Verify
- PRD v1.1 book data fetch (Google Books etc.) not implemented - [ ] Todo
- Scan barcode,
- Take pick and upload to s3
- After adding inventories we need to check if user has correct number of inventories. [ ] V

- Notifications (email with ses + anymail) [ ] T
- Notifications via WhatsApp evolution api. [ ] T

- Celery/Redis not present in dependencies/settings: backend/requirements.txt:1.
- Caching/fraud-prevention/captcha.

# General:

All create, update successful completion should redirect to corresponding list. [ ] V

# Inventory:

1. Delete user that has pickup req, inventory, address, order, should not be allowed, if it shows useful error message that will be great. [ ] T
2. It would be nice to display number of inventories (active/total) against each user in user listing [ ] T
3. Add Inventory link for user should be added, with Go live , Go live & Add One more, Save as Draft, Clear or Reset. [ ] T
4. Show Featured Images in the inventory listing. [ ] T
5. Add product info from amazon, google books. [ ] T

# Celery + Redis

1.  pdf shipping label creation
2.  All Email Notifications
3.  All Whatsapp Notifications

---
