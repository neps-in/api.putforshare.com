"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AuthLayout from "@/components/AuthLayout";
import { parseFormError } from "@/lib/forms";
import { verifyEmail } from "@/lib/storeAuth";

export default function VerifyEmailPageClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, setState] = useState({ status: "loading", message: "" });
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!token) {
      setState({
        status: "error",
        message: "Verification link is missing or invalid. Sign up again or request a new link.",
      });
      return;
    }

    verifyEmail({ token })
      .then(() => {
        setState({ status: "success", message: "Email verified. You can now log in." });
      })
      .catch((err) => {
        const parsed = parseFormError(err, "Verification failed");
        setState({ status: "error", message: parsed.detail });
      });
  }, [token]);

  const subtitle =
    state.status === "loading"
      ? "Confirming your email…"
      : state.status === "success"
      ? "Welcome to PutForShare"
      : "Something went wrong";

  return (
    <AuthLayout title="Verify Email" subtitle={subtitle} carouselVariant="signup">
      <div className="mt-4 grid gap-4 text-sm text-slate-700">
        {state.status === "loading" ? <p>Please wait while we verify your email…</p> : null}
        {state.status === "success" ? (
          <>
            <p className="font-semibold text-emerald-600">{state.message}</p>
            <Link
              href="/login"
              className="inline-flex w-fit items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
            >
              Go to login
            </Link>
          </>
        ) : null}
        {state.status === "error" ? (
          <>
            <p className="font-semibold text-red-600">{state.message}</p>
            <div className="flex gap-4 text-sm font-semibold text-orange-700">
              <Link className="hover:text-orange-800" href="/login">
                Back to login
              </Link>
              <Link className="hover:text-orange-800" href="/signup">
                Sign up again
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </AuthLayout>
  );
}
