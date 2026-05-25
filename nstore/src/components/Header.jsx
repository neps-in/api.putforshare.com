"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header({ searchText, onSearchTextChange, user, onLogout }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchText || "");
  const username =
    user?.username ||
    user?.full_name ||
    user?.email ||
    "";

  useEffect(() => {
    setLocalSearch(searchText || "");
  }, [searchText]);

  return (
    <header className="sticky top-0 z-50 bg-[#007073] text-white">
      <nav className="flex w-full items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-[7px] bg-white p-0.5">
            <img
              src="/assets/pfs-logo.svg"
              alt="PutForShare logo"
              className="h-8 w-8"
            />
          </div>
          <div className="leading-tight">
            <span className="block text-lg font-semibold tracking-wide">
              PutForShare
            </span>
            <span className="block text-xs font-medium text-white/80">
              Share Books Earn Money
            </span>
          </div>
        </div>

        <div className="hidden flex-1 justify-center md:flex">
          <div className="relative w-full max-w-2xl">
            <input
              type="search"
              placeholder="ISBN , Book Title, Author, Publisher"
              className="w-full rounded-full bg-white px-4 py-2.5 pr-12 text-[18px] font-semibold text-black placeholder:text-[#007073]/60 outline-none ring-1 ring-white/40 transition focus:ring-2 focus:ring-white"
              value={localSearch}
              onChange={(event) => onSearchTextChange(event.target.value)}
            />
            {localSearch ? (
              <button
                type="button"
                className="absolute inset-y-0 right-4 my-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#007073]/30 text-[#007073]/70 transition hover:text-[#007073]"
                onClick={() => {
                  setLocalSearch("");
                  onSearchTextChange("");
                }}
                aria-label="Clear search"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12"></path>
                  <path d="M18 6l-12 12"></path>
                </svg>
              </button>
            ) : null}
            <span className="pointer-events-none absolute inset-y-0 right-12 flex items-center text-muted">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7"></circle>
                <path d="M20 20l-3.5-3.5"></path>
              </svg>
            </span>
          </div>
        </div>

        <div className="hidden items-center gap-3 text-base font-medium text-white md:flex">
          <Link href="/re-store" className="hover:text-[#f3c12c]">
            1 Re Store
          </Link>
          <span className="text-white/70">|</span>
          <Link href="/under-10" className="hover:text-[#f3c12c]">
            Less than 10
          </Link>
          <span className="text-white/70">|</span>
          <Link href="/" className="hover:text-[#f3c12c]">
            Products
          </Link>
          <span className="text-white/70">|</span>
          <Link href="/categories" className="hover:text-[#f3c12c]">
            Categories
          </Link>
          <span className="text-white/70">|</span>
          <Link href="/tags" className="inline-flex items-center gap-1 hover:text-[#f3c12c]">
            <svg className="h-4.5 w-4.5 text-[#f81284]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 10l-8.5-8.5H4v7.5L12.5 17 20 10z" strokeLinecap="round" strokeLinejoin="round"></path>
              <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"></circle>
            </svg>
            Tags
          </Link>
          <span className="text-white/70">|</span>
          <Link href="/authors" className="hover:text-[#f3c12c]">
            Authors
          </Link>
          <span className="text-white/70">|</span>
          <Link href="/publishers" className="hover:text-[#f3c12c]">
            Publishers
          </Link>
          <span className="text-white/70">|</span>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="relative hidden items-center md:flex">
              <div className="group relative flex items-center">
                <span
                  className="mr-2 inline-block max-w-[180px] truncate text-sm font-semibold leading-none text-white/95"
                  title={username}
                >
                  {username}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-white/40 p-2 text-white transition hover:bg-white/10"
                >
                  <svg
                    className="h-[18px] w-[18px]"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <circle cx="12" cy="8" r="4"></circle>
                    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"></path>
                  </svg>
                </button>
                <div className="invisible absolute right-0 top-full z-20 min-w-[200px] rounded-xl border border-mist/70 bg-white p-2 text-sm text-[#007073] shadow-lg opacity-0 transition group-hover:visible group-hover:opacity-100">
                  <Link
                    href="/profile"
                    className="block rounded-lg px-3 py-2 font-semibold text-[#007073] hover:bg-soft"
                  >
                    Edit My Profile
                  </Link>
                  <Link
                    href="/addresses"
                    className="block rounded-lg px-3 py-2 font-semibold text-[#007073] hover:bg-soft"
                  >
                    My Address
                  </Link>
                  <Link
                    href="/change-password"
                    className="block rounded-lg px-3 py-2 font-semibold text-[#007073] hover:bg-soft"
                  >
                    Change My Password
                  </Link>
                  <Link
                    href="/orders"
                    className="block rounded-lg px-3 py-2 font-semibold text-[#007073] hover:bg-soft"
                  >
                    My Orders
                  </Link>
                  {onLogout ? (
                    <>
                      <div className="my-1 border-t border-slate-200" />
                      <button
                        type="button"
                        className="block w-full rounded-lg px-3 py-2 text-left font-semibold text-[#007073] hover:bg-soft"
                        onClick={onLogout}
                      >
                        Logout
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
          <Link
            href="/cart"
            className="hidden items-center justify-center rounded-full bg-[#f4c833] p-2 text-[#731d00] transition hover:bg-[#f4c833]/90 md:inline-flex"
            aria-label="Cart"
          >
            <svg
              className="h-[30px] w-[30px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M6 6h15l-2 9H8L6 6zm0 0L5 3H2"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
              <circle cx="9" cy="20" r="1.5" fill="currentColor"></circle>
              <circle cx="18" cy="20" r="1.5" fill="currentColor"></circle>
            </svg>
          </Link>
          {!user ? (
            <>
              <Link
                href="/signup"
                className="hidden w-auto whitespace-nowrap rounded-full bg-white px-4 py-2 text-[17px] font-bold text-[#007073] transition hover:bg-white/90 md:inline-flex"
              >
                Get Started
              </Link>
              <Link
                href="/signup"
                className="w-auto whitespace-nowrap rounded-full bg-white px-4 py-2 text-[17px] font-bold text-[#007073] transition hover:bg-white/90 md:hidden"
              >
                Get Started
              </Link>
            </>
          ) : null}
          <Link
            href="/cart"
            className="inline-flex items-center justify-center rounded-full bg-[#f4c833] p-2 text-[#731d00] transition hover:bg-[#f4c833]/90 md:hidden"
            aria-label="Cart"
          >
            <svg
              className="h-[24px] w-[24px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M6 6h15l-2 9H8L6 6zm0 0L5 3H2"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
              <circle cx="9" cy="20" r="1.5" fill="currentColor"></circle>
              <circle cx="18" cy="20" r="1.5" fill="currentColor"></circle>
            </svg>
          </Link>
          <button
            className="inline-flex items-center justify-center rounded-full border border-white/40 p-2 text-white transition hover:bg-white/10 md:hidden"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18"></path>
              <path d="M3 12h18"></path>
              <path d="M3 18h18"></path>
            </svg>
          </button>
        </div>
      </nav>

      <div className="hidden w-full bg-[#007073] px-6 pb-4 text-white md:block">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-base font-medium">
          <a href="https://putforshare.com/" className="inline-flex items-center leading-none hover:text-white/80">
            Home
          </a>
          <span className="px-1 text-white/70">|</span>
          <div className="relative group">
            <button
              type="button"
              className="inline-flex items-center gap-1 leading-none hover:text-white/80"
            >
              How it works ?<span className="text-xs">▾</span>
            </button>
            <div className="invisible absolute left-0 top-full z-20 min-w-[200px] rounded-xl border border-mist/70 bg-white p-2 text-sm text-[#007073] shadow-lg opacity-0 transition group-hover:visible group-hover:opacity-100">
              <a
                href="https://putforshare.com/how-does-it-work-for-donors/"
                className="block rounded-lg px-3 py-2 font-semibold text-[#007073] hover:bg-soft"
              >
                For Donors
              </a>
              <a
                href="https://putforshare.com/how-does-it-work-for-sellers/"
                className="block rounded-lg px-3 py-2 font-semibold text-[#007073] hover:bg-soft"
              >
                For Sellers
              </a>
              <a
                href="https://putforshare.com/how-does-it-work-for-buyers/"
                className="block rounded-lg px-3 py-2 font-semibold text-[#007073] hover:bg-soft"
              >
                For Buyers
              </a>
            </div>
          </div>
          <span className="px-1 text-white/70">|</span>
          <a
            href="https://putforshare.com/blog/"
            className="inline-flex items-center leading-none hover:text-white/80"
          >
            Blog
          </a>
          <span className="px-1 text-white/70">|</span>
          <a
            href="https://putforshare.com/donate-books/"
            className="inline-flex items-center leading-none hover:text-white/80"
          >
            Donate / Sell
          </a>
          <span className="px-1 text-white/70">|</span>
          <div className="relative group">
            <button
              type="button"
              className="inline-flex items-center gap-1 leading-none hover:text-white/80"
            >
              Scholarship
              <span className="text-xs">▾</span>
            </button>
            <div className="invisible absolute left-0 top-full z-20 min-w-[220px] rounded-xl border border-mist/70 bg-white p-2 text-sm text-[#007073] shadow-lg opacity-0 transition group-hover:visible group-hover:opacity-100">
              <a
                href="https://putforshare.com/scholarship/"
                className="block rounded-lg px-3 py-2 font-semibold text-[#007073] hover:bg-soft"
              >
                Programme Details
              </a>
              <a
                href="https://putforshare.com/students-approved-for-scholarship-programme/"
                className="block rounded-lg px-3 py-2 font-semibold text-[#007073] hover:bg-soft"
              >
                Availing Students
              </a>
            </div>
          </div>
          <span className="px-1 text-white/70">|</span>
          <div className="relative group">
            <a
              href="https://putforshare.com/about-us/"
              className="inline-flex items-center gap-1 leading-none hover:text-white/80"
            >
              About Us
              <span className="text-xs">▾</span>
            </a>
            <div className="invisible absolute left-0 top-full z-20 min-w-[200px] rounded-xl border border-mist/70 bg-white p-2 text-sm text-[#007073] shadow-lg opacity-0 transition group-hover:visible group-hover:opacity-100">
              <a
                href="https://putforshare.com/testimonials/"
                className="block rounded-lg px-3 py-2 font-semibold text-[#007073] hover:bg-soft"
              >
                Testimonials
              </a>
            </div>
          </div>
          <span className="px-1 text-white/70">|</span>
          <div className="relative group">
            <a
              href="https://putforshare.com/help/"
              className="inline-flex items-center gap-1 leading-none hover:text-white/80"
            >
              Help
              <span className="text-xs">▾</span>
            </a>
            <div className="invisible absolute left-0 top-full z-20 min-w-[200px] rounded-xl border border-mist/70 bg-white p-2 text-sm text-[#007073] shadow-lg opacity-0 transition group-hover:visible group-hover:opacity-100">
              <a
                href="https://putforshare.com/useful-info"
                className="block rounded-lg px-3 py-2 font-semibold text-[#007073] hover:bg-soft"
              >
                Helpful Info
              </a>
            </div>
          </div>
          <span className="px-1 text-white/70">|</span>
          <a
            href="https://dash.putforshare.com/"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center leading-none hover:text-white/80"
          >
            Book Free Pickup
          </a>
        </div>
      </div>

      <div className="block w-full px-6 pb-4 md:hidden">
        <div className="relative w-full">
          <input
            type="search"
            placeholder="Search"
            className="w-full rounded-full bg-white px-4 py-2.5 pr-12 text-[18px] font-semibold text-black placeholder:text-[#007073]/60 outline-none ring-1 ring-white/40 transition focus:ring-2 focus:ring-white"
            value={localSearch}
            onChange={(event) => onSearchTextChange(event.target.value)}
          />
          {localSearch ? (
            <button
              type="button"
              className="absolute inset-y-0 right-4 my-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#007073]/30 text-[#007073]/70 transition hover:text-[#007073]"
              onClick={() => {
                setLocalSearch("");
                onSearchTextChange("");
              }}
              aria-label="Clear search"
            >
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 6l12 12"></path>
                <path d="M18 6l-12 12"></path>
              </svg>
            </button>
          ) : null}
          <span className="pointer-events-none absolute inset-y-0 right-12 flex items-center text-muted">
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs font-medium text-white">
          <Link href="/" className="hover:text-white/80">
            Products
          </Link>
          <span className="px-1 text-white/70">|</span>
          <Link href="/categories" className="hover:text-white/80">
            Categories
          </Link>
          <span className="px-1 text-white/70">|</span>
          <Link href="/tags" className="inline-flex items-center gap-1 hover:text-white/80">
            <svg className="h-4.5 w-4.5 text-[#f81284]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 10l-8.5-8.5H4v7.5L12.5 17 20 10z" strokeLinecap="round" strokeLinejoin="round"></path>
              <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"></circle>
            </svg>
            Tags
          </Link>
          <span className="px-1 text-white/70">|</span>
          <Link href="/authors" className="hover:text-white/80">
            Authors
          </Link>
          <span className="px-1 text-white/70">|</span>
          <Link href="/publishers" className="hover:text-white/80">
            Publishers
          </Link>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="w-full border-t border-white/20 bg-[#007073] px-6 pb-6 text-white md:hidden">
          <div className="mt-4 grid gap-4 text-sm font-medium">
            {user ? (
              <div className="grid gap-2 rounded-xl border border-white/20 p-3 text-white">
                <span className="text-white/80">My Account</span>
                <Link
                  href="/profile"
                  className="pl-3 text-white/90 hover:text-white/80"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Edit My Profile
                </Link>
                <Link
                  href="/addresses"
                  className="pl-3 text-white/90 hover:text-white/80"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Address
                </Link>
                <Link
                  href="/change-password"
                  className="pl-3 text-white/90 hover:text-white/80"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Change My Password
                </Link>
                <Link
                  href="/orders"
                  className="pl-3 text-white/90 hover:text-white/80"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Orders
                </Link>
                {onLogout ? <div className="my-1 border-t border-white/20" /> : null}
                {onLogout ? (
                  <button
                    type="button"
                    className="pl-3 text-left text-white/90 hover:text-white/80"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                  >
                    Logout
                  </button>
                ) : null}
              </div>
            ) : null}
            <Link
              href="/"
              className="hover:text-white/80"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <div className="grid gap-2">
              <span className="text-white/80">How it works ?</span>
              <a
                href="https://putforshare.com/how-does-it-work-for-donors/"
                className="pl-3 text-white/90 hover:text-white/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                For Donors
              </a>
              <a
                href="https://putforshare.com/how-does-it-work-for-sellers/"
                className="pl-3 text-white/90 hover:text-white/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                For Sellers
              </a>
              <a
                href="https://putforshare.com/how-does-it-work-for-buyers/"
                className="pl-3 text-white/90 hover:text-white/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                For Buyers
              </a>
            </div>
            <a
              href="https://putforshare.com/blog/"
              className="hover:text-white/80"
              onClick={() => setMobileMenuOpen(false)}
            >
              Blog
            </a>
            <a
              href="https://putforshare.com/donate-books/"
              className="hover:text-white/80"
              onClick={() => setMobileMenuOpen(false)}
            >
              Donate / Sell
            </a>
            <div className="grid gap-2">
              <span className="text-white/80">Scholarship</span>
              <a
                href="https://putforshare.com/scholarship/"
                className="pl-3 text-white/90 hover:text-white/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Programme Details
              </a>
              <a
                href="https://putforshare.com/students-approved-for-scholarship-programme/"
                className="pl-3 text-white/90 hover:text-white/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Availing Students
              </a>
            </div>
            <div className="grid gap-2">
              <span className="text-white/80">About Us</span>
              <a
                href="https://putforshare.com/about-us/"
                className="pl-3 text-white/90 hover:text-white/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                About Us
              </a>
              <a
                href="https://putforshare.com/testimonials/"
                className="pl-3 text-white/90 hover:text-white/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Testimonials
              </a>
            </div>
            <div className="grid gap-2">
              <span className="text-white/80">Help</span>
              <a
                href="https://putforshare.com/help/"
                className="pl-3 text-white/90 hover:text-white/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Help
              </a>
              <a
                href="https://putforshare.com/useful-info"
                className="pl-3 text-white/90 hover:text-white/80"
                onClick={() => setMobileMenuOpen(false)}
              >
                Helpful Info
              </a>
            </div>
            <a
              href="https://dash.putforshare.com/"
              target="_blank"
              rel="noopener"
              className="hover:text-white/80"
              onClick={() => setMobileMenuOpen(false)}
            >
              Book Free Pickup
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
