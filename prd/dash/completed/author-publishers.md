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
