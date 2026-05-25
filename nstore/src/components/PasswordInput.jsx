"use client";

import { useState } from "react";

export default function PasswordInput({ value, onChange, placeholder, required = true, minLength }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
      />
      <button
        type="button"
        className="inline-flex h-10 w-12 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-700 shadow-sm transition hover:bg-orange-100"
        onClick={() => setShowPassword((value) => !value)}
        aria-label="Toggle password visibility"
      >
        {showPassword ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            <path d="M3 4l17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path
              d="M10.6 6.2A10.8 10.8 0 0 1 12 6c5 0 8.9 3.9 10 6-0.5 0.9-1.5 2.3-3 3.5M6.4 8.4C4.5 9.8 3.4 11.3 3 12c1.1 2.1 5 6 10 6 1.3 0 2.5-0.2 3.6-0.6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
            <path
              d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
}
