"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import InlineFieldError from "@/components/InlineFieldError";
import PasswordInput from "@/components/PasswordInput";
import { parseFormError } from "@/lib/forms";
import { resetPassword } from "@/lib/storeAuth";

export default function ResetPasswordPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setFieldErrors({});

    if (!token) {
      setError("Reset link is missing or invalid. Request a new one from the Forgot Password page.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await resetPassword({ token, password });
      setMessage("Password updated. You can login now.");
      setTimeout(() => router.push("/login"), 600);
    } catch (err) {
      const parsedError = parseFormError(err, "Reset failed");
      setError(parsedError.detail);
      setFieldErrors(parsedError.fieldErrors);
    }
  };

  return (
    <AuthLayout title="Reset Password" subtitle="Choose a new password" carouselVariant="reset">
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <PasswordInput placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
        <InlineFieldError fieldErrors={fieldErrors} names={["password"]} />
        <PasswordInput
          placeholder="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength={8}
        />
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        {message ? <p className="text-sm font-semibold text-emerald-600">{message}</p> : null}
        <button
          className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
          type="submit"
        >
          Update password
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
