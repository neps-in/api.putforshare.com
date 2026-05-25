## User Management

Backend API

Frontend UI

1. User Signup

2. User login

   1. ui validation - check if its a valid email
   2. backend validation - check if the email exist

3. forgotpass

   1. ui validation - check if its a valid email
   2. backend validation - check if the email exist

4. Change password after login
5. Edit profile
   use django anymail for email and aws ses as emailer

## User related features

1. List all user in a grid with info like - User profile image , @user_name, full_name, inventory_count.
2. Clicking on the user, should take to user info on top and list of inventories below like cards
   1. Each inventory card should have
      1. Product Image.
      2. Product Title.
      3. Price.
      4. Product Quality.

## Admin User management

1. Add a user
2. Ban User, make this user as is_active false.
   1. When the user is banned - Notify the user via email with the reason for Ban.
   2. When the user login , display error message as " You are Banned"
3. Un Ban or Reactivate User.
   3.1. When Un Ban or Reactivate a user , Notify user
4. List all users
5. Clicking on user in list - takes to user detail page
6. Add Inventory for him - Add a link "Add inventory" against each user in user listing.
