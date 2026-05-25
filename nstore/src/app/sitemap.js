const DEFAULT_SITE_URL = "http://localhost:3000";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function trimLeadingSlash(value) {
  return String(value || "").replace(/^\/+/, "");
}

function normalizeBasePath(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "/") {
    return "";
  }
  return `/${raw.replace(/^\/+|\/+$/g, "")}`;
}

function joinUrl(base, path) {
  const normalizedBase = trimTrailingSlash(base || DEFAULT_API_BASE_URL);
  const normalizedPath = trimLeadingSlash(path || "");
  return `${normalizedBase}/${normalizedPath}`;
}

function getSiteUrl() {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL);
}

function getSiteBasePath() {
  return normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH || process.env.NEXT_BASE_PATH || "");
}

function getApiBaseUrl() {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL);
}

async function fetchAllFromEndpoint(path, { pageSize = 100, params = {} } = {}) {
  const results = [];
  const apiBaseUrl = getApiBaseUrl();
  let page = 1;

  while (page < 1000) {
    const query = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
      ...Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, value == null ? "" : String(value)])
      )
    });

    const response = await fetch(joinUrl(apiBaseUrl, `${path}?${query.toString()}`), {
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      break;
    }

    const payload = await response.json();
    if (!payload || typeof payload !== "object") {
      break;
    }

    const pageResults = Array.isArray(payload.results) ? payload.results : [];
    results.push(...pageResults);

    if (!payload.next) {
      break;
    }

    page += 1;
  }

  return results;
}

export const revalidate = 3600;

export default async function sitemap() {
  const siteUrl = getSiteUrl();
  const siteBasePath = getSiteBasePath();
  const siteRootUrl = `${siteUrl}${siteBasePath}`;
  const staticUrls = [
    "",
    "categories",
    "tags",
    "authors",
    "publishers",
    "re-store",
    "under-10"
  ];

  const entries = staticUrls.map((path) => ({
    url: `${siteRootUrl}/${path}`.replace(/\/+$/, "") || siteRootUrl,
    changeFrequency: "weekly",
    priority: path ? 0.6 : 1.0
  }));

  let products = [];
  let tags = [];
  let categories = [];
  let authors = [];
  let publishers = [];
  let sellers = [];

  try {
    [products, tags, categories, authors, publishers, sellers] = await Promise.all([
      fetchAllFromEndpoint("inventory/products/", { pageSize: 100 }),
      fetchAllFromEndpoint("inventory/tags/", { pageSize: 100 }),
      fetchAllFromEndpoint("inventory/categories/with-product-count/", { pageSize: 100 }),
      fetchAllFromEndpoint("inventory/authors/with-product-count/", { pageSize: 100 }),
      fetchAllFromEndpoint("inventory/publishers/with-product-count/", { pageSize: 100 }),
      fetchAllFromEndpoint("inventory/sellers/with-product-count/", { pageSize: 100 })
    ]);
  } catch {
    // If the API is unavailable, still return the static URLs.
    return entries;
  }

  const productEntries = products
    .filter((product) => product && product.uuid && product.is_active !== false)
    .map((product) => ({
      url: `${siteRootUrl}/product/${product.uuid}`,
      changeFrequency: "weekly",
      priority: 0.8
    }));

  const tagEntries = tags
    .filter((tag) => tag && tag.slug && Number(tag.product_count || 0) > 0)
    .map((tag) => ({
      url: `${siteRootUrl}/tag/${tag.slug}/products`,
      changeFrequency: "weekly",
      priority: 0.6
    }));

  const categoryEntries = categories
    .filter(
      (category) =>
        category &&
        category.uuid &&
        category.is_active !== false &&
        Number(category.product_count || 0) > 0
    )
    .map((category) => ({
      url: `${siteRootUrl}/category/${category.uuid}/products`,
      changeFrequency: "weekly",
      priority: 0.7
    }));

  const authorEntries = authors
    .filter(
      (author) =>
        author && author.slug && author.is_active !== false && Number(author.product_count || 0) > 0
    )
    .map((author) => ({
      url: `${siteRootUrl}/author/${author.slug}/books`,
      changeFrequency: "weekly",
      priority: 0.7
    }));

  const publisherEntries = publishers
    .filter(
      (publisher) =>
        publisher &&
        publisher.slug &&
        publisher.is_active !== false &&
        Number(publisher.product_count || 0) > 0
    )
    .map((publisher) => ({
      url: `${siteRootUrl}/publisher/${publisher.slug}/books`,
      changeFrequency: "weekly",
      priority: 0.7
    }));

  const sellerEntries = sellers
    .filter((seller) => seller && seller.uuid && Number(seller.product_count || 0) > 0)
    .map((seller) => ({
      url: `${siteRootUrl}/seller/${seller.uuid}/products`,
      changeFrequency: "weekly",
      priority: 0.5
    }));

  return [
    ...entries,
    ...productEntries,
    ...tagEntries,
    ...categoryEntries,
    ...authorEntries,
    ...publisherEntries,
    ...sellerEntries
  ];
}
