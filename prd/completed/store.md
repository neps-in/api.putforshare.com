# store

# PRD v2

## Tech stack

Backend: DRF + Graphql + postgres + celery + redis
Frontend: Reactjs + tailwindcss

## Django models

1. Create common model called UUIDModel should have uuid and all other models should subclass. [x]
2. All routing should be through uuid eg: inventory/:uuid [x]
3. Standardize identifiers as: [x]
   - `id` for internal DB relations (primary key)
   - `uuid` for public APIs/routes (`UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)`)

# User management

User model - use the following user model, any suggestions welcome [x]

## User actions

1. Signup [x]
2. login [x]
   1. ui validation - check if its a valid email [x]
   2. backend validation - check if the email exist [x]
3. forgotpass [x]
   1. ui validation - check if its a valid email [x]

## My Profile

edit profile [x]
after login change password [x]
