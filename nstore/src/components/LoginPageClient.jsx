"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import InlineFieldError from "@/components/InlineFieldError";
import PasswordInput from "@/components/PasswordInput";
import { parseFormError } from "@/lib/forms";
import { login, resendVerification } from "@/lib/storeAuth";
import { useAuth } from "@/components/ClientShell";

const UNVERIFIED_ERROR = "Email not verified. Check your inbox.";

export default function LoginPageClient() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [resendState, setResendState] = useState({ status: "idle", message: "" });

  if (user) {
    router.push("/");
    return null;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    setResendState({ status: "idle", message: "" });

    try {
      const payload = await login({ email, password });
      setUser(payload.user || null);
      router.push("/");
    } catch (err) {
      const parsedError = parseFormError(err, "Login failed");
      setError(parsedError.detail);
      setFieldErrors(parsedError.fieldErrors);
    }
  };

  const onResend = async () => {
    setResendState({ status: "loading", message: "" });
    try {
      await resendVerification({ email });
      setResendState({
        status: "success",
        message: "If a pending verification exists for that email, a new link was sent.",
      });
    } catch (err) {
      const parsed = parseFormError(err, "Unable to resend verification email");
      setResendState({ status: "error", message: parsed.detail });
    }
  };

  const showResendCta = error === UNVERIFIED_ERROR && Boolean(email);

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300";

  return (
    <AuthLayout title="Login" subtitle="Use your DJRE account" carouselVariant="login">
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
        />
        <InlineFieldError fieldErrors={fieldErrors} names={["email"]} />
        <PasswordInput placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <InlineFieldError fieldErrors={fieldErrors} names={["password"]} />
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        {showResendCta ? (
          <div className="grid gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
            <p className="text-sm text-slate-700">
              Didn't get the link? We can send a new one to <strong>{email}</strong>.
            </p>
            <button
              type="button"
              onClick={onResend}
              disabled={resendState.status === "loading"}
              className="inline-flex items-center justify-center rounded-xl border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-60"
            >
              {resendState.status === "loading" ? "Sending…" : "Resend verification email"}
            </button>
            {resendState.status === "success" ? (
              <p className="text-sm font-semibold text-emerald-600">{resendState.message}</p>
            ) : null}
            {resendState.status === "error" ? (
              <p className="text-sm font-semibold text-red-600">{resendState.message}</p>
            ) : null}
          </div>
        ) : null}
        <button
          className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
          type="submit"
        >
          Login
        </button>
      </form>
      <div className="mt-4 flex gap-4 text-sm font-semibold text-orange-700">
        <Link className="hover:text-orange-800" href="/signup">
          Create account
        </Link>
        <Link className="hover:text-orange-800" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
    </AuthLayout>
  );
}
