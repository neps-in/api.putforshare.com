import { getStoredToken } from "./authProvider";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.putforshare.com/api/v1";

const RESOURCE_PATHS = {
  addresses: "addresses",
  "my/address": "addresses",
  "my/addresses": "addresses",
  "my/inventory": "inventory/my-products",
  "my/packages": "logistics/packages",
  "my/pickup-requests": "logistics/pickup-requests",
  "my/inventories": "inventory/my-products",
  "admin/photos": "photos",
  "admin/s3-browser": "s3-browser",
  "admin/pincodes": "logistics/pincodes",
  packages: "logistics/packages",
  "pickup-requests": "logistics/pickup-requests",
  shippers: "logistics/shippers",
  pincodes: "logistics/pincodes",
  "package-profiles": "logistics/package-profiles",
};

const resolveResourcePath = (resource) => RESOURCE_PATHS[resource] || resource;

const mapRecord = (record) => {
  if (!record || typeof record !== "object") return record;
  const normalized = { ...record };
  // Keep DB primary key available for FK workflows where APIs expect integer IDs.
  normalized.pk = record.id;
  normalized.id = record.uuid ?? record.id;
  // React Admin form controls for inventory expect flat source fields.
  if (!normalized.category_uuid && record.category?.uuid) {
    normalized.category_uuid = record.category.uuid;
  }
  if (!normalized.author_name_input && record.author_name) {
    normalized.author_name_input = record.author_name;
  }
  if (!normalized.publisher_name_input && record.publisher_name) {
    normalized.publisher_name_input = record.publisher_name;
  }
  if (!normalized.isbn_10_input && record.isbn_10) {
    normalized.isbn_10_input = record.isbn_10;
  }
  if (!normalized.isbn_13_input && record.isbn_13) {
    normalized.isbn_13_input = record.isbn_13;
  }
  if (!normalized.product_category_kind && record.product_type) {
    if (record.product_type === "BOOK") normalized.product_category_kind = "BOOK";
    else if (record.product_type === "SOAP") normalized.product_category_kind = "SOAP";
    else normalized.product_category_kind = "OTHERS";
  }
  return normalized;
};

const safeParseJson = (rawValue) => {
  if (!rawValue) return null;
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

const pickErrorMessage = (body, fallback) => {
  if (typeof body?.detail === "string" && body.detail) return body.detail;
  if (typeof body?.message === "string" && body.message) return body.message;
  if (Array.isArray(body?.non_field_errors) && body.non_field_errors.length) {
    return String(body.non_field_errors[0]);
  }

  if (body && typeof body === "object") {
    for (const value of Object.values(body)) {
      if (Array.isArray(value) && value.length) return String(value[0]);
      if (typeof value === "string" && value) return value;
    }
  }
  return fallback;
};

const httpRequest = async (url, options = {}) => {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  const token = getStoredToken();
  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  const body = text ? safeParseJson(text) ?? { detail: text } : null;

  if (!response.ok) {
    const error = new Error(
      pickErrorMessage(body, `${response.status} ${response.statusText}`)
    );
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
};

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          query.append(key, String(item));
        }
      });
      return;
    }
    query.append(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : "";
};

const toListResponse = (payload) => {
  if (Array.isArray(payload)) {
    const data = payload.map(mapRecord);
    return { data, total: data.length };
  }

  if (payload && Array.isArray(payload.results)) {
    const data = payload.results.map(mapRecord);
    const total = Number(payload.count ?? data.length);
    return { data, total };
  }

  if (payload && Array.isArray(payload.data)) {
    const data = payload.data.map(mapRecord);
    const total = Number(payload.total ?? data.length);
    return { data, total };
  }

  const single = payload ? [mapRecord(payload)] : [];
  return { data: single, total: single.length };
};

const sanitizePayload = (data = {}) => {
  const payload = { ...data };
  const productKind = String(payload.product_category_kind || "BOOK");

  if (productKind !== "BOOK") {
    delete payload.sell_option;
    delete payload.author_name_input;
    delete payload.publisher_name_input;
    delete payload.book_edition_input;
    delete payload.cover_type_input;
    delete payload.book_language_input;
    delete payload.isbn_10_input;
    delete payload.isbn_13_input;
    delete payload.page_count_input;
    delete payload.published_year_input;
  }

  if (productKind !== "SOAP") {
    delete payload.soap_brand_input;
    delete payload.soap_fragrance_input;
    delete payload.soap_net_weight_grams_input;
    delete payload.soap_skin_type_input;
    delete payload.soap_shelf_life_months_input;
  }

  if (productKind !== "BOOK" && !String(payload.sku || "").trim()) {
    delete payload.sku;
  }

  delete payload.id;
  delete payload.pk;
  delete payload.uuid;
  delete payload.created_on;
  delete payload.updated_on;
  delete payload.product_category_kind;
  return payload;
};

const pickRawFile = (value) => {
  if (!value) return null;
  if (typeof File !== "undefined" && value instanceof File) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = pickRawFile(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object" && value.rawFile) {
    return pickRawFile(value.rawFile);
  }
  return null;
};

const hasBinaryPayload = (payload = {}) => Object.values(payload).some((value) => Boolean(pickRawFile(value)));

const toFormData = (payload = {}) => {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const rawFile = pickRawFile(value);
    if (rawFile) {
      formData.append(key, rawFile, rawFile.name);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, String(item)));
      return;
    }
    formData.append(key, String(value));
  });
  return formData;
};

export const dataProvider = {
  getList: async (resource, params) => {
    const endpoint = resolveResourcePath(resource);
    const { pagination = {}, sort = {}, filter = {} } = params || {};

    if (endpoint === "s3-browser") {
      const page = pagination.page ?? 1;
      const perPage = pagination.perPage ?? 24;
      const search = String(filter.q || filter.search || "").trim();

      if (!dataProvider._s3BrowserCursorStore) {
        dataProvider._s3BrowserCursorStore = {};
      }
      if (dataProvider._s3BrowserCursorSignature !== search || page === 1) {
        dataProvider._s3BrowserCursorStore = {};
        dataProvider._s3BrowserCursorSignature = search;
      }

      let query = `page_size=${encodeURIComponent(perPage)}`;
      const cursor = dataProvider._s3BrowserCursorStore[page - 1];
      if (cursor) query += `&cursor=${encodeURIComponent(cursor)}`;
      if (search) query += `&search=${encodeURIComponent(search)}`;

      const payload = await httpRequest(`${API_BASE_URL}/${endpoint}/?${query}`);
      if (payload?.next_cursor) {
        dataProvider._s3BrowserCursorStore[page] = payload.next_cursor;
      }

      const data = (payload?.results || []).map(mapRecord);
      return {
        data,
        total: payload?.next_cursor ? page * perPage + 1 : page * perPage,
      };
    }

    const query = {
      page: pagination.page ?? 1,
      page_size: pagination.perPage ?? 10,
    };

    if (sort.field) {
      const sortField = sort.field === "id" ? "uuid" : sort.field;
      query.ordering = sort.order === "DESC" ? `-${sortField}` : sortField;
    }

    Object.entries(filter).forEach(([key, value]) => {
      if (key === "q") {
        query.search = value;
      } else if (key === "id") {
        query.uuid = value;
      } else {
        query[key] = value;
      }
    });

    const payload = await httpRequest(
      `${API_BASE_URL}/${endpoint}/${toQueryString(query)}`
    );
    return toListResponse(payload);
  },

  getOne: async (resource, params) => {
    const endpoint = resolveResourcePath(resource);
    if (endpoint === "s3-browser") {
      const payload = await httpRequest(
        `${API_BASE_URL}/${endpoint}/detail/?key=${encodeURIComponent(params.id)}`
      );
      return { data: mapRecord(payload?.data || payload) };
    }

    const payload = await httpRequest(`${API_BASE_URL}/${endpoint}/${params.id}/`);
    return { data: mapRecord(payload) };
  },

  getMany: async (resource, params) => {
    const responses = await Promise.all(
      (params.ids || []).map((id) => dataProvider.getOne(resource, { id }))
    );
    return { data: responses.map((item) => item.data) };
  },

  getManyReference: async (resource, params) => {
    const filter = {
      ...(params.filter || {}),
      [params.target]: params.id,
    };
    return dataProvider.getList(resource, {
      pagination: params.pagination,
      sort: params.sort,
      filter,
    });
  },

  create: async (resource, params) => {
    const endpoint = resolveResourcePath(resource);
    const cleanPayload = sanitizePayload(params.data);
    const isMultipart = hasBinaryPayload(cleanPayload);
    const payload = await httpRequest(`${API_BASE_URL}/${endpoint}/`, {
      method: "POST",
      ...(isMultipart
        ? { body: toFormData(cleanPayload) }
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cleanPayload),
          }),
    });
    return { data: mapRecord(payload) };
  },

  update: async (resource, params) => {
    const endpoint = resolveResourcePath(resource);
    const cleanPayload = sanitizePayload(params.data);
    const isMultipart = hasBinaryPayload(cleanPayload);
    const payload = await httpRequest(`${API_BASE_URL}/${endpoint}/${params.id}/`, {
      method: "PATCH",
      ...(isMultipart
        ? { body: toFormData(cleanPayload) }
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cleanPayload),
          }),
    });
    return { data: mapRecord(payload) };
  },

  updateMany: async (resource, params) => {
    const responses = await Promise.all(
      (params.ids || []).map((id) =>
        dataProvider.update(resource, {
          id,
          data: params.data,
        })
      )
    );
    return { data: responses.map((item) => item.data.id) };
  },

  delete: async (resource, params) => {
    const endpoint = resolveResourcePath(resource);
    await httpRequest(`${API_BASE_URL}/${endpoint}/${params.id}/`, {
      method: "DELETE",
    });
    return { data: { id: params.id } };
  },

  deleteMany: async (resource, params) => {
    await Promise.all((params.ids || []).map((id) => dataProvider.delete(resource, { id })));
    return { data: params.ids || [] };
  },
};

export async function fetchInventoryIsbnMetadata(isbn, { refresh = false } = {}) {
  const query = new URLSearchParams();
  query.set("isbn", String(isbn || "").trim());
  if (refresh) {
    query.set("refresh", "true");
  }
  return httpRequest(`${API_BASE_URL}/inventory/isbn/fetch/?${query.toString()}`);
}

export default dataProvider;
