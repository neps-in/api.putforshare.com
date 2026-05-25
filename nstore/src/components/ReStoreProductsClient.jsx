"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchReStoreProducts } from "@/lib/api";
import { useCart, useStorefront } from "@/components/ClientShell";
import PaginationControls from "@/components/PaginationControls";

export default function ReStoreProductsClient({ initialPageData = null, initialPage = 1 }) {
  const placeholderImage = "/assets/placeholder-product.svg";
  const router = useRouter();
  const { addToCart } = useCart();
  const { searchText } = useStorefront();
  const [page, setPage] = useState(initialPage);
  const [pageData, setPageData] = useState(initialPageData || { count: 0, next: null, previous: null, results: [] });
  const [loading, setLoading] = useState(!initialPageData);
  const [error, setError] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("featured");

  useEffect(() => {
    if (page === initialPage && initialPageData) {
      return;
    }
    setLoading(true);
    setError("");
    fetchReStoreProducts({ page, pageSize: 24 })
      .then(setPageData)
      .catch(() => setError("Could not load Re Store products"))
      .finally(() => setLoading(false));
  }, [page, initialPage, initialPageData]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = (searchText || "").trim().toLowerCase();
    let filtered = pageData.results.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.name?.toLowerCase().includes(normalizedSearch) ||
        item.short_description?.toLowerCase().includes(normalizedSearch) ||
        item.sku?.toLowerCase().includes(normalizedSearch);
      const matchesStock = !inStockOnly || Number(item.stock_quantity) > 0;
      return matchesSearch && matchesStock;
    });

    if (sortBy === "price_low") {
      filtered = [...filtered].sort((a, b) => Number(a.sale_price) - Number(b.sale_price));
    } else if (sortBy === "price_high") {
      filtered = [...filtered].sort((a, b) => Number(b.sale_price) - Number(a.sale_price));
    } else if (sortBy === "name") {
      filtered = [...filtered].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return filtered;
  }, [pageData.results, searchText, inStockOnly, sortBy]);

  const openProduct = (uuid) => {
    router.push(`/product/${uuid}`);
  };

  const onCardKeyDown = (event, uuid) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProduct(uuid);
    }
  };

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>1 Re Store</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">1 Re Store</h1>
      <p className="mt-1 text-sm text-slate-500">Only Rs 1 listings. Limited-time and dev-only.</p>

      <section className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center" aria-label="re-store product controls">
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="featured">Sort: Featured</option>
          <option value="price_low">Sort: Price low to high</option>
          <option value="price_high">Sort: Price high to low</option>
          <option value="name">Sort: Name</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(event) => setInStockOnly(event.target.checked)}
            className="h-4 w-4 accent-orange-500"
          />
          In stock only
        </label>
      </section>

      <section className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <p>
          Showing <strong>{filteredProducts.length}</strong> of <strong>{pageData.count}</strong> products
        </p>
      </section>

      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      {loading ? (
        <section className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="loading re-store products">
          {Array.from({ length: 6 }).map((_, index) => (
            <article className="min-h-[170px] animate-pulse rounded-2xl bg-slate-200" key={index} />
          ))}
        </section>
      ) : filteredProducts.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No Re Store products available right now.</p>
      ) : (
        <>
          <section className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((item) => (
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
