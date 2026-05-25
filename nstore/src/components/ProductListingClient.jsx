"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart, useStorefront } from "@/components/ClientShell";

export default function ProductListingClient({ products, loading = false, error = "" }) {
  const placeholderImage = "/assets/default-book.png";
  const router = useRouter();
  const { addToCart } = useCart();
  const { searchText } = useStorefront();
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [qualityFilter, setQualityFilter] = useState("all");

  const formatQualityLabel = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    return normalized
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatEditionLabel = (value) => {
    let normalized = String(value || "")
      .trim()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .toLowerCase();
    if (!normalized) return "";
    if (normalized.startsWith("edition ")) {
      normalized = `${normalized.replace(/^edition\s+/, "").trim()} edition`;
    }
    if (!normalized.endsWith(" edition")) {
      normalized = `${normalized} edition`;
    }
    return normalized.replace(/\bedition\b/g, "Edition");
  };

  const qualityOptions = useMemo(() => {
    const values = Array.from(new Set(products.map((item) => String(item.quality || "").trim()).filter(Boolean)));
    return values.sort((a, b) => formatQualityLabel(a).localeCompare(formatQualityLabel(b)));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = (searchText || "").trim().toLowerCase();
    let filtered = products.filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.name?.toLowerCase().includes(normalizedSearch) ||
        item.short_description?.toLowerCase().includes(normalizedSearch) ||
        item.sku?.toLowerCase().includes(normalizedSearch);
      const matchesStock = !inStockOnly || Number(item.stock_quantity) > 0;
      const matchesQuality = qualityFilter === "all" || String(item.quality || "").trim() === qualityFilter;
      return matchesSearch && matchesStock && matchesQuality;
    });

    if (sortBy === "price_low") {
      filtered = [...filtered].sort((a, b) => Number(a.sale_price) - Number(b.sale_price));
    } else if (sortBy === "price_high") {
      filtered = [...filtered].sort((a, b) => Number(b.sale_price) - Number(a.sale_price));
    } else if (sortBy === "name") {
      filtered = [...filtered].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return filtered;
  }, [products, searchText, inStockOnly, sortBy, qualityFilter]);

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
      <section className="flex flex-wrap items-center gap-3" aria-label="product controls">
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          className="w-full max-w-[220px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="featured">Sort: Featured</option>
          <option value="price_low">Sort: Price low to high</option>
          <option value="price_high">Sort: Price high to low</option>
          <option value="name">Sort: Name</option>
        </select>
        <select
          value={qualityFilter}
          onChange={(event) => setQualityFilter(event.target.value)}
          className="w-full max-w-[260px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
        >
          <option value="all">Quality: All qualities</option>
          {qualityOptions.map((qualityValue) => (
            <option key={qualityValue} value={qualityValue}>
              Quality: {formatQualityLabel(qualityValue)}
            </option>
          ))}
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
          Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
        </p>
      </section>

      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}

      {loading && (
        <section className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="loading products">
          {Array.from({ length: 6 }).map((_, index) => (
            <article className="min-h-[170px] animate-pulse rounded-2xl bg-slate-200" key={index} />
          ))}
        </section>
      )}

      {!loading && !error && (
        <section className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  {item.name}
                  {item.book_edition ? <span className="ml-1 text-slate-600">{formatEditionLabel(item.book_edition)}</span> : null}
                  {item.cover_type ? <span className="ml-1 text-slate-600">{item.cover_type}</span> : null}
                </h2>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
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
                {item.quality ? (
                  <p className="inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    Quality: {formatQualityLabel(item.quality)}
                  </p>
                ) : null}
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
      )}
    </main>
  );
}
