"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import InlineFieldError from "@/components/InlineFieldError";
import PasswordInput from "@/components/PasswordInput";
import { parseFormError } from "@/lib/forms";
import { changePassword } from "@/lib/storeAuth";
import { useAuth } from "@/components/ClientShell";

export default function ChangePasswordPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  if (!user) {
    router.push("/login");
    return null;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setFieldErrors({});

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await changePassword({ currentPassword, password });
      setMessage("Password updated.");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      const parsedError = parseFormError(err, "Change password failed");
      setError(parsedError.detail);
      setFieldErrors(parsedError.fieldErrors);
    }
  };

  return (
    <AuthLayout title="Change Password" subtitle="Keep your account secure">
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <PasswordInput
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <InlineFieldError fieldErrors={fieldErrors} names={["current_password"]} />
        <PasswordInput
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
        />
        <InlineFieldError fieldErrors={fieldErrors} names={["password"]} />
        <PasswordInput
          placeholder="Confirm new password"
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
        <Link className="hover:text-orange-800" href="/profile">
          Back to profile
        </Link>
      </div>
    </AuthLayout>
  );
}
