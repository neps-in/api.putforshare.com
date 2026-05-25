# Author , Publishers , Category listing

1. Backend: author/publisher count APIs + GraphQL support

- Added serializers:
  - backend/apps/api/serializers.py
    - AuthorWithProductCountSerializer
    - PublisherWithProductCountSerializer
- Added querysets + list views:
  - backend/apps/api/views.py
    - get_author_count_queryset()
    - get_publisher_count_queryset()
    - AuthorWithProductCountListAPIView
    - PublisherWithProductCountListAPIView
- Added REST endpoints:
  - backend/apps/api/urls.py
    - GET /api/v1/inventory/authors/
    - GET /api/v1/inventory/publishers/
- Extended GraphQL handler fields:
  - authorsWithProductCount
  - publishersWithProductCount

2. Frontend: Browse links + new pages

- Added API functions:
  - store/src/api.js
    - fetchAuthorsWithProductCount()
    - fetchPublishersWithProductCount()
    - updated fetchBrowseMenuSummary() to return real author/publisher counts
- Updated Browse submenu links in header:
  - store/src/App.jsx
    - Authors (count) now links to /authors
    - Publishers (count) now links to /publishers
- Added pages/routes:
  - store/src/App.jsx
    - AuthorsPage
    - PublishersPage
    - routes:
      - /authors
      - /publishers

Also added related API tests in backend/apps/api/tests.py for author/publisher count endpoints and GraphQL query.

# Human readable error - Completed & Verified [x]

All 400 bad request are converted to error response and displayed in the frontend.

- store/src/App.jsx
  - Added username state in SignupPage.
  - Inserted Username input as second field (after Full name, before Email).
  - Updated submit call to signup({ fullName, username, email, password }).
  - Split inline errors so full_name and username show on their own fields.
- store/src/authClient.js
  - Updated signup to accept and pass explicit username (no auto-derive from email anymore).

# Backend Completed PRD

Migrations for 'inventory': [x]
apps/inventory/migrations/0005_alter_author_options_alter_publisher_options_and_more.py
~ Change Meta options on author
~ Change Meta options on publisher + Add field is_featured to author + Add field slug to author + Add field is_featured to publisher + Add field slug to publisher

# Photos app created

- New app scaffold at backend/apps/photos/ (admin.py, apps.py, models.py, views.py, tests.py, migrations/**init**.py).
- Set app config path in backend/apps/photos/apps.py:5 to name = "apps.photos".
- Registered app in backend/config/settings.py:26 by adding "apps.photos" to INSTALLED_APPS.
- Ran Django validation: ./.venv/bin/python manage.py check -> System check identified no issues (0 silenced).

- add favourite_book - textfield [x]

---

• Done. Added 1:1 photo links for all three models and wired API/UI.

Model changes

- backend/apps/inventory/models.py
  - Author.photo → OneToOneField("photos.Photo", null=True, blank=True, on_delete=SET_NULL)
  - Publisher.brand_image → OneToOneField("photos.Photo", null=True, blank=True, on_delete=SET_NULL)
- backend/apps/users/models.py
  - User.profile_image → OneToOneField("photos.Photo", null=True, blank=True, on_delete=SET_NULL)

Migrations

- backend/apps/inventory/migrations/0012_author_photo_publisher_brand_image.py
- backend/apps/users/migrations/0008_user_profile_image.py
- Applied successfully with manage.py migrate.

API serializer updates

- backend/apps/api/serializers.py
  - AuthorSerializer now supports photo_uuid
  - PublisherSerializer now supports brand_image_uuid
  - UserSerializer exposes profile_image_uuid (read)
  - ProfileEditSerializer supports profile_image_uuid (write)

Dashboard updates

- dash/src/index.jsx
  - Author create/edit: added photo selector (photo_uuid) from photos resource
  - Publisher create/edit: added brand image selector (brand_image_uuid)
  - Author/Publisher show: displays photo/brand image UUID
  - Edit profile: added Profile Image UUID field and save support

Verification

- backend: manage.py check passed
- dash: npm run build passed
  • Done. Added photo support for publisher and user as well.

  What I changed:

  - Backend (backend/apps/api/serializers.py)
    - PublisherSerializer:
      - added brand_image_url (read)
    - UserSerializer:
      - added profile_image_url (read)
    - ProfileEditSerializer:
      - added profile_image_url (read)
  - Frontend (dash/src/index.jsx)
    - Publisher list:
      - added round brand image preview column from brand_image_url
    - Publisher show:
      - added large brand image block in header (like author photo style)
    - User:
      - top nav avatar now uses identity.profile_image_url if present (fallback to initial)

  Already done in prior step:

  - Author list/show photo rendering from photo_url.

## Forgot-password email send/reset flow

    Make sure these things exists in /reset-password form
    only 3 text boxes should be there
    1. Don' t send email, display in django console
    2. reset token - disabled
    3. ask for new password and also have a eye like icon at the end of the new password textbox
    to show or hide.
    4. confirm new password

And once you "Save New Password" delete verification token [x]
