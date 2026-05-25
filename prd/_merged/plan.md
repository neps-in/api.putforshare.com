# Merged content — prd/plan/

_4 file(s) combined on this page._


---

# email-sending.todo : plan

_Source: `prd/plan/email-sending.todo`_

# List of Transactional Emails to be sent

## Admin Email

- Notify admin when someone signup
- Notify admin when someone place an order and the order is complete

## SMART_SELL

- Mark all the products as SMART_SELL in the production db




- Notify admin when an product item with type = SMART_SELL 


## 1. Account Emails

- **Welcome Email** — Sent on successful account registration.
- **Email Verification** — OTP or link to verify email address.
- **Password Reset** — Link to reset forgotten password.
- **Password Changed** — Confirms the password was successfully updated.
- **Account Deactivated** — Notifies the customer their account has been deactivated.
- **Account Deleted** — Confirms account deletion upon request.
- **Profile Updated** — Confirms changes to account details.
- **Login Alert (New Device)** — Security alert for login from an unrecognized device.


## 1. Order Emails

- **Order Confirmation** — Sent immediately after a customer places an order. Includes order ID, items, price, and estimated delivery.
- **Order Received / Processing** — Confirms the store has received and is processing the order.
- **Order Cancelled** — Sent when an order is cancelled by the customer or store.
- **Order Modified** — Sent when items, quantity, or address is changed after placing the order.

---

## 2. Payment Emails

- **Payment Confirmation** — Confirms successful payment with transaction ID and amount.
- **Payment Failed** — Notifies the customer that payment was unsuccessful with retry instructions.
- **Payment Refund Initiated** — Informs the customer a refund has been triggered.
- **Refund Successful** — Confirms the refund amount has been credited back.
- **Partial Refund** — Sent when only part of the order amount is refunded.
- **Invoice / Receipt** — Detailed billing document sent after payment.
- **Payment Reminder** — For pay-later or pending payment orders.

---

## 3. Shipping & Delivery Emails

- **Order Shipped** — Confirms dispatch with courier name and tracking number.
- **Out for Delivery** — Notifies the customer the package is on its way today.
- **Order Delivered** — Confirms successful delivery.
- **Delivery Attempted / Failed** — Sent when the courier couldn't deliver the package.
- **Delivery Rescheduled** — When a new delivery date is set.
- **Shipment Delayed** — Alerts the customer about unexpected delays.
- **Tracking Update** — Periodic updates on shipment location/status.

---

## 4. Return & Refund Emails

- **Return Request Received** — Acknowledges the customer's return request.
- **Return Approved** — Confirms the return is accepted with instructions.
- **Return Rejected** — Explains why the return was not accepted.
- **Return Picked Up** — Confirms the courier has collected the return item.
- **Return Received at Warehouse** — Confirms the returned item has arrived.
- **Exchange Initiated** — Sent when a product exchange is processed.

---

## 5. Account Emails

- **Welcome Email** — Sent on successful account registration.
- **Email Verification** — OTP or link to verify email address.
- **Password Reset** — Link to reset forgotten password.
- **Password Changed** — Confirms the password was successfully updated.
- **Account Deactivated** — Notifies the customer their account has been deactivated.
- **Account Deleted** — Confirms account deletion upon request.
- **Profile Updated** — Confirms changes to account details.
- **Login Alert (New Device)** — Security alert for login from an unrecognized device.

---

## 6. Cart & Checkout Emails

- **Abandoned Cart Reminder** — Reminds the customer of items left in the cart (1st, 2nd, 3rd follow-up).
- **Saved Cart Expiry Warning** — Alerts that saved cart items are about to expire.
- **Price Drop on Cart Item** — Notifies if a cart item's price has decreased.
- **Back in Stock (Cart Item)** — Alerts when an out-of-stock cart item is available again.

---

## 7. Wishlist Emails

- **Wishlist Item Back in Stock** — Notifies when a wishlisted item is available again.
- **Wishlist Item Price Drop** — Alerts when a wishlisted item goes on sale.
- **Wishlist Item Low Stock** — Urgency alert that a wishlisted item is running low.
- **Wishlist Shared** — Confirmation when a customer shares their wishlist.

---

## 8. Subscription & Membership Emails

- **Subscription Activated** — Confirms a subscription plan is active.
- **Subscription Renewal Reminder** — Sent before the subscription auto-renews.
- **Subscription Renewed** — Confirms successful renewal.
- **Subscription Cancelled** — Confirms cancellation with end date.
- **Subscription Expired** — Notifies that the subscription has ended.
- **Membership Upgrade / Downgrade** — Confirms plan changes.

---

## 9. Review & Feedback Emails

- **Review Request** — Asks the customer to review a purchased product.
- **Review Published** — Confirms the review is live.
- **Review Rejected** — Explains why a submitted review was not approved.
- **Seller / Delivery Rating Request** — Asks for feedback on delivery or seller experience.

---

## 10. Loyalty & Rewards Emails

- **Points Earned** — Confirms reward points added after a purchase.
- **Points Expiry Warning** — Alerts that points are about to expire.
- **Points Redeemed** — Confirms successful use of reward points.
- **Tier Upgrade** — Notifies the customer they've moved to a higher loyalty tier.
- **Referral Reward** — Confirms a referral bonus has been credited.

---

## 11. Coupon & Offer Emails

- **Coupon Issued** — Delivers a discount code to the customer.
- **Coupon Expiry Reminder** — Reminds the customer their coupon is expiring soon.
- **Coupon Used Confirmation** — Confirms a coupon was applied to an order.
- **Gift Card Received** — Delivers a gift card code from sender to recipient.
- **Gift Card Balance Update** — Notifies remaining gift card balance after use.

---

## 12. Seller / Vendor Emails (for marketplaces)

- **New Order Received** — Alerts seller about a new order to fulfill.
- **Order Cancelled by Customer** — Notifies seller of cancellation.
- **Return Initiated** — Informs seller a return is coming.
- **Payout Processed** — Confirms seller payment has been sent.
- **Low Inventory Alert** — Warns seller that a product is running low on stock.

---

That's a comprehensive list of all transactional emails in an ecommerce store. Let me know if you want email templates or Celery task implementations for any of these!


---

# highlevel-plan-v2.todo : plan

_Source: `prd/plan/highlevel-plan-v2.todo`_

# Highlevel Plan V2:
    # Address:


---

# highlevel-plan.todo : plan

_Source: `prd/plan/highlevel-plan.todo`_

# High level plan :
    ☐ Help system and href to dash and nstore and landing-site

# Dash:
    ☐ Add right set of favicons 
    ☐ There should be no blue color, 
    ☐ change bg of + button in mobile screen in all listing page to suitable color from branding.md
    
    Address:
        ☐ in the address form address type the choice should be
            residence (7 AM To 9 PM Pickup/Delivery time)
            commercial ( 10 AM to 6 PM Pickup/Delivery time)
        ☐ Add locality field in frontend in address create/edit next to pincode column
        ☐ When pincode is entered search for pincode from pincode table and fill only Town_city and
        and state_region only remove filling of area_sector
        ☐ Save - button color should be changed to Theme color and be consistent across all forms in dash/
    
    ☐ after login , in the left dashboard menu My Inventories should be placed at the last


# UI / UX:
    ☐ dash, nstore


## Backend :
    ☐ Install Celery + Redis [x] Done
    - celery==5.4.0 — already installed (was in requirements.txt)
    - redis==5.0.8 (Python client) — already installed
    - Redis server — installed and started (enabled to auto-start on boot), responding to PING
        responding to PING - PONG [x]
    
        Summary of what was fixed and confirmed:

            ┌────────────────────────────────┬───────────────────────────────────────────────┐
            │             Check              │                    Result                     │
            ├────────────────────────────────┼───────────────────────────────────────────────┤
            │ Worker ping                    │ pong from worker@pfs-dash                     │
            ├────────────────────────────────┼───────────────────────────────────────────────┤
            │ Task dispatch via Redis broker │ Task ID assigned, status PENDING → SUCCESS    │
            ├────────────────────────────────┼───────────────────────────────────────────────┤
            │ Task execution                 │ Drained 5 debounce queue entries, wrote to DB │
            ├────────────────────────────────┼───────────────────────────────────────────────┤
            │ Result backend (Redis)         │ Result retrieved in < 1s                      │
            ├────────────────────────────────┼───────────────────────────────────────────────┤
            │ Service user                   │ Fixed www-data → ubuntu to match gunicorn     │
            └────────────────────────────────┴───────────────────────────────────────────────┘
          
            Both celery-worker and celery-beat are active and enabled for auto-start on reboot. 

            ● All good. Here's what was done:

                ┌──────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
                │       Step       │                                                                Detail                                                                 │
                ├──────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
                │ Installed        │ django-anymail==15.0 (with [amazon-ses] extras — uses existing boto3)                                                                 │
                ├──────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
                │ requirements.txt │ Pinned django-anymail==15.0                                                                                                           │
                ├──────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
                │ INSTALLED_APPS   │ Added "anymail"                                                                                                                       │
                ├──────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
                │ EMAIL_BACKEND    │ anymail.backends.amazon_ses.EmailBackend                                                                                              │
                ├──────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
                │ Auth             │ Uses the existing AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars already in your settings via boto3 — no extra credentials needed │
                └──────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
              
                Env vars to set (in your .env / server environment):
                DEFAULT_FROM_EMAIL=noreply@putforshare.com   # must be SES-verified
                AWS_SES_REGION=ap-south-1                    # or override per-region

    ☐ setup SES on aws
    ☐ Send email using anyemail django
    ☐ complete email notification for all emails


    ● The service is gunicorn-api.putforshare.com.service. Run:

        sudo systemctl restart gunicorn-api.putforshare.com.service
      
        Or for a zero-downtime graceful reload (sends SIGHUP to workers one by one):
      
        sudo systemctl reload gunicorn-api.putforshare.com.service
      
        reload is preferred in production as it keeps the socket alive and doesn't drop in-flight requests.


---

# plan_combined_output.txt : plan

_Source: `prd/plan/plan_combined_output.txt`_


