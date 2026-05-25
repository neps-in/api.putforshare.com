import { authClient } from "@/lib/storeAuth";
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

function emptyPage() {
  return { count: 0, next: null, previous: null, results: [] };
}

async function graphqlFetch(query, variables = {}) {
  const payload = await authClient.publicFetch("graphql/", {
    method: "POST",
    body: { query, variables }
  });

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    throw new Error(payload.errors[0]?.message || "GraphQL request failed");
  }

  return payload?.data || {};
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
  const payload = await authClient.publicFetch(`inventory/products/?${query.toString()}`, { method: "GET" });
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
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
  const payload = await authClient.publicFetch(`inventory/authors/with-product-count/?${query.toString()}`, {
    method: "GET"
  });
  if (payload && typeof payload === "object") {
    return {
      count: Number(payload.count || 0),
      next: payload.next ?? null,
      previous: payload.previous ?? null,
      results: Array.isArray(payload.results) ? payload.results : []
    };
  }
  return emptyPage();
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
  const payload = await authClient.publicFetch(`inventory/publishers/with-product-count/?${query.toString()}`, {
    method: "GET"
  });
  if (payload && typeof payload === "object") {
    return {
      count: Number(payload.count || 0),
      next: payload.next ?? null,
      previous: payload.previous ?? null,
      results: Array.isArray(payload.results) ? payload.results : []
    };
  }
  return emptyPage();
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
  const data = await authClient.publicFetch(`inventory/re-store/products/?${query.toString()}`, {
    method: "GET"
  });
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

export async function fetchUnderPriceProducts({ page = 1, pageSize = 24, maxPrice = 10 } = {}) {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    max_price: String(maxPrice)
  });
  const data = await authClient.publicFetch(`inventory/under-price/products/?${query.toString()}`, {
    method: "GET"
  });
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

export async function fetchMe() {
  const data = await authClient.me();
  return data?.user || null;
}

export async function updateMyProfile(payload) {
  const data = await authClient.authFetch("auth/me/", { method: "PATCH", body: payload });
  return data?.user || null;
}

export async function requestPhotoUploadSignature({ fileName, contentType, fileSizeBytes, altTag = "" }) {
  return authClient.authFetch("photos/presign-upload/", {
    method: "POST",
    body: {
      file_name: fileName,
      content_type: contentType,
      file_size_bytes: fileSizeBytes,
      alt_tag: altTag
    }
  });
}

export async function markPhotoUploaded(photoUuid, payload = {}) {
  return authClient.authFetch(`photos/${photoUuid}/mark-uploaded/`, {
    method: "POST",
    body: payload
  });
}

export async function attachPhoto(photoUuid, payload) {
  return authClient.authFetch(`photos/${photoUuid}/attach/`, {
    method: "POST",
    body: payload
  });
}

export async function fetchTargetPhotos({ targetType, targetUuid, targetSlug, relationType = "" }) {
  const queryParams = new URLSearchParams();
  queryParams.set("target_type", targetType);
  if (targetUuid) {
    queryParams.set("target_uuid", targetUuid);
  }
  if (targetSlug) {
    queryParams.set("target_slug", targetSlug);
  }
  if (relationType) {
    queryParams.set("relation_type", relationType);
  }

  const payload = await authClient.publicFetch(`photos/by-target/?${queryParams.toString()}`);
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }
  return [];
}

export async function fetchAddresses() {
  const data = await authClient.authFetch("addresses/", { method: "GET" });
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.results)) {
    return data.results;
  }
  return [];
}

export async function createAddress(payload) {
  const data = await authClient.authFetch("addresses/", { method: "POST", body: payload });
  return data;
}

export async function updateAddress(uuid, payload) {
  const data = await authClient.authFetch(`addresses/${uuid}/`, { method: "PATCH", body: payload });
  return data;
}

export async function checkoutPreview(payload) {
  return authClient.authFetch("checkout/preview/", { method: "POST", body: payload });
}

export async function checkoutInitiate(payload) {
  return authClient.authFetch("checkout/initiate/", { method: "POST", body: payload });
}

export async function fetchMyOrders() {
  const data = await authClient.authFetch("orders/", { method: "GET" });
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.results)) {
    return data.results;
  }
  return [];
}

export async function initiatePayment(payload) {
  return authClient.authFetch("payment/initiate/", { method: "POST", body: payload });
}
