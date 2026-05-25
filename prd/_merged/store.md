# Merged content — prd/store/

_5 file(s) combined on this page._


---

# cart-fe.md : store

_Source: `prd/store/completed/cart-fe.md`_

have the cart icon in the top nav bar right most end, - Update evertime item is added in the cart .
To catch the attention add simple animation to cart icon.
And in the cart nav bar, show the number of items added in the cart.
and

Cart window
Every time somebody adds an item to a cart and Show a pane on the right side,
display the item in the cart
below each item in the cart
Show number of item in the text box, and
add a plus button on the right and minus button on the left,
and a delete button with only ic


---

# completed_combined_output.txt : store

_Source: `prd/store/completed/completed_combined_output.txt`_

==================================================
FILE: cart-fe.md
==================================================

have the cart icon in the top nav bar right most end, - Update evertime item is added in the cart .
To catch the attention add simple animation to cart icon.
And in the cart nav bar, show the number of items added in the cart.
and

Cart window
Every time somebody adds an item to a cart and Show a pane on the right side,
display the item in the cart
below each item in the cart
Show number of item in the text box, and
add a plus button on the right and minus button on the left,
and a delete button with only ic


---

# store-v2.1.md : store

_Source: `prd/store/store-v2.1.md`_

# Frontend Store v3

# General

1. Always Mobile first.
2. Rework on store/ folder
3. All pages should be full width, give 10 pixel on left and right as margins.
4. Refer images in the folder to pick colors, fonts - typography.
5.

# Frontend in Reactjs and tailwind

1. Create Top Navbar with 2 rows
   1. Row 1 - ht: 60px
   2. 2 cols
   3. from left - 1st col - width: 30%
   4. 2nd col - width 70%. In 2nd col add search box left aligned. and CTS right aligned
   5. Row 2 - ht: 30px, 1 cols . Add Navbar
2. Create Footer

## Use corresponding mockup in this folder for creating these pages

1. Signup Page
   Create a page into two half. left and right equally.
   In the left we can have the form and right we can have a carousel[1].

2. Login
   Create a page into two half. left and right equally.
   In the left we can have the form and right we can have a carousel[1] with full height.

3. Forgot Password
   Create Forgot page into two half. left and right equally.
   In the left we can have the form and right we can have a carousel[1] with full height.

4. Reset Password
   Create Reset Password page into two half. left and right equally.
   In the left we can have the form and right we can have a carousel[1] with full height.

Resources:

1. carousel - https://react-slick.neostack.com/docs/example/auto-play

# Updates 2.1.1

Add Call To Action "Get Started" in header row 1 right aligned.

Row 2 - Nav items
Benefits for :Donators | Sellers | Buyers | Donate | Sell | Scholarship | Program Details | Students Selected | About Us | Testimonials | Help


---

# store-v2.2.md : store

_Source: `prd/store/store-v2.2.md`_

## Address book

1. one user can have multiple addresses.
2. Address listing on the user dashboard and also on the storefront, which user should be able to pick it on the during the checkout process.
3. User should be able to select billing address, shipping address.
4. Also we should be able to mark any address as office address,
5. office address can have delivery time 9 am to 6 pm, house address any time.

## Inventory

```py
class Category(models.Model):
    id = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Category - {self.id} - {self.name}"

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

# Base Model: Common attributes for every item in the warehouse
class Product(models.Model):
    id = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    # FK To user table, any user can be a seller
    seller = models.ForeignKey(User, related_name='products',
                               on_delete=models.PROTECT, null=True)

    # SKU specific to seller / vendor ( Unique to seller, vendor )
    sku = models.CharField(max_length=100, unique=True)

    name = models.CharField(max_length=255)
    short_description = models.TextField(blank=True, default='')
    description = models.TextField(blank=True, default='')

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products"
    )

    price = models.DecimalField(max_digits=10, decimal_places=2)
    # Actual Sale Price or Regular Price
    max_retail_price = models.DecimalField(
        max_digits=10, decimal_places=2)

    sale_price = models.DecimalField(
        max_digits=10, decimal_places=2)

    stock_quantity = models.PositiveIntegerField(default=1)

    is_active = models.BooleanField(default=True)

    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Books(Product):

    upc = models.CharField(max_length=255, blank=False, default='')
    gcid = models.CharField(max_length=255, blank=False, default='')
    part_number = models.CharField(max_length=255, blank=False, default='')
    # Possible choices : SELF_SELL / SMART_SELL
    # Sell Option will be againsta each inventory so that its easy to track,
    # even if the product category goes large
    sell_option = models.CharField(max_length=15, choices=settings.SELLING_CHOICES,
                                   blank=True,
                                   default='SMART_SELL')

    title = models.CharField(max_length=255, blank=True, default='')
    short_description = models.TextField(blank=True, default='')
    description = models.TextField(blank=True, default='')
    date_sale_price_starts = models.DateTimeField(
        auto_now=False, default=None, null=True)
    date_sale_price_ends = models.DateTimeField(
        auto_now=False, default=None, blank=True, null=True)

    product_category_id = models.IntegerField(default=0)

    # Product condition / quality
    quality = models.CharField(
        max_length=200,
        choices=settings.PRODUCT_CONDITION_CHOICES,
        blank=False, default='USED_LOOKS_GOOD')

    # Any special about the quality
    quality_note = models.CharField(
        max_length=255,
        blank=True,
        default=''
    )
    # Product condition / quality

    isbn_10 = models.CharField(max_length=15, blank=True, default='')
    isbn_13 = models.CharField(max_length=15, blank=True, default='')
    book_language = models.CharField(max_length=255, blank=True, default='')
    book_edition = models.CharField(max_length=255, blank=True, default='')
    covertype = models.CharField(max_length=255, blank=True, default='')
    page_count = models.IntegerField(default=0)
    # Publisher linked to master model
    publisher = models.ForeignKey(Publisher, related_name='books',
                                  on_delete=models.PROTECT, null=True)

    published_year = models.DateField(auto_now=False, default=None, null=True)

    # # Actual Sale Price or Regular Price
    # price = models.DecimalField(
    #     max_digits=10, decimal_places=2, default='1.00')

    # max_retail_price = models.DecimalField(
    #     max_digits=10, decimal_places=2, default='1.00')

    # sale_price = models.DecimalField(
    #     max_digits=10, decimal_places=2, default='1.00')

    # quantity = models.IntegerField(default=1)

    # @TODO add categories, tags as ArrayFields Postgres

    # featured_image_id = models.IntegerField(default=0)

    # comma seperated image id eg: 45,345,23,456,223,
    # image_gallery_id = models.CharField(
    #     max_length=255, blank=False, default='')

    # Related to multiple gallery - gallery is name of the app
    # one gallery is one media
    # gallery = models.ManyToManyField(
    #     'gallery.Gallery', related_name='inventory_gallery')

    photo = models.ManyToManyField(
        'photos.Photo', related_name='books')

    # Dimension in cm and grams
    product_dimension_length = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')
    product_dimension_breadth = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')
    product_dimension_height = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')

    # weight in grams
    product_dimension_weight = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')

    # @TODO add Author field as Arrayfield and expand
    # To Author names on display
    # Many-to-Many relation to Author
    authors = models.ManyToManyField(Author, related_name='books')

    # To Track who added the product, or last edited.
    # last_edited_by = models.BigIntegerField(blank=False, default=0)

    last_edited_user = models.ForeignKey(User, related_name='books',
                                         on_delete=models.PROTECT, null=True)

    # created_on = models.DateTimeField(auto_now_add=True)
    # updated_on = models.DateTimeField(auto_now=True)

    # Number of times this sellers product / offer is viewed, in detail page
    view_counter = models.BigIntegerField(default='0')

    # Product / Inventory Note visible only to Seller
    inventory_note = models.TextField(default='')

    # Is this product featured product
    is_featured = models.BooleanField(default=False)

    # For Tax calc purpose, A seller can have multiple warehouse
    # in different state, hence seller_state is attached
    # to inventory.
    seller_state = models.CharField(max_length=50, default="")

    status = models.BooleanField(default=True)
    archived = models.BooleanField(default=False)

    # tags = TaggableManager()

    def get_total_price_inclusive_of_tax(self):
        """
        Calculate the total price including tax.
        """
        if self.tax and self.tax.is_active:
            tax_amount = self.tax.calculate_tax(self.price)
            return self.price + tax_amount
        return self.price

    class Meta:
        verbose_name_plural = "inventories"
        ordering = ('-updated_on',)

    @property
    def is_in_stock(self):
        return self.stock_quantity > 0

class Soaps(Product):
    brand = models.CharField(max_length=100)
    model_number = models.CharField(max_length=100)
    # Specific JSON keys: {'voltage': '220V', 'battery': '5000mAh'}
    # Net weight
    # Ingredients
    # Scent / Essential oil
    # Skin Type
    # Shelf Life
    # How to use
    # Safety information
    # Soap care
    # Disclaimer
    product_properties = models.JSONField(default=dict, help_text="Soap specific properties")

    class Meta:
        verbose_name_plural = "Soaps"

```

## Search & Listing

1. Search by product title, ISBN, GTIN,
2. search by category,
3. search by tags,
4. search by book title, by author, or by other text in the description.

## product listing

1. create product listing page
2. create product detail page.
3. create search result listing page

## Categories

3. Category listing
   3.1 list category with image, and number of inventories in each category.
4. Tags listing
   4.1 list category with image, and number of inventories in each category.
5. Should be able to browse through categories, clicking on category should list products in a new page.

## Cart App

Its built. we will use that.

## Checkout

10. Do the payment processing
11. Receive the payment processing status
12. Update it on the order model
13. notify Site admin, Seller, and customer on whatsapp, email

## Shipment

14. At the time of checkout ask for the address selection
15. Find the shipping charge from pincode - call api from shipper and find the shipping charges.
16. and display the shipping charges before checkout.

## Taxation

its done we will reuse.

## Order

17. Should have order model
18. Should have order item model
19. Create order + on successful payment integration

## Invoice

19. Generate viewable and pdf downloadable Invoice
20. Generate shipping label for the order

# General requirements

21. add caching whenever possible
22. add async processing with celery whenever possible
23. add Fraud-prevention rules as required.
24. Add captcha during signup , login - needs your input

## Frontend requirements

1. you can use yarn or npm
2. use vite for build
3. tailwind for css
4. reactjs for dynamic content

---

To continue this session, run codex resume 019c3f67-74a1-7623-9fcc-d2fe71eea795

---

PRD V1.1

In all models
slug should be slug field type, auto populated on save

Product
to be able to fetch book details from an API like Google Books or few other APIs,
and then be able to get the details and
fetch it in the populate on the text box.


---

# store_combined_output.txt : store

_Source: `prd/store/store_combined_output.txt`_

==================================================
FILE: store-v2.1.md
==================================================

# Frontend Store v3

# General

1. Always Mobile first.
2. Rework on store/ folder
3. All pages should be full width, give 10 pixel on left and right as margins.
4. Refer images in the folder to pick colors, fonts - typography.
5.

# Frontend in Reactjs and tailwind

1. Create Top Navbar with 2 rows
   1. Row 1 - ht: 60px
   2. 2 cols
   3. from left - 1st col - width: 30%
   4. 2nd col - width 70%. In 2nd col add search box left aligned. and CTS right aligned
   5. Row 2 - ht: 30px, 1 cols . Add Navbar
2. Create Footer

## Use corresponding mockup in this folder for creating these pages

1. Signup Page
   Create a page into two half. left and right equally.
   In the left we can have the form and right we can have a carousel[1].

2. Login
   Create a page into two half. left and right equally.
   In the left we can have the form and right we can have a carousel[1] with full height.

3. Forgot Password
   Create Forgot page into two half. left and right equally.
   In the left we can have the form and right we can have a carousel[1] with full height.

4. Reset Password
   Create Reset Password page into two half. left and right equally.
   In the left we can have the form and right we can have a carousel[1] with full height.

Resources:

1. carousel - https://react-slick.neostack.com/docs/example/auto-play

# Updates 2.1.1

Add Call To Action "Get Started" in header row 1 right aligned.

Row 2 - Nav items
Benefits for :Donators | Sellers | Buyers | Donate | Sell | Scholarship | Program Details | Students Selected | About Us | Testimonials | Help


==================================================
FILE: store-v2.2.md
==================================================

## Address book

1. one user can have multiple addresses.
2. Address listing on the user dashboard and also on the storefront, which user should be able to pick it on the during the checkout process.
3. User should be able to select billing address, shipping address.
4. Also we should be able to mark any address as office address,
5. office address can have delivery time 9 am to 6 pm, house address any time.

## Inventory

```py
class Category(models.Model):
    id = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Category - {self.id} - {self.name}"

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

# Base Model: Common attributes for every item in the warehouse
class Product(models.Model):
    id = models.BigAutoField(primary_key=True)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)
    # FK To user table, any user can be a seller
    seller = models.ForeignKey(User, related_name='products',
                               on_delete=models.PROTECT, null=True)

    # SKU specific to seller / vendor ( Unique to seller, vendor )
    sku = models.CharField(max_length=100, unique=True)

    name = models.CharField(max_length=255)
    short_description = models.TextField(blank=True, default='')
    description = models.TextField(blank=True, default='')

    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products"
    )

    price = models.DecimalField(max_digits=10, decimal_places=2)
    # Actual Sale Price or Regular Price
    max_retail_price = models.DecimalField(
        max_digits=10, decimal_places=2)

    sale_price = models.DecimalField(
        max_digits=10, decimal_places=2)

    stock_quantity = models.PositiveIntegerField(default=1)

    is_active = models.BooleanField(default=True)

    created_on = models.DateTimeField(auto_now_add=True)
    updated_on = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Books(Product):

    upc = models.CharField(max_length=255, blank=False, default='')
    gcid = models.CharField(max_length=255, blank=False, default='')
    part_number = models.CharField(max_length=255, blank=False, default='')
    # Possible choices : SELF_SELL / SMART_SELL
    # Sell Option will be againsta each inventory so that its easy to track,
    # even if the product category goes large
    sell_option = models.CharField(max_length=15, choices=settings.SELLING_CHOICES,
                                   blank=True,
                                   default='SMART_SELL')

    title = models.CharField(max_length=255, blank=True, default='')
    short_description = models.TextField(blank=True, default='')
    description = models.TextField(blank=True, default='')
    date_sale_price_starts = models.DateTimeField(
        auto_now=False, default=None, null=True)
    date_sale_price_ends = models.DateTimeField(
        auto_now=False, default=None, blank=True, null=True)

    product_category_id = models.IntegerField(default=0)

    # Product condition / quality
    quality = models.CharField(
        max_length=200,
        choices=settings.PRODUCT_CONDITION_CHOICES,
        blank=False, default='USED_LOOKS_GOOD')

    # Any special about the quality
    quality_note = models.CharField(
        max_length=255,
        blank=True,
        default=''
    )
    # Product condition / quality

    isbn_10 = models.CharField(max_length=15, blank=True, default='')
    isbn_13 = models.CharField(max_length=15, blank=True, default='')
    book_language = models.CharField(max_length=255, blank=True, default='')
    book_edition = models.CharField(max_length=255, blank=True, default='')
    covertype = models.CharField(max_length=255, blank=True, default='')
    page_count = models.IntegerField(default=0)
    # Publisher linked to master model
    publisher = models.ForeignKey(Publisher, related_name='books',
                                  on_delete=models.PROTECT, null=True)

    published_year = models.DateField(auto_now=False, default=None, null=True)

    # # Actual Sale Price or Regular Price
    # price = models.DecimalField(
    #     max_digits=10, decimal_places=2, default='1.00')

    # max_retail_price = models.DecimalField(
    #     max_digits=10, decimal_places=2, default='1.00')

    # sale_price = models.DecimalField(
    #     max_digits=10, decimal_places=2, default='1.00')

    # quantity = models.IntegerField(default=1)

    # @TODO add categories, tags as ArrayFields Postgres

    # featured_image_id = models.IntegerField(default=0)

    # comma seperated image id eg: 45,345,23,456,223,
    # image_gallery_id = models.CharField(
    #     max_length=255, blank=False, default='')

    # Related to multiple gallery - gallery is name of the app
    # one gallery is one media
    # gallery = models.ManyToManyField(
    #     'gallery.Gallery', related_name='inventory_gallery')

    photo = models.ManyToManyField(
        'photos.Photo', related_name='books')

    # Dimension in cm and grams
    product_dimension_length = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')
    product_dimension_breadth = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')
    product_dimension_height = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')

    # weight in grams
    product_dimension_weight = models.DecimalField(
        max_digits=10, decimal_places=2, default='1.00')

    # @TODO add Author field as Arrayfield and expand
    # To Author names on display
    # Many-to-Many relation to Author
    authors = models.ManyToManyField(Author, related_name='books')

    # To Track who added the product, or last edited.
    # last_edited_by = models.BigIntegerField(blank=False, default=0)

    last_edited_user = models.ForeignKey(User, related_name='books',
                                         on_delete=models.PROTECT, null=True)

    # created_on = models.DateTimeField(auto_now_add=True)
    # updated_on = models.DateTimeField(auto_now=True)

    # Number of times this sellers product / offer is viewed, in detail page
    view_counter = models.BigIntegerField(default='0')

    # Product / Inventory Note visible only to Seller
    inventory_note = models.TextField(default='')

    # Is this product featured product
    is_featured = models.BooleanField(default=False)

    # For Tax calc purpose, A seller can have multiple warehouse
    # in different state, hence seller_state is attached
    # to inventory.
    seller_state = models.CharField(max_length=50, default="")

    status = models.BooleanField(default=True)
    archived = models.BooleanField(default=False)

    # tags = TaggableManager()

    def get_total_price_inclusive_of_tax(self):
        """
        Calculate the total price including tax.
        """
        if self.tax and self.tax.is_active:
            tax_amount = self.tax.calculate_tax(self.price)
            return self.price + tax_amount
        return self.price

    class Meta:
        verbose_name_plural = "inventories"
        ordering = ('-updated_on',)

    @property
    def is_in_stock(self):
        return self.stock_quantity > 0

class Soaps(Product):
    brand = models.CharField(max_length=100)
    model_number = models.CharField(max_length=100)
    # Specific JSON keys: {'voltage': '220V', 'battery': '5000mAh'}
    # Net weight
    # Ingredients
    # Scent / Essential oil
    # Skin Type
    # Shelf Life
    # How to use
    # Safety information
    # Soap care
    # Disclaimer
    product_properties = models.JSONField(default=dict, help_text="Soap specific properties")

    class Meta:
        verbose_name_plural = "Soaps"

```

## Search & Listing

1. Search by product title, ISBN, GTIN,
2. search by category,
3. search by tags,
4. search by book title, by author, or by other text in the description.

## product listing

1. create product listing page
2. create product detail page.
3. create search result listing page

## Categories

3. Category listing
   3.1 list category with image, and number of inventories in each category.
4. Tags listing
   4.1 list category with image, and number of inventories in each category.
5. Should be able to browse through categories, clicking on category should list products in a new page.

## Cart App

Its built. we will use that.

## Checkout

10. Do the payment processing
11. Receive the payment processing status
12. Update it on the order model
13. notify Site admin, Seller, and customer on whatsapp, email

## Shipment

14. At the time of checkout ask for the address selection
15. Find the shipping charge from pincode - call api from shipper and find the shipping charges.
16. and display the shipping charges before checkout.

## Taxation

its done we will reuse.

## Order

17. Should have order model
18. Should have order item model
19. Create order + on successful payment integration

## Invoice

19. Generate viewable and pdf downloadable Invoice
20. Generate shipping label for the order

# General requirements

21. add caching whenever possible
22. add async processing with celery whenever possible
23. add Fraud-prevention rules as required.
24. Add captcha during signup , login - needs your input

## Frontend requirements

1. you can use yarn or npm
2. use vite for build
3. tailwind for css
4. reactjs for dynamic content

---

To continue this session, run codex resume 019c3f67-74a1-7623-9fcc-d2fe71eea795

---

PRD V1.1

In all models
slug should be slug field type, auto populated on save

Product
to be able to fetch book details from an API like Google Books or few other APIs,
and then be able to get the details and
fetch it in the populate on the text box.
