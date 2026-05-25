"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTagsWithProductCount } from "@/lib/api";
import PaginationControls from "@/components/PaginationControls";

export default function TagsClient({ initialPageData = null, initialPage = 1, initialError = "" }) {
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
    fetchTagsWithProductCount({ page, pageSize: 12 })
      .then(setPageData)
      .catch(() => setError("Could not load tags"))
      .finally(() => setLoading(false));
  }, [page, initialPage, initialPageData, initialError]);

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>Tags</span>
      </nav>
      <h1 className="mt-3 inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <svg className="h-5 w-5 text-[#f81284]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 10l-8.5-8.5H4v7.5L12.5 17 20 10z" strokeLinecap="round" strokeLinejoin="round"></path>
          <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor"></circle>
        </svg>
        Tags
      </h1>
      <p className="mt-1 text-sm text-slate-500">Explore product tags and see products mapped to each tag.</p>
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      {loading ? (
        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="loading tags">
          {Array.from({ length: 4 }).map((_, index) => (
            <article className="min-h-[170px] animate-pulse rounded-2xl bg-slate-200" key={index} />
          ))}
        </section>
      ) : (
        <>
          <section className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <p>
              Total tags: <strong>{pageData.count}</strong>
            </p>
          </section>
          <section className="mt-4 flex flex-wrap gap-4">
            {pageData.results.map((tag) => (
              <Link
                className="inline-flex w-fit flex-col rounded-full border px-4 py-2 text-sm font-semibold transition hover:shadow-sm"
                href={`/tag/${tag.slug}/products`}
                key={tag.slug}
                style={{
                  background: "var(--pfs-chip-bg)",
                  borderColor: "var(--pfs-chip-border)",
                  color: "var(--pfs-chip-text)"
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "var(--pfs-chip-bg-hover)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "var(--pfs-chip-bg)";
                }}
              >
                <span>
                  {tag.name} ({tag.product_count})
                </span>
              </Link>
            ))}
          </section>
          <PaginationControls pageData={pageData} currentPage={page} onPageChange={setPage} />
        </>
      )}
    </main>
  );
}
