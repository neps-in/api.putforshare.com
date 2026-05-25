"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAuthorsWithProductCount } from "@/lib/api";
import PaginationControls from "@/components/PaginationControls";

export default function AuthorsClient({ initialPageData = null, initialPage = 1, initialError = "" }) {
  const [page, setPage] = useState(initialPage);
  const [pageData, setPageData] = useState(initialPageData || { count: 0, next: null, previous: null, results: [] });
  const [loading, setLoading] = useState(!initialPageData);
  const [error, setError] = useState(initialError || "");

  useEffect(() => {
    if (page === initialPage && initialPageData && !initialError) {
      return;
    }
    setLoading(true);
    setError("");
    fetchAuthorsWithProductCount({ page, pageSize: 12 })
      .then(setPageData)
      .catch(() => setError("Could not load authors"))
      .finally(() => setLoading(false));
  }, [page, initialPage, initialPageData, initialError]);

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>Authors</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Authors</h1>
      <p className="mt-1 text-sm text-slate-500">Explore authors and the number of books available per author.</p>
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      {loading ? (
        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="loading authors">
          {Array.from({ length: 4 }).map((_, index) => (
            <article className="min-h-[170px] animate-pulse rounded-2xl bg-slate-200" key={index} />
          ))}
        </section>
      ) : (
        <>
          <section className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <p>
              Total authors: <strong>{pageData.count}</strong>
            </p>
          </section>
          <section className="mt-4 flex flex-wrap gap-4">
            {pageData.results.map((author) => (
              <Link
                className="inline-flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                key={author.slug}
                href={`/author/${author.slug}/books`}
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                  <svg className="h-7 w-7 text-slate-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="8" r="4"></circle>
                    <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"></path>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">
                    {author.name} ({author.product_count})
                  </h2>
                </div>
              </Link>
            ))}
          </section>
          <PaginationControls pageData={pageData} currentPage={page} onPageChange={setPage} />
        </>
      )}
    </main>
  );
}
