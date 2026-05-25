"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPublishersWithProductCount } from "@/lib/api";
import PaginationControls from "@/components/PaginationControls";

export default function PublishersClient({ initialPageData = null, initialPage = 1, initialError = "" }) {
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
    fetchPublishersWithProductCount({ page, pageSize: 12 })
      .then(setPageData)
      .catch(() => setError("Could not load publishers"))
      .finally(() => setLoading(false));
  }, [page, initialPage, initialPageData, initialError]);

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>Publishers</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Publishers</h1>
      <p className="mt-1 text-sm text-slate-500">Explore publishers and the number of books available per publisher.</p>
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      {loading ? (
        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="loading publishers">
          {Array.from({ length: 4 }).map((_, index) => (
            <article className="min-h-[170px] animate-pulse rounded-2xl bg-slate-200" key={index} />
          ))}
        </section>
      ) : (
        <>
          <section className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <p>
              Total publishers: <strong>{pageData.count}</strong>
            </p>
          </section>
          <section className="mt-4 flex flex-wrap gap-4">
            {pageData.results.map((publisher) => (
              <Link
                className="inline-flex w-fit items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                key={publisher.slug}
                href={`/publisher/${publisher.slug}/books`}
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
                  <img src={publisher.brand_image || "/assets/pfs-logo.svg"} alt={publisher.name || "Publisher"} className="h-8 w-8 object-contain" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900">
                    {publisher.name} ({publisher.product_count})
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
