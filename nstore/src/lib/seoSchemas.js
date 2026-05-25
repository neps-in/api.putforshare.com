const SITE_URL = String(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
const DEFAULT_IMAGE_URL = `${SITE_URL}/assets/default-book.png`;
const CURRENCY = "INR";

const asUrl = (path) => `${SITE_URL}/${String(path || "").replace(/^\/+/, "")}`;

const availabilityUrl = (stockQuantity) =>
  Number(stockQuantity) > 0
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

const productBrand = (product) => {
  if (product?.product_type === "BOOK" && product?.book_details?.publisher?.name) {
    return product.book_details.publisher.name;
  }
  if (product?.product_type === "SOAP" && product?.soap_details?.brand) {
    return product.soap_details.brand;
  }
  return "PutForShare";
};

const toProductNode = (product) => ({
  "@type": "Product",
  sku: product?.sku || "",
  name: product?.name || "",
  description: product?.short_description || product?.description || product?.name || "",
  image: DEFAULT_IMAGE_URL,
  category:
    product?.product_type === "BOOK"
      ? "Book"
      : product?.product_type === "SOAP"
        ? "Soap"
        : "General",
  brand: {
    "@type": "Brand",
    name: productBrand(product),
  },
  offers: {
    "@type": "Offer",
    priceCurrency: CURRENCY,
    price: String(product?.sale_price ?? ""),
    availability: availabilityUrl(product?.stock_quantity),
    url: asUrl(`product/${product?.uuid || ""}`),
    itemCondition: "https://schema.org/UsedCondition",
  },
});

export const buildProductListJsonLd = ({ title, path, products = [] }) => {
  const pageUrl = asUrl(path || "");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#collection`,
        url: pageUrl,
        name: title,
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#itemlist`,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: products.length,
        itemListElement: products.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: asUrl(`product/${item?.uuid || ""}`),
          item: toProductNode(item),
        })),
      },
    ],
  };
};

export const buildProductDetailJsonLd = ({ product }) => {
  const productUrl = asUrl(`product/${product?.uuid || ""}`);
  const graph = [
    {
      ...toProductNode(product),
      "@id": `${productUrl}#product`,
      url: productUrl,
    },
  ];

  if (product?.product_type === "BOOK" && product?.book_details) {
    graph.push({
      "@type": "Book",
      "@id": `${productUrl}#book`,
      url: productUrl,
      name: product?.name || "",
      isbn: product?.book_details?.isbn_13 || product?.book_details?.isbn_10 || "",
      inLanguage: product?.book_details?.book_language || "",
      bookEdition: product?.book_details?.book_edition || "",
      numberOfPages: product?.book_details?.page_count || undefined,
      author: (product?.book_details?.authors || []).map((author) => ({
        "@type": "Person",
        name: author?.name || "",
        url: author?.slug ? asUrl(`author/${author.slug}/books`) : undefined,
      })),
      publisher: product?.book_details?.publisher?.name
        ? {
            "@type": "Organization",
            name: product.book_details.publisher.name,
            url: product.book_details.publisher.slug
              ? asUrl(`publisher/${product.book_details.publisher.slug}/books`)
              : undefined,
          }
        : undefined,
      datePublished: product?.book_details?.published_year
        ? String(product.book_details.published_year)
        : undefined,
      image: DEFAULT_IMAGE_URL,
    });
  }

  if (product?.product_type === "SOAP" && product?.soap_details) {
    graph.push({
      "@type": "Product",
      "@id": `${productUrl}#soap`,
      name: product?.name || "",
      category: "Soap",
      brand: {
        "@type": "Brand",
        name: product?.soap_details?.brand || productBrand(product),
      },
      additionalProperty: [
        product?.soap_details?.fragrance
          ? { "@type": "PropertyValue", name: "Fragrance", value: product.soap_details.fragrance }
          : null,
        product?.soap_details?.skin_type
          ? { "@type": "PropertyValue", name: "Skin Type", value: product.soap_details.skin_type }
          : null,
        product?.soap_details?.net_weight_grams
          ? { "@type": "PropertyValue", name: "Net Weight (g)", value: String(product.soap_details.net_weight_grams) }
          : null,
        product?.soap_details?.shelf_life_months
          ? { "@type": "PropertyValue", name: "Shelf Life (months)", value: String(product.soap_details.shelf_life_months) }
          : null,
      ].filter(Boolean),
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
};

export const buildTaxonomyListJsonLd = ({ title, path, items = [], entityType = "Thing" }) => {
  const pageUrl = asUrl(path || "");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#collection`,
        url: pageUrl,
        name: title,
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#itemlist`,
        itemListOrder: "https://schema.org/ItemListOrderAscending",
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": entityType,
            name: item?.name || "",
            url: item?.url || pageUrl,
          },
        })),
      },
    ],
  };
};
