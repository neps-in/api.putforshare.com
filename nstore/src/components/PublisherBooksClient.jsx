"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchProductsByPublisher } from "@/lib/api";
import { useCart } from "@/components/ClientShell";
import PaginationControls from "@/components/PaginationControls";

export default function PublisherBooksClient({ initialSlug, initialPageData = null, initialPage = 1 }) {
  const placeholderImage = "/assets/placeholder-product.svg";
  const router = useRouter();
  const { addToCart } = useCart();
  const publisherSlug = initialSlug || "";
  const [page, setPage] = useState(initialPage);
  const [pageData, setPageData] = useState(initialPageData || { count: 0, next: null, previous: null, results: [] });
  const [loading, setLoading] = useState(!initialPageData);
  const [error, setError] = useState("");

  useEffect(() => {
    if (page === initialPage && initialPageData) {
      return;
    }
    setLoading(true);
    setError("");
    fetchProductsByPublisher(publisherSlug, { page, pageSize: 24 })
      .then(setPageData)
      .catch(() => setError("Could not load publisher books"))
      .finally(() => setLoading(false));
  }, [page, initialPage, initialPageData, publisherSlug]);

  const openProduct = (uuid) => {
    router.push(`/product/${uuid}`);
  };

  const onCardKeyDown = (event, uuid) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProduct(uuid);
    }
  };

  const items = useMemo(() => pageData.results || [], [pageData.results]);

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/publishers">
          Publishers
        </Link>
        <span>/</span>
        <span>{publisherSlug}</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold capitalize text-slate-900">{publisherSlug}</h1>
      <p className="mt-1 text-sm text-slate-500">Books available from this publisher.</p>
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      {loading ? (
        <section className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="loading publisher books">
          {Array.from({ length: 6 }).map((_, index) => (
            <article className="min-h-[170px] animate-pulse rounded-2xl bg-slate-200" key={index} />
          ))}
        </section>
      ) : (
        <>
          <section className="mt-3 flex items-center justify-between text-sm text-slate-600">
            <p>
              Total books: <strong>{pageData.count}</strong>
            </p>
          </section>
          <section className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article
                className="flex h-full cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                key={item.uuid}
                role="link"
                tabIndex={0}
                onClick={() => openProduct(item.uuid)}
                onKeyDown={(event) => onCardKeyDown(event, item.uuid)}
              >
                <img
                  className="h-40 w-full rounded-xl border border-slate-200 bg-white object-contain"
                  src={placeholderImage}
                  alt={item.name || "Product placeholder"}
                />
                <p className="mt-3 inline-flex w-fit rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                  {item.sku}
                </p>
                <h2 className="mt-2 text-base font-semibold text-slate-900">{item.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{item.short_description || "No description available."}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-base font-semibold text-orange-800">Rs {item.sale_price}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      Number(item.stock_quantity) > 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {Number(item.stock_quantity) > 0 ? "In stock" : "Out of stock"}
                  </span>
                </div>
                <button
                  className="mt-3 inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={(event) => {
                    event.stopPropagation();
                    addToCart(item);
                  }}
                  disabled={Number(item.stock_quantity) <= 0}
                >
                  Add to cart
                </button>
              </article>
            ))}
          </section>
          <PaginationControls pageData={pageData} currentPage={page} onPageChange={setPage} />
        </>
      )}
    </main>
  );
}
