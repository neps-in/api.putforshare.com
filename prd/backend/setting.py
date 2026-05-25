# ------------------------------------------------------ Choices
# Ninja - can do anything,
# Admin
# Employee cant view metrics
# SELLER, Can view seller's order, revenue
# BUYERS, can see only his details and his purchase
# Visitor - is one who has created account in PutForShare

PFS_ROLE_CHOICES = (
    ('NINJA', 'Ninja'),
    ('ADMIN', 'Admin'),  # Used
    ('EMPLOYEE', 'Employee'),
    ('SELLER', 'Seller'),  # Used
    ('BUYER', 'Buyer'),
    ('MEMBER', 'Registered Member/User'),
    ('GUEST', 'Guest')  # Used
)

# ------------------------------------------------------ Storecredit app

STORECREDIT_CHOICES = [
    ('DEBIT', 'Debit'),
    ('CREDIT', 'Credit'),
]

# ----------------------------- Inventory Choices

PRODUCT_TYPE_CHOICES = [
    ('SIMPLE', 'Simple'),
    ('BUNDLE', 'Bundled Product'),
    ('DOWNLOAD', 'Downloadable'),
]

# Format
PRODUCT_FORMAT_CHOICES = [
    ('PAPERBACK', 'Paperback'),
    ('HARDCOVER', 'Hard Cover'),
    ('CARD_BOOK', 'Card Book (Book with Cards as Pages)'),
]

# Product language Choices
PRODUCT_LANGUAGE_CHOICES = [
    ('ENGLISH', 'English'),
    ('TAMIL', 'Tamil'),
    ('KANNADA', 'Kannada'),
    ('HINDI', 'Hindi'),
    ('FRENCH', 'French'),
    ('GERMAN', 'German'),
    ('SANSKRIT', 'Sanskrit')
]

# Condition
PRODUCT_CONDITION_CHOICES = [
    ('NEW', 'New'),
    ('USED_LOOKS_GOOD', 'Used Good'),
    ('USED_VERY_GOOD', 'Used Very Good'),
    ('USED_LOOKS_AS_NEW', 'Used Like New'),
    ('USED_ACCEPTABLE', 'Used Acceptable')
]

PFS_BOOK_CONDITION_NOTES_CHOICES = [
    ('NEW', 'Looks like New'),
    ('USED_LOOKS_GOOD', 'Its used book, looks good certainly usable, It may have few writings and markings.'),
    ('USED_LOOKS_AS_NEW', 'It looks like a new book, It may have few writings or markings.'),
    ('USED_ACCEPTABLE', 'Book looks old, the edges may be slightly dirty, But its very much readable.'),
]


# ----------------------------------------- End Inventory

# ----------------------------------------- Addressbook

ADDRESS_TYPE_CHOICES = [
    ('RESIDENCE_ADDRESS', 'Residence Address'),
    ('COMMERCIAL_ADDRESS', 'Commercial Address')
]

ADDRESS_KIND_CHOICES = [
    ('SHIPPING_ADDRESS', 'Shipping Address'),
    ('BILLING_ADDRESS', 'Billing Address')
]

# ----------------------------------------- Addressbook ends

# ----------------------------------------------  Sales ends  ----------------------------------
# Sales app, disbursement model
DISBURSEMENT_STATUS_CHOICES = [
    ('DISBURSMENT_SUCCESS', 'Disbursement Success'),
    ('DISBURSMENT_FAILED', 'Disbursement Failed'),
]

# ---------------------------------------------- Shipment app ----------------------------------
# Shipment app, shipment model
SHIPMENT_MODE_CHOICES = [
    ('AIRWAYS_PRIORITY', 'Airways Priority Mode'),
    ('ROADWAYS_ECONOMY', 'Roadways Economy Mode')
]

# Shows to seller / customer
INBOUND_PICKUP_STATUS_CHOICES_USER = [
    ("DRAFT", "Save Pickup Request as DRAFT."),
    ("BOOKED", "Finalize Pickup Request as BOOKED."),
    ("READY_FOR_PICKUP", "Pickup Request is packed and ready for pickup."),
    ("REQUEST_CANCEL", "Request Admin for cancellation of this Pickup Request."),
]

# all possible pickup status
INBOUND_PICKUP_STATUS_CHOICES = [
    ("DRAFT", "Save Pickup Request as DRAFT."),
    ("BOOKED", "Finalize Pickup Request as BOOKED."),
    ("REQUEST_CANCEL", "Request Admin for cancellation of this Pickup Request."),
    ("READY_FOR_PICKUP", "Pickup Request is packed and ready for pickup."),
    ("CANCELLED", "CANCEL this Pickup Request."),
    ("PICKED_UP_AND_IN_TRANSIT",
     "Pickup Request is picked up by Logistics Partners and is on the way to destination "),
    ("PICKUP_REJECTED", "Pickup Request is rejected for some reason by Logistics Team"),
    ("RECEIVED", "Pickup Request received at the Warehouse"),
    ("RETURNED", "Pickup Request Returned to the origin or source location")
]

INBOUND_SHIPMENT_STATUS_CHOICES = [
    ("DRAFT", "SHIPMENT is saved as DRAFT"),
    ("BOOKED", "Shipment is Booked by the customer"),
    ("PICKED_UP", "Shipment is PICKED UP by Logistics Team"),
    ("IN_TRANSIT", "Shipment is on the way to destination"),
    ("DELIVERED", "Shipment delivered at the destination"),
    ("RETURNED", "Shipment Returned to the origin or source location")
]


# Will have values of status of what FedEx Uses
SHIPPER_SHIPMENT_STATUS_CHOICES = [
    ("BOOKED", "Shippment is Booked by the customer"),
    ("PICKEDUP", "Shipment Pickedup by Logistics Team"),
    ("IN_TRANSIT", "Shipment is on the way to destination"),
    ("DELIVERED", "Shipment delivered at the destination")
]

# ----------------------------------------------   ReverseShipment
SHIPMENT_RETURN_MODE_CHOICES = [
    ('AIRWAYS_PRIORITY', 'Airways Priority Mode'),
    ('ROADWAYS_ECONOMY', 'Roadways Economy Mode')
]

SHIPMENT_CATEGORY_CHOICES = [
    ('INBOUND', 'InBound Shipment'),
    ('OUTBOUND', 'OutBound Shipment')
]

SHIPMENT_RETURN_REASON_CHOICES = [
    ("DAMAGED", "Product was delivered was damaged"),
    ("DIFFERENT_FROM_ORDERED",
     "Product received was different from what was ordered"),
    ("SHIPMENT_DELAY", "Product delivery was delayed."),
    ("NO_LONGER_WANTED", "This product I No longer wanted")
]

# Used in inventory model
SELLING_CHOICES = [
    ('SMART_SELL', 'Smart Sell'),
    ('SELF_SELL', 'Self Sell')
]
# ------------------------------------------------------- CHOICES ENDS

# # USER ROLES
# USER_ROLES = [
#     ("ADMIN", "ADMIN"),
#     # ("EDITOR", "EDITOR"),
#     ("CUSTOMER", "CUSTOMER")
# ]

# Used to calculate storecredit in storecredit app

PFS_STORECREDIT_FOR_BIT_OLD_PERCENT = .1  # 10 PERCENT
PFS_STORECREDIT_FOR_GOOD_PERCENT = .2  # 20 PERCENT
PFS_STORECREDIT_FOR_NEW_PERCENT = .4  # 40 PERCENT


GRAPHENE = {
    "SCHEMA": "mainapp.schema.schema"
}

# CELERY Specific settings
CELERY_BROKER_URL = 'redis://localhost:6379/0'  # Or any other broker
CELERY_RESULT_BACKEND = 'django-cache'
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'

# Optional: use Django DB for task results 
# (requires django-celery-results)
CELERY_RESULT_BACKEND = "django-db"

# Task result expiration
CELERY_RESULT_EXPIRES = 3600  # 1 hour

# CELERY_ACCEPT_CONTENT = ['json', 'pickle']
# CELERY_TASK_SERIALIZER = 'pickle'
# CELERY_RESULT_SERIALIZER = 'pickle'

# Task routing - different queues for different priorities
CELERY_TASK_ROUTES = {
    'notifications.send_notification': {
        'queue': 'notification',
        'routing_key': 'notifications.send',
    },
    'notifications.send_bulk_notification': {
        'queue': 'bulk',
        'routing_key': 'notifications.bulk',
    },
}



# CART Status
CART_STATUS_CHOICES = [
    ('CART_ACTIVE', 'Cart is Active'),
    ('CART_SAVED', 'Cart is Saved for Later'),
    ('CART_CHECKED_OUT', 'Cart is Checked Out'),
]

COMPANY_NAME = "PutForShare.com"
COMPANY_EMAIL = "hi@putforshare.com"
COMPANY_PHONE = "+91 89516 00629"
ADMIN_EMAIL = "admin@putforshare.com"

# Rate limiting
NOTIFICATION_RATE_LIMIT = 10  # Max notifications per minute per recipient

