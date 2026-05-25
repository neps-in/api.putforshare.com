"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile } from "@/lib/api";
import { parseFormError } from "@/lib/forms";
import { useAuth } from "@/components/ClientShell";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function planLabel(planValue) {
  const plan = String(planValue || "").trim();
  if (!plan) return "Unknown";
  return plan
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export default function ProfilePageClient() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    mobile: "",
    upi_id: "",
    plan: "SMART_SELL",
    favourite_book: ""
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    setForm({
      full_name: user.full_name || "",
      username: user.username || "",
      mobile: user.mobile || "",
      upi_id: user.upi_id || "",
      plan: user.plan || "SMART_SELL",
      favourite_book: user.favourite_book || ""
    });
  }, [router, user]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setFieldErrors({});
    try {
      const updatedUser = await updateMyProfile(form);
      setUser(updatedUser || user);
      setMessage("Profile updated successfully.");
    } catch (err) {
      const parsedError = parseFormError(err, "Unable to update profile");
      setError(parsedError.detail);
      setFieldErrors(parsedError.fieldErrors);
    }
  };

  const planOptions = useMemo(
    () => [
      { value: "SELF_SELL", label: "Self Sell" },
      { value: "SMART_SELL", label: "Smart Sell" },
      { value: "DONATE_100", label: "Donate 100%" },
      { value: "DONATE_50", label: "Donate 50%" }
    ],
    []
  );

  if (!user) {
    return null;
  }

  const fieldClass =
    "w-full rounded-2xl border border-[#d9d4c8] bg-[#fffef8] px-4 py-3 text-sm text-[#322717] shadow-[0_1px_0_rgba(0,0,0,0.04)] transition focus:border-[#d08b43] focus:outline-none focus:ring-2 focus:ring-[#f8d8ac]";
  const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-[#715936]";
  const infoRowClass = "flex items-center justify-between rounded-2xl border border-[#eadfcb] bg-[#fffaf2] px-4 py-3";
  const isSeller = user.pfs_role === "SELLER";
  const isPlanLocked = isSeller && Boolean(user.plan_locked);

  return (
    <main className="relative min-h-[75vh] overflow-hidden bg-[radial-gradient(circle_at_top_right,_#fde9b9_0%,_#f7efe0_40%,_#f4f1e8_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background:linear-gradient(120deg,transparent_0%,rgba(167,114,49,0.1)_35%,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#f5cb8a]/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#8ea093]/20 blur-3xl" />

      <section className="relative mx-auto w-full max-w-6xl rounded-[32px] border border-[#c8b798] bg-[#f7f2e8]/95 p-5 shadow-[0_28px_60px_rgba(73,53,26,0.22)] backdrop-blur sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <aside className="order-2 rounded-[24px] border border-[#dac7a4] bg-[#fff9ef] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#84633a]">Account Suite</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#2f2517] [font-family:ui-serif,Georgia,Cambria,'Times_New_Roman',Times,serif]">
              My Profile
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#6b5738]">
              Manage your identity, payout details, and storefront visibility from one profile control center.
            </p>

            <div className="mt-6 grid gap-3">
              <div className={infoRowClass}>
                <span className={labelClass}>Email</span>
                <span className="max-w-[65%] truncate text-right text-sm font-semibold text-[#2e2315]">{user.email}</span>
              </div>
              <div className={infoRowClass}>
                <span className={labelClass}>Role</span>
                <span className="text-sm font-semibold text-[#2e2315]">{user.pfs_role || "-"}</span>
              </div>
              <div className={infoRowClass}>
                <span className={labelClass}>Mobile</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                    user.mobile_verified_on ? "bg-[#dff2df] text-[#1f6b34]" : "bg-[#ffe7c7] text-[#8a4f07]"
                  }`}
                >
                  {user.mobile_verified_on ? "Verified" : "Unverified"}
                </span>
              </div>
              <div className={infoRowClass}>
                <span className={labelClass}>UPI</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                    user.upi_verified ? "bg-[#dff2df] text-[#1f6b34]" : "bg-[#ffe7c7] text-[#8a4f07]"
                  }`}
                >
                  {user.upi_verified ? "Verified" : "Unverified"}
                </span>
              </div>
              <div className={infoRowClass}>
                <span className={labelClass}>Inventories</span>
                <span className="text-sm font-semibold text-[#2e2315]">{user.inventories ?? 0}</span>
              </div>
              <div className={infoRowClass}>
                <span className={labelClass}>Net Earnings</span>
                <span className="text-sm font-semibold text-[#2e2315]">Rs {user.net_earnings ?? 0}</span>
              </div>
              <div className={infoRowClass}>
                <span className={labelClass}>Member Since</span>
                <span className="text-sm font-semibold text-[#2e2315]">{formatDate(user.created_on)}</span>
              </div>
              <div className={infoRowClass}>
                <span className={labelClass}>Last Updated</span>
                <span className="text-sm font-semibold text-[#2e2315]">{formatDate(user.updated_on)}</span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-[#c9b58e] bg-[#fff5e3] px-4 py-3 text-sm text-[#6d5634]">
              Keep your profile current to improve buyer trust and successful order fulfillment.
            </div>
          </aside>

          <div className="order-1 rounded-[24px] border border-[#dcc9aa] bg-[#fffdf6] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <h2 className="text-lg font-semibold text-[#2f2517] [font-family:ui-serif,Georgia,Cambria,'Times_New_Roman',Times,serif]">
              Personal Details
            </h2>
            <p className="mt-1 text-sm text-[#6e5a3d]">These details are shared across dashboard and storefront experiences.</p>

            <form className="mt-5 grid gap-4" onSubmit={onSubmit}>
              <div className="grid gap-1.5">
                <label className={labelClass} htmlFor="full_name">Full Name</label>
                <input id="full_name" name="full_name" value={form.full_name} onChange={onChange} required className={fieldClass} />
                {fieldErrors.full_name ? <p className="text-xs font-semibold text-red-700">{fieldErrors.full_name}</p> : null}
              </div>

              <div className="grid gap-1.5">
                <label className={labelClass} htmlFor="username">Username</label>
                <input id="username" name="username" value={form.username} onChange={onChange} required className={fieldClass} />
                {fieldErrors.username ? <p className="text-xs font-semibold text-red-700">{fieldErrors.username}</p> : null}
              </div>

              <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
                <div className="grid gap-1.5">
                  <label className={labelClass} htmlFor="mobile">Mobile</label>
                  <input id="mobile" name="mobile" value={form.mobile} onChange={onChange} className={fieldClass} />
                  {fieldErrors.mobile ? <p className="text-xs font-semibold text-red-700">{fieldErrors.mobile}</p> : null}
                </div>
                <div className="grid gap-1.5">
                  <label className={labelClass} htmlFor="upi_id">UPI ID</label>
                  <input id="upi_id" name="upi_id" value={form.upi_id} onChange={onChange} className={fieldClass} />
                  {fieldErrors.upi_id ? <p className="text-xs font-semibold text-red-700">{fieldErrors.upi_id}</p> : null}
                </div>
              </div>

              <div className="grid gap-1.5">
                <label className={labelClass} htmlFor="plan">Plan</label>
                <select
                  id="plan"
                  name="plan"
                  value={form.plan}
                  onChange={onChange}
                  className={fieldClass}
                  disabled={isPlanLocked}
                >
                  {planOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#7f6a4a]">Current: {planLabel(form.plan)}</p>
                {isSeller ? (
                  <p className="text-xs text-[#7f6a4a]">
                    Once plan choosen cannot be edited, it will be locked.
                    {isPlanLocked ? " Your plan is locked." : ""}
                  </p>
                ) : null}
                {fieldErrors.plan ? <p className="text-xs font-semibold text-red-700">{fieldErrors.plan}</p> : null}
              </div>

              <div className="grid gap-1.5">
                <label className={labelClass} htmlFor="favourite_book">Favourite Book</label>
                <input
                  id="favourite_book"
                  name="favourite_book"
                  value={form.favourite_book}
                  onChange={onChange}
                  className={fieldClass}
                />
                {fieldErrors.favourite_book ? <p className="text-xs font-semibold text-red-700">{fieldErrors.favourite_book}</p> : null}
              </div>

              {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
              {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  className="inline-flex items-center justify-center rounded-2xl bg-[#b4651f] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(116,66,18,0.33)] transition hover:-translate-y-0.5 hover:bg-[#985116]"
                  type="submit"
                >
                  Save Profile
                </button>
                <Link
                  className="inline-flex items-center justify-center rounded-2xl border border-[#cbb488] bg-[#fef7ea] px-5 py-2.5 text-sm font-semibold text-[#6b4a20] transition hover:bg-[#f8edd6]"
                  href="/change-password"
                >
                  Change Password
                </Link>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
