import random
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from taggit.models import Tag

from apps.common.uuid_utils import generate_uuid7
from apps.inventory.models import Author, Book, Category, Product, Publisher, Soap


class Command(BaseCommand):
    help = "Seed mock categories, tags, products, books, and soaps."

    def add_arguments(self, parser):
        parser.add_argument(
            "--random-products",
            type=int,
            default=0,
            help="Number of additional random products to create.",
        )
        parser.add_argument(
            "--random-tags",
            type=int,
            default=0,
            help="Number of additional random tags to create.",
        )
        parser.add_argument(
            "--sample-books",
            type=int,
            default=0,
            help="Number of additional sample books to create.",
        )

    def _random_decimal(self, low, high):
        return Decimal(f"{random.randint(low, high)}.00")

    def _random_product_name(self):
        adjectives = [
            "Classic",
            "Premium",
            "Vintage",
            "Organic",
            "Smart",
            "Compact",
            "Daily",
            "Urban",
            "Natural",
            "Essential",
        ]
        nouns = [
            "Notebook",
            "Cleanser",
            "Workbook",
            "Kit",
            "Bundle",
            "Guide",
            "Set",
            "Bar",
            "Care Pack",
            "Collection",
        ]
        return f"{random.choice(adjectives)} {random.choice(nouns)} {random.randint(100, 9999)}"

    def _random_numeric_string(self, length):
        return "".join(random.choices("0123456789", k=length))

    def _book_catalog(self):
        return {
            "Fiction Books": {
                "tags": ["fiction", "novel", "classic", "literature", "bestseller"],
                "titles": [
                    "To Kill a Mockingbird",
                    "1984",
                    "Pride and Prejudice",
                    "The Great Gatsby",
                    "Moby-Dick",
                    "The Catcher in the Rye",
                    "Jane Eyre",
                    "Wuthering Heights",
                    "The Grapes of Wrath",
                    "The Old Man and the Sea",
                    "A Tale of Two Cities",
                    "The Sun Also Rises",
                    "The Bell Jar",
                    "Rebecca",
                    "Frankenstein",
                ],
            },
            "Non-Fiction Books": {
                "tags": ["non-fiction", "biography", "memoir", "history", "recommended"],
                "titles": [
                    "Sapiens",
                    "Educated",
                    "The Diary of a Young Girl",
                    "Into Thin Air",
                    "Unbroken",
                    "The Wright Brothers",
                    "The Immortal Life of Henrietta Lacks",
                    "When Breath Becomes Air",
                    "Outliers",
                    "The Tipping Point",
                    "Homo Deus",
                    "The Power of Habit",
                    "A Brief History of Time",
                    "The Art of Statistics",
                    "The Gene",
                ],
            },
            "Children Books": {
                "tags": ["children", "illustrated", "school", "gift", "reading"],
                "titles": [
                    "Charlotte's Web",
                    "Matilda",
                    "The Very Hungry Caterpillar",
                    "The Cat in the Hat",
                    "The Lion, the Witch and the Wardrobe",
                    "The Secret Garden",
                    "The Wind in the Willows",
                    "Bridge to Terabithia",
                    "The BFG",
                    "Fantastic Mr. Fox",
                    "Wonder",
                    "Coraline",
                    "The Tale of Peter Rabbit",
                    "Anne of Green Gables",
                    "Goodnight Moon",
                ],
            },
            "Business Books": {
                "tags": ["business", "leadership", "management", "startup", "career"],
                "titles": [
                    "The Lean Startup",
                    "Zero to One",
                    "Good to Great",
                    "The Hard Thing About Hard Things",
                    "The Innovator's Dilemma",
                    "Start with Why",
                    "Leaders Eat Last",
                    "Measure What Matters",
                    "Blue Ocean Strategy",
                    "Thinking in Systems",
                    "The Personal MBA",
                    "The 7 Habits of Highly Effective People",
                    "Never Split the Difference",
                    "Principles",
                    "Drive",
                ],
            },
            "Self Help Books": {
                "tags": ["self-help", "motivation", "mindset", "productivity", "wellness"],
                "titles": [
                    "Atomic Habits",
                    "Deep Work",
                    "The Power of Now",
                    "The Subtle Art of Not Giving a F*ck",
                    "Think and Grow Rich",
                    "How to Win Friends and Influence People",
                    "Mindset",
                    "The Mountain Is You",
                    "Essentialism",
                    "The Four Agreements",
                    "Grit",
                    "Ikigai",
                    "Make Your Bed",
                    "Quiet",
                    "The Miracle Morning",
                ],
            },
            "Science Books": {
                "tags": ["science", "physics", "biology", "space", "research"],
                "titles": [
                    "Cosmos",
                    "The Selfish Gene",
                    "The Elegant Universe",
                    "Pale Blue Dot",
                    "The Demon-Haunted World",
                    "The Origin of Species",
                    "The Double Helix",
                    "The Emperor of All Maladies",
                    "A Short History of Nearly Everything",
                    "Brief Answers to the Big Questions",
                    "The Feynman Lectures on Physics",
                    "The Hidden Life of Trees",
                    "The Fabric of the Cosmos",
                    "The Body",
                    "The Science of Interstellar",
                ],
            },
            "History Books": {
                "tags": ["history", "civilization", "war", "world", "culture"],
                "titles": [
                    "Guns, Germs, and Steel",
                    "The Silk Roads",
                    "A People's History of the United States",
                    "SPQR",
                    "The Rise and Fall of the Third Reich",
                    "Team of Rivals",
                    "The Lessons of History",
                    "Postwar",
                    "The Crusades",
                    "The Romanovs",
                    "India After Gandhi",
                    "The Discovery of India",
                    "The Story of Civilization",
                    "The Cold War",
                    "The Splendid and the Vile",
                ],
            },
            "Exam Prep Books": {
                "tags": ["exam", "student", "practice", "competitive", "reference"],
                "titles": [
                    "Quantitative Aptitude Companion",
                    "Logical Reasoning Workbook",
                    "General Knowledge Master Guide",
                    "Objective English Practice",
                    "High School Algebra Essentials",
                    "Physics Problem Solving Handbook",
                    "Chemistry Formula Digest",
                    "Biology Revision Notes",
                    "Civil Services Foundation Manual",
                    "Banking Exam Preparation Series",
                    "Campus Placement Training Kit",
                    "Graduate Aptitude Test Guide",
                    "Mathematics Fast Revision Book",
                    "Data Interpretation Practice Set",
                    "Critical Reasoning Drill Book",
                ],
            },
        }

    @transaction.atomic
    def handle(self, *args, **options):
        random_products_requested = max(0, options.get("random_products", 0))
        random_tags_requested = max(0, options.get("random_tags", 0))
        sample_books_requested = max(0, options.get("sample_books", 0))

        categories = {}
        category_rows = [
            ("Books", "Second-hand and curated books."),
            ("Soaps", "Artisan and wellness soaps."),
            ("Stationery", "Daily-use notebooks and tools."),
            ("Wellness", "Personal wellness products."),
            ("Fiction Books", "Classic and contemporary fiction titles."),
            ("Non-Fiction Books", "Biographies, memoirs, and factual writing."),
            ("Children Books", "Storybooks and reading-level books for kids."),
            ("Business Books", "Entrepreneurship, leadership, and management books."),
            ("Self Help Books", "Mindset, productivity, and wellbeing titles."),
            ("Science Books", "Science and technology focused books."),
            ("History Books", "Global and regional history titles."),
            ("Exam Prep Books", "Competitive exam and study preparation titles."),
        ]

        created_categories = 0
        for name, description in category_rows:
            category, created = Category.objects.get_or_create(
                name=name,
                defaults={"description": description},
            )
            categories[name] = category
            if created:
                created_categories += 1

        tag_names = [
            "fiction",
            "science",
            "organic",
            "student",
            "gift",
            "bestseller",
            "wellness",
            "handmade",
            "novel",
            "classic",
            "literature",
            "non-fiction",
            "biography",
            "memoir",
            "history",
            "children",
            "illustrated",
            "school",
            "reading",
            "business",
            "leadership",
            "management",
            "startup",
            "career",
            "self-help",
            "motivation",
            "mindset",
            "productivity",
            "physics",
            "biology",
            "space",
            "research",
            "civilization",
            "war",
            "world",
            "culture",
            "exam",
            "practice",
            "competitive",
            "reference",
            "recommended",
        ]
        created_tags = 0
        for name in tag_names:
            _, created = Tag.objects.get_or_create(name=name)
            if created:
                created_tags += 1

        created_random_tags = 0
        for _ in range(random_tags_requested):
            random_tag_name = f"tag-{generate_uuid7().hex[:10]}"
            _, created = Tag.objects.get_or_create(name=random_tag_name)
            if created:
                created_random_tags += 1

        publisher, _ = Publisher.objects.get_or_create(
            name="DJRE Press",
            defaults={"description": "In-house mock publisher for seed data."},
        )
        author_1, _ = Author.objects.get_or_create(name="Anita Rao", defaults={"bio": "Mock author profile."})
        author_2, _ = Author.objects.get_or_create(name="Karthik Iyer", defaults={"bio": "Mock author profile."})

        created_products = 0
        generic_products = [
            {
                "sku": "GEN-NOTE-001",
                "name": "A5 Recycled Notebook",
                "category": categories["Stationery"],
                "min_retail_price": Decimal("199.00"),
                "max_retail_price": Decimal("249.00"),
                "sale_price": Decimal("179.00"),
                "stock_quantity": 42,
                "short_description": "Hardbound notebook with recycled paper.",
                "tags": ["student", "gift"],
            },
            {
                "sku": "GEN-WELL-001",
                "name": "Lavender Bath Salt",
                "category": categories["Wellness"],
                "min_retail_price": Decimal("320.00"),
                "max_retail_price": Decimal("399.00"),
                "sale_price": Decimal("299.00"),
                "stock_quantity": 28,
                "short_description": "Calming bath salt for evening use.",
                "tags": ["wellness", "gift"],
            },
        ]
        for row in generic_products:
            tags = row.pop("tags")
            product, created = Product.objects.get_or_create(sku=row["sku"], defaults=row)
            if created:
                created_products += 1
            product.tags.set(tags)

        one_rupee_products = [
            {
                "sku": "RE-STORE-001",
                "name": "Re Store Surprise Pack",
                "category": categories["Wellness"],
                "min_retail_price": Decimal("1.00"),
                "max_retail_price": Decimal("1.00"),
                "sale_price": Decimal("1.00"),
                "stock_quantity": 25,
                "short_description": "Dev-only 1 rupee listing.",
                "tags": ["wellness", "gift"],
            },
            {
                "sku": "RE-STORE-002",
                "name": "One Rupee Notebook",
                "category": categories["Stationery"],
                "min_retail_price": Decimal("1.00"),
                "max_retail_price": Decimal("1.00"),
                "sale_price": Decimal("1.00"),
                "stock_quantity": 40,
                "short_description": "Dev-only 1 rupee listing.",
                "tags": ["student", "gift"],
            },
            {
                "sku": "RE-STORE-003",
                "name": "Pocket Wellness Sample",
                "category": categories["Wellness"],
                "min_retail_price": Decimal("1.00"),
                "max_retail_price": Decimal("1.00"),
                "sale_price": Decimal("1.00"),
                "stock_quantity": 18,
                "short_description": "Dev-only 1 rupee listing.",
                "tags": ["wellness"],
            },
        ]
        for row in one_rupee_products:
            tags = row.pop("tags")
            product, created = Product.objects.get_or_create(sku=row["sku"], defaults=row)
            if created:
                created_products += 1
            product.tags.set(tags)

        created_books = 0
        book_rows = [
            {
                "sku": "BOOK-FIC-001",
                "name": "The Silent Monsoon",
                "short_description": "A modern fiction novel.",
                "description": "A character-driven story set around monsoon memories.",
                "isbn_10": "1234567890",
                "isbn_13": "9781234567897",
                "min_retail_price": Decimal("399.00"),
                "max_retail_price": Decimal("499.00"),
                "sale_price": Decimal("349.00"),
                "stock_quantity": 15,
                "authors": [author_1],
                "tags": ["fiction", "bestseller", "gift"],
            },
            {
                "sku": "BOOK-SCI-001",
                "name": "Everyday Science Notes",
                "short_description": "Simple science concepts for curious minds.",
                "description": "Illustrated explanations of daily science phenomena.",
                "isbn_10": "2345678901",
                "isbn_13": "9782345678901",
                "min_retail_price": Decimal("359.00"),
                "max_retail_price": Decimal("449.00"),
                "sale_price": Decimal("329.00"),
                "stock_quantity": 21,
                "authors": [author_2],
                "tags": ["science", "student"],
            },
        ]
        for row in book_rows:
            tags = row.pop("tags")
            authors = row.pop("authors")
            book, created = Book.objects.get_or_create(
                sku=row["sku"],
                defaults={
                    **row,
                    "category": categories["Books"],
                    "publisher": publisher,
                },
            )
            if created:
                created_books += 1
            book.authors.set(authors)
            book.tags.set(tags)

        created_soaps = 0
        soap_rows = [
            {
                "sku": "SOAP-ORG-001",
                "name": "Neem Aloe Handmade Soap",
                "short_description": "Mild handmade soap for daily use.",
                "description": "Cold-processed soap bar made with neem and aloe extracts.",
                "min_retail_price": Decimal("140.00"),
                "max_retail_price": Decimal("180.00"),
                "sale_price": Decimal("129.00"),
                "stock_quantity": 64,
                "brand": "DJRE Naturals",
                "fragrance": "Fresh herbal",
                "net_weight_grams": 110,
                "skin_type": "All",
                "shelf_life_months": 24,
                "tags": ["organic", "wellness", "handmade"],
            },
            {
                "sku": "SOAP-ORG-002",
                "name": "Charcoal Mint Cleansing Bar",
                "short_description": "Charcoal-infused cleansing soap.",
                "description": "Refreshing mint charcoal bar designed for oily skin.",
                "min_retail_price": Decimal("160.00"),
                "max_retail_price": Decimal("199.00"),
                "sale_price": Decimal("149.00"),
                "stock_quantity": 55,
                "brand": "DJRE Naturals",
                "fragrance": "Mint",
                "net_weight_grams": 105,
                "skin_type": "Oily",
                "shelf_life_months": 24,
                "tags": ["organic", "wellness"],
            },
        ]
        for row in soap_rows:
            tags = row.pop("tags")
            soap, created = Soap.objects.get_or_create(
                sku=row["sku"],
                defaults={
                    **row,
                    "category": categories["Soaps"],
                },
            )
            if created:
                created_soaps += 1
            soap.tags.set(tags)

        created_random_products = 0
        if random_products_requested > 0:
            available_categories = list(categories.values())
            all_tag_names = list(Tag.objects.values_list("name", flat=True))

            for index in range(random_products_requested):
                category = random.choice(available_categories)
                max_retail_price = self._random_decimal(120, 2500)
                discount = self._random_decimal(0, 300)
                sale_price = max(Decimal("1.00"), max_retail_price - discount)

                product = Product.objects.create(
                    sku=f"RAND-{generate_uuid7().hex[:14].upper()}",
                    category=category,
                    name=self._random_product_name(),
                    short_description="Auto-generated random mock product.",
                    description="Generated by seed_mock_inventory command.",
                    min_retail_price=sale_price,
                    max_retail_price=max_retail_price,
                    sale_price=sale_price,
                    stock_quantity=random.randint(1, 150),
                )

                if all_tag_names:
                    sample_size = min(len(all_tag_names), random.randint(1, 4))
                    product.tags.set(random.sample(all_tag_names, k=sample_size))
                created_random_products += 1

        created_sample_books = 0
        created_sample_book_tags = 0
        if sample_books_requested > 0:
            book_catalog = self._book_catalog()

            for genre in book_catalog.values():
                for tag_name in genre["tags"]:
                    _, created = Tag.objects.get_or_create(name=tag_name)
                    if created:
                        created_sample_book_tags += 1

            author_pool = [author_1, author_2]
            extra_author_names = [
                "Riya Sen",
                "Vikram Nair",
                "Meera Pillai",
                "Arjun Bhat",
                "Nisha Thomas",
                "Rahul Menon",
                "Sneha Kapoor",
                "Dev Malhotra",
                "Priya Rao",
                "Kiran Das",
            ]
            for name in extra_author_names:
                author, _ = Author.objects.get_or_create(name=name, defaults={"bio": "Sample seed author profile."})
                author_pool.append(author)

            category_names = list(book_catalog.keys())
            for index in range(sample_books_requested):
                category_name = random.choice(category_names)
                category = categories[category_name]
                catalog_entry = book_catalog[category_name]
                base_title = random.choice(catalog_entry["titles"])
                title_variant = random.choice(["", " - Student Edition", " - Collector's Edition", " - Reading Copy"])
                title = f"{base_title}{title_variant}".strip()

                max_retail_price = self._random_decimal(180, 1800)
                discount = self._random_decimal(10, 350)
                sale_price = max(Decimal("50.00"), max_retail_price - discount)

                book = Book.objects.create(
                    sku=f"BOOK-SAMPLE-{generate_uuid7().hex[:12].upper()}",
                    category=category,
                    name=title,
                    short_description=f"Sample listing for {base_title}.",
                    description=f"A curated pre-loved copy of {base_title}.",
                    min_retail_price=sale_price,
                    max_retail_price=max_retail_price,
                    sale_price=sale_price,
                    stock_quantity=random.randint(1, 80),
                    isbn_10=self._random_numeric_string(10),
                    isbn_13=f"978{self._random_numeric_string(10)}",
                    book_language=random.choice(["English", "Hindi", "Tamil", "Malayalam"]),
                    book_edition=random.choice(["1st", "2nd", "3rd", "Revised"]),
                    cover_type=random.choice(["Paperback", "Hardcover"]),
                    page_count=random.randint(120, 980),
                    publisher=publisher,
                    published_year=random.randint(1990, 2025),
                )

                tag_sample_size = min(len(catalog_entry["tags"]), random.randint(2, 4))
                selected_tags = set(random.sample(catalog_entry["tags"], k=tag_sample_size))
                selected_tags.add(random.choice(["bestseller", "gift", "student", "recommended"]))
                book.tags.set(list(selected_tags))

                author_count = min(len(author_pool), random.randint(1, 2))
                book.authors.set(random.sample(author_pool, k=author_count))
                created_sample_books += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Seed complete. "
                f"categories_created={created_categories}, tags_created={created_tags}, "
                f"products_created={created_products}, books_created={created_books}, soaps_created={created_soaps}, "
                f"random_tags_requested={random_tags_requested}, random_tags_created={created_random_tags}, "
                f"random_products_requested={random_products_requested}, random_products_created={created_random_products}, "
                f"sample_books_requested={sample_books_requested}, sample_books_created={created_sample_books}, "
                f"sample_book_tags_created={created_sample_book_tags}"
            )
        )
