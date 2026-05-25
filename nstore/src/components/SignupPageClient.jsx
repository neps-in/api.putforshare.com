"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import InlineFieldError from "@/components/InlineFieldError";
import PasswordInput from "@/components/PasswordInput";
import { parseFormError } from "@/lib/forms";
import { resendVerification, signup } from "@/lib/storeAuth";
import { useAuth } from "@/components/ClientShell";

export default function SignupPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [resendState, setResendState] = useState({ status: "idle", message: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  if (user) {
    router.push("/");
    return null;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitted(false);
    setFieldErrors({});
    if (!agreeToTerms) {
      setError("You must agree to the Terms of Service.");
      return;
    }

    try {
      await signup({ fullName, username, email, password });
      setSubmitted(true);
    } catch (err) {
      const parsedError = parseFormError(err, "Signup failed");
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

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300";

  if (submitted) {
    return (
      <AuthLayout title="Check your inbox" subtitle="One last step to activate your account" carouselVariant="signup">
        <div className="mt-4 grid gap-4 text-sm text-slate-700">
          <p>
            We sent a verification link to <strong>{email}</strong>. Click the link to activate your account, then sign
            in.
          </p>
          <p className="text-slate-500">
            The link expires in 24 hours. If you don't see it, check spam — or resend below.
          </p>
          <button
            type="button"
            onClick={onResend}
            disabled={resendState.status === "loading"}
            className="inline-flex items-center justify-center rounded-xl border border-orange-300 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:opacity-60"
          >
            {resendState.status === "loading" ? "Sending…" : "Resend verification email"}
          </button>
          {resendState.status === "success" ? (
            <p className="text-sm font-semibold text-emerald-600">{resendState.message}</p>
          ) : null}
          {resendState.status === "error" ? (
            <p className="text-sm font-semibold text-red-600">{resendState.message}</p>
          ) : null}
          <div className="flex gap-4 pt-2 text-sm font-semibold text-orange-700">
            <Link className="hover:text-orange-800" href="/login">
              Back to login
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Create Account" subtitle="New accounts are created as customers by default" carouselVariant="signup">
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className={inputClass}
        />
        <InlineFieldError fieldErrors={fieldErrors} names={["full_name"]} />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className={inputClass}
        />
        <InlineFieldError fieldErrors={fieldErrors} names={["username"]} />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={inputClass}
        />
        <InlineFieldError fieldErrors={fieldErrors} names={["email"]} />
        <PasswordInput
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
        />
        <InlineFieldError fieldErrors={fieldErrors} names={["password"]} />
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        <button
          className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
          type="submit"
        >
          Signup
        </button>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            required
            className="h-4 w-4 accent-orange-500"
          />
          <span>I agree to Terms of Service</span>
        </label>
      </form>
      <div className="mt-4 flex gap-4 text-sm font-semibold text-orange-700">
        <Link className="hover:text-orange-800" href="/login">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
