const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://api.putforshare.com/api/v1";
const STORAGE_TOKEN_KEY = "pfs.auth.token";
const STORAGE_USER_KEY = "pfs.auth.user";

const TREE_NAMES = [
  "cedar",
  "oak",
  "maple",
  "pine",
  "willow",
  "elm",
  "birch",
  "spruce",
  "ash",
  "sequoia",
];
const PLANT_NAMES = [
  "lotus",
  "fern",
  "tulip",
  "ivy",
  "bamboo",
  "jasmine",
  "lavender",
  "aloe",
  "mint",
  "sage",
];
const FRUIT_NAMES = [
  "mango",
  "apple",
  "orange",
  "grape",
  "peach",
  "berry",
  "guava",
  "fig",
  "melon",
  "pear",
];
const USERNAME_WORDS = [...TREE_NAMES, ...PLANT_NAMES, ...FRUIT_NAMES];

const safeParseJson = (rawValue) => {
  if (!rawValue) return null;
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

export const getStoredToken = () =>
  localStorage.getItem(STORAGE_TOKEN_KEY) || "";

export const getStoredUser = () =>
  safeParseJson(localStorage.getItem(STORAGE_USER_KEY));

export const saveSession = (token, user) => {
  if (token) localStorage.setItem(STORAGE_TOKEN_KEY, token);
  if (user) localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
};

export const normalizeFieldErrors = (payload) => {
  if (!payload || typeof payload !== "object") return {};

  if (payload.errors && typeof payload.errors === "object") {
    return payload.errors;
  }

  return Object.entries(payload).reduce((acc, [key, value]) => {
    if (key === "detail" || key === "message" || key === "non_field_errors") {
      return acc;
    }

    if (Array.isArray(value)) {
      acc[key] = value.map((item) => String(item));
      return acc;
    }

    if (typeof value === "string") {
      acc[key] = [value];
      return acc;
    }

    return acc;
  }, {});
};

export const firstErrorMessage = (
  payload,
  fallback = "Something went wrong. Please try again."
) => {
  if (!payload) return fallback;
  if (typeof payload === "string") return payload;

  if (typeof payload.detail === "string" && payload.detail)
    return payload.detail;
  if (typeof payload.message === "string" && payload.message)
    return payload.message;

  if (
    Array.isArray(payload.non_field_errors) &&
    payload.non_field_errors.length
  ) {
    return String(payload.non_field_errors[0]);
  }

  const fieldErrors = normalizeFieldErrors(payload);
  for (const values of Object.values(fieldErrors)) {
    if (Array.isArray(values) && values.length) {
      return String(values[0]);
    }
  }

  return fallback;
};

export const requestApi = async (path, options = {}) => {
  const { auth = true, method = "GET", body } = options;
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Token ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text ? safeParseJson(text) ?? { detail: text } : null;

  if (!response.ok) {
    const error = new Error(
      firstErrorMessage(payload, `${method} ${path} failed`)
    );
    error.status = response.status;
    error.body = payload;
    throw error;
  }

  return payload;
};

export const generateUsername = () => {
  const first =
    USERNAME_WORDS[Math.floor(Math.random() * USERNAME_WORDS.length)];
  const second =
    USERNAME_WORDS[Math.floor(Math.random() * USERNAME_WORDS.length)];
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${first}_${second}${suffix}`
    .replace(/[^a-z0-9_]/gi, "")
    .toLowerCase();
};

export const authProvider = {
  login: async ({ email, username, password }) => {
    const userEmail = (email || username || "").trim();
    const payload = await requestApi("/auth/login/", {
      method: "POST",
      auth: false,
      body: {
        email: userEmail,
        password,
      },
    });

    saveSession(payload?.token, payload?.user);
  },

  logout: async () => {
    try {
      const token = getStoredToken();
      if (token) {
        await requestApi("/auth/logout/", { method: "POST" });
      }
    } catch {
      // Ignore logout API failures and clear local session anyway.
    } finally {
      clearSession();
    }
  },

  checkAuth: async () => {
    const publicPaths = [
      "/signup",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/earning-calculator",
    ];
    const hashPath = window.location.hash
      ? window.location.hash.replace(/^#/, "").split("?")[0]
      : "";
    const currentPath = hashPath || window.location.pathname;
    if (publicPaths.includes(currentPath)) {
      return;
    }
    if (!getStoredToken()) {
      throw new Error("Not authenticated");
    }
  },

  checkError: async (error) => {
    if (error?.status === 401 || error?.status === 403) {
      clearSession();
      throw new Error("");
    }
  },

  getIdentity: async () => {
    const toIdentity = (user) => ({
      id: user.uuid || user.email,
      fullName: user.full_name || user.username || user.email,
      ...user,
    });

    if (getStoredToken()) {
      try {
        const payload = await requestApi("/auth/me/");
        const user = payload?.user || null;
        if (user) {
          saveSession(getStoredToken(), user);
          return toIdentity(user);
        }
      } catch (error) {
        // fall through to cached identity below
      }
    }

    const localUser = getStoredUser();
    if (localUser) return toIdentity(localUser);

    throw new Error("Unable to fetch user identity");
  },

  getPermissions: async () => {
    if (getStoredToken()) {
      try {
        const payload = await requestApi("/auth/me/");
        const user = payload?.user || null;
        if (user) {
          saveSession(getStoredToken(), user);
          if (user.pfs_role) return user.pfs_role;
        }
      } catch (error) {
        // fall through to cached role below
      }
    }
    const localUser = getStoredUser();
    if (localUser?.pfs_role) return localUser.pfs_role;
    return null;
  },
};

export default authProvider;
