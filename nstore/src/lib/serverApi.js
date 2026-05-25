import {
  PRODUCTS_QUERY,
  PRODUCT_DETAIL_QUERY,
  TAGS_WITH_COUNT_QUERY,
  CATEGORIES_WITH_COUNT_QUERY,
  AUTHORS_WITH_COUNT_QUERY,
  PUBLISHERS_WITH_COUNT_QUERY,
  PRODUCTS_BY_CATEGORY_QUERY,
  PRODUCTS_BY_TAG_QUERY,
  PRODUCTS_BY_AUTHOR_QUERY,
  PRODUCTS_BY_PUBLISHER_QUERY
} from "@/lib/queries";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL;
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function joinUrl(base, path) {
  const normalizedBase = trimTrailingSlash(base || DEFAULT_API_BASE_URL);
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPath}`;
}

async function graphqlFetch(query, variables = {}) {
  const response = await fetch(joinUrl(getApiBaseUrl(), "graphql/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed (${response.status})`);
  }

  const payload = await response.json();
  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(payload.errors[0]?.message || "GraphQL request failed");
  }

  return payload?.data || {};
}

function emptyPage() {
  return { count: 0, next: null, previous: null, results: [] };
}

async function fetchPaginatedRest(path, errorMessage) {
  const response = await fetch(joinUrl(getApiBaseUrl(), path), {
    method: "GET",
    next: { revalidate: 60 }
  });
  if (!response.ok) {
    throw new Error(errorMessage || `Could not load ${path}`);
  }
  const data = await response.json();
  if (data && typeof data === "object") {
    return {
      count: Number(data.count || 0),
      next: data.next ?? null,
      previous: data.previous ?? null,
      results: Array.isArray(data.results) ? data.results : []
    };
  }
  return emptyPage();
}

export async function fetchProducts({ page = 1, pageSize = 24 } = {}) {
  try {
    const data = await graphqlFetch(PRODUCTS_QUERY, { page, pageSize });
    if (Array.isArray(data?.products?.results) && data.products.results.length > 0) {
      return data.products.results;
    }
  } catch {
    // Fallback to REST when GraphQL is unavailable/misconfigured.
  }
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  const restData = await fetchPaginatedRest(`inventory/products/?${query.toString()}`, "Could not load products");
  return restData.results || [];
}

export async function fetchProductByUuid(uuid) {
  const data = await graphqlFetch(PRODUCT_DETAIL_QUERY, { uuid });
  return data?.productDetail || null;
}

export async function fetchTagsWithProductCount({ page = 1, pageSize = 12 } = {}) {
  const data = await graphqlFetch(TAGS_WITH_COUNT_QUERY, { page, pageSize });
  return data?.tagsWithProductCount || emptyPage();
}

export async function fetchCategoriesWithProductCount({ page = 1, pageSize = 12 } = {}) {
  const data = await graphqlFetch(CATEGORIES_WITH_COUNT_QUERY, { page, pageSize });
  return data?.categoriesWithProductCount || emptyPage();
}

export async function fetchAuthorsWithProductCount({ page = 1, pageSize = 12 } = {}) {
  try {
    const data = await graphqlFetch(AUTHORS_WITH_COUNT_QUERY, { page, pageSize });
    if (data?.authorsWithProductCount && Number(data.authorsWithProductCount.count || 0) > 0) {
      return data.authorsWithProductCount;
    }
  } catch {
    // Fallback to REST when GraphQL is unavailable/misconfigured.
  }
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return fetchPaginatedRest(
    `inventory/authors/with-product-count/?${query.toString()}`,
    "Could not load authors with product count"
  );
}

export async function fetchPublishersWithProductCount({ page = 1, pageSize = 12 } = {}) {
  try {
    const data = await graphqlFetch(PUBLISHERS_WITH_COUNT_QUERY, { page, pageSize });
    if (data?.publishersWithProductCount && Number(data.publishersWithProductCount.count || 0) > 0) {
      return data.publishersWithProductCount;
    }
  } catch {
    // Fallback to REST when GraphQL is unavailable/misconfigured.
  }
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return fetchPaginatedRest(
    `inventory/publishers/with-product-count/?${query.toString()}`,
    "Could not load publishers with product count"
  );
}

export async function fetchProductsByCategory(categoryUuid, { page = 1, pageSize = 24 } = {}) {
  const data = await graphqlFetch(PRODUCTS_BY_CATEGORY_QUERY, { categoryUuid, page, pageSize });
  return data?.productsByCategory || emptyPage();
}

export async function fetchProductsByTag(tagSlug, { page = 1, pageSize = 24 } = {}) {
  const data = await graphqlFetch(PRODUCTS_BY_TAG_QUERY, { tagSlug, page, pageSize });
  return data?.productsByTag || emptyPage();
}

export async function fetchProductsByAuthor(authorSlug, { page = 1, pageSize = 24 } = {}) {
  const data = await graphqlFetch(PRODUCTS_BY_AUTHOR_QUERY, { authorSlug, page, pageSize });
  return data?.productsByAuthor || emptyPage();
}

export async function fetchProductsByPublisher(publisherSlug, { page = 1, pageSize = 24 } = {}) {
  const data = await graphqlFetch(PRODUCTS_BY_PUBLISHER_QUERY, { publisherSlug, page, pageSize });
  return data?.productsByPublisher || emptyPage();
}

export async function fetchReStoreProducts({ page = 1, pageSize = 24 } = {}) {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return fetchPaginatedRest(`inventory/re-store/products/?${query.toString()}`, "Could not load Re Store products");
}

export async function fetchUnderPriceProducts({ page = 1, pageSize = 24, maxPrice = 10 } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    max_price: String(maxPrice)
  });
  return fetchPaginatedRest(`inventory/under-price/products/?${query.toString()}`, "Could not load under-price products");
}

export async function fetchSellersWithProductCount({ page = 1, pageSize = 24 } = {}) {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return fetchPaginatedRest(
    `inventory/sellers/with-product-count/?${query.toString()}`,
    "Could not load sellers with product count"
  );
}

export async function fetchProductsBySeller(sellerUuid, { page = 1, pageSize = 24 } = {}) {
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return fetchPaginatedRest(
    `inventory/sellers/${sellerUuid}/products/?${query.toString()}`,
    "Could not load seller products"
  );
}
