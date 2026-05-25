"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCategoriesWithProductCount } from "@/lib/api";
import PaginationControls from "@/components/PaginationControls";

export default function CategoriesClient({ initialPageData = null, initialPage = 1, initialError = "" }) {
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
    fetchCategoriesWithProductCount({ page, pageSize: 12 })
      .then(setPageData)
      .catch(() => setError("Could not load categories"))
      .finally(() => setLoading(false));
  }, [page, initialPage, initialPageData, initialError]);

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>Categories</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Categories</h1>
      <p className="mt-1 text-sm text-slate-500">Browse categories and jump to products in each category.</p>
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      {loading ? (
        <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="loading categories">
          {Array.from({ length: 4 }).map((_, index) => (
            <article className="min-h-[170px] animate-pulse rounded-2xl bg-slate-200" key={index} />
          ))}
        </section>
      ) : (
        <>
          <section className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <p>
              Total categories: <strong>{pageData.count}</strong>
            </p>
          </section>
          <section className="mt-4 flex flex-wrap gap-4">
            {pageData.results.map((category) => (
              <Link
                className="inline-flex w-fit flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                key={category.uuid}
                href={`/category/${category.uuid}/products`}
              >
                <h2 className="text-base font-semibold text-slate-900">
                  {category.name} ({category.product_count})
                </h2>
              </Link>
            ))}
          </section>
          <PaginationControls pageData={pageData} currentPage={page} onPageChange={setPage} />
        </>
      )}
    </main>
  );
}
