const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function getEnvApiBaseUrl() {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  return "";
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function joinUrl(base, path) {
  const normalizedBase = trimTrailingSlash(base || DEFAULT_API_BASE_URL);
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPath}`;
}

function createSafeStorage() {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    };
  }
  return window.localStorage;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const firstNestedMessage = (value) => {
      if (Array.isArray(value)) {
        for (const item of value) {
          const message = firstNestedMessage(item);
          if (message) return message;
        }
        return "";
      }
      if (value && typeof value === "object") {
        if (typeof value.message === "string" && value.message.trim()) return value.message.trim();
        if (typeof value.detail === "string" && value.detail.trim()) return value.detail.trim();
        for (const nested of Object.values(value)) {
          const message = firstNestedMessage(nested);
          if (message) return message;
        }
        return "";
      }
      if (typeof value === "string" && value.trim()) return value.trim();
      return "";
    };

    const detail = isJson
      ? payload?.detail ||
        payload?.message ||
        firstNestedMessage(payload?.errors) ||
        firstNestedMessage(payload) ||
        (typeof payload === "string" ? payload : null)
      : payload;
    const error = new Error(detail || `Request failed with status ${response.status}`);
    error.statusCode = response.status;
    if (isJson) {
      error.payload = payload;
      error.errors = payload?.errors ?? payload;
    } else {
      error.payload = payload;
      error.errors = null;
    }
    throw error;
  }

  return payload;
}

export function createAuthClient(options = {}) {
  const apiBaseUrl = trimTrailingSlash(options.apiBaseUrl || getEnvApiBaseUrl() || DEFAULT_API_BASE_URL);
  const storage = options.storage || createSafeStorage();
  const tokenStorageKey = options.tokenStorageKey || "auth_token";
  const userStorageKey = options.userStorageKey || "auth_user";

  const readToken = () => storage.getItem(tokenStorageKey);
  const readUser = () => {
    const raw = storage.getItem(userStorageKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  const setSession = ({ token, user }) => {
    if (token) {
      storage.setItem(tokenStorageKey, token);
    }
    if (user) {
      storage.setItem(userStorageKey, JSON.stringify(user));
    }
  };

  const clearSession = () => {
    storage.removeItem(tokenStorageKey);
    storage.removeItem(userStorageKey);
  };

  const request = async (path, { method = "GET", body, auth = false, headers = {} } = {}) => {
    const reqHeaders = {
      "Content-Type": "application/json",
      ...headers
    };

    if (auth) {
      const token = readToken();
      if (!token) {
        throw new Error("Not authenticated");
      }
      reqHeaders.Authorization = `Token ${token}`;
    }

    const response = await fetch(joinUrl(apiBaseUrl, path), {
      method,
      headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined
    });

    if (response.status === 401 && auth) {
      clearSession();
      throw new Error("Session expired. Please login again.");
    }

    return parseResponse(response);
  };

  return {
    getApiBaseUrl: () => apiBaseUrl,
    getToken: () => readToken(),
    getUser: () => readUser(),
    setSession,
    clearSession,
    signup: (payload) => request("auth/signup/", { method: "POST", body: payload }),
    login: (payload) => request("auth/login/", { method: "POST", body: payload }),
    forgotPassword: ({ email }) => request("auth/password-reset/request/", { method: "POST", body: { email } }),
    resetPassword: ({ token, password }) =>
      request("auth/password-reset/confirm/", {
        method: "POST",
        body: { token, password }
      }),
    verifyEmail: ({ token }) => request("auth/verify-email/", { method: "POST", body: { token } }),
    resendVerification: ({ email }) =>
      request("auth/verify-email/resend/", { method: "POST", body: { email } }),
    changePassword: ({ currentPassword, newPassword }) =>
      request("auth/change-password/", {
        method: "POST",
        auth: true,
        body: { current_password: currentPassword, new_password: newPassword }
      }),
    me: () => request("auth/me/", { auth: true }),
    authFetch: (path, options = {}) => request(path, { ...options, auth: true }),
    publicFetch: (path, options = {}) => request(path, options)
  };
}
