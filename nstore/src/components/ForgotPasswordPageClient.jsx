"use client";

import Link from "next/link";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import InlineFieldError from "@/components/InlineFieldError";
import { parseFormError } from "@/lib/forms";
import { forgotPassword } from "@/lib/storeAuth";

export default function ForgotPasswordPageClient() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setFieldErrors({});

    try {
      await forgotPassword({ email });
      setMessage("If an account exists, a reset link has been sent.");
    } catch (err) {
      const parsedError = parseFormError(err, "Unable to process request");
      setError(parsedError.detail);
      setFieldErrors(parsedError.fieldErrors);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300";

  return (
    <AuthLayout title="Forgot Password" subtitle="We will email a reset link" carouselVariant="forgot">
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
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        {message ? <p className="text-sm font-semibold text-emerald-600">{message}</p> : null}
        <button
          className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
          type="submit"
        >
          Send reset link
        </button>
      </form>
      <div className="mt-4 flex gap-4 text-sm font-semibold text-orange-700">
        <Link className="hover:text-orange-800" href="/login">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  );
}
