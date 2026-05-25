import { createAuthClient } from "@/lib/authClient";

export const authClient = createAuthClient({
  tokenStorageKey: "storefront_auth_token",
  userStorageKey: "storefront_user"
});

export const signup = ({ email, username, fullName, password }) => {
  return authClient.signup({
    email,
    username: String(username || "").trim(),
    full_name: fullName,
    password
  });
};

export const login = ({ email, password }) =>
  authClient.login({ email, password }).then((payload) => {
    authClient.setSession({
      token: payload.token,
      user: payload.user
    });
    return payload;
  });

export const logout = async () => {
  try {
    await authClient.authFetch("auth/logout/", { method: "POST" });
  } finally {
    authClient.clearSession();
  }
};

export const forgotPassword = ({ email }) => authClient.forgotPassword({ email });
export const resetPassword = ({ token, password }) => authClient.resetPassword({ token, password });
export const verifyEmail = ({ token }) => authClient.verifyEmail({ token });
export const resendVerification = ({ email }) => authClient.resendVerification({ email });
export const changePassword = ({ currentPassword, newPassword }) => authClient.changePassword({ currentPassword, newPassword });
export const getCurrentUser = () => authClient.getUser();
export const getAccessToken = () => authClient.getToken();
