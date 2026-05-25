"use client";

import Link from "next/link";
import { useCart } from "@/components/ClientShell";

export default function ProductDetailClient({ product, loading = false, error = "" }) {
  const { addToCart } = useCart();
  const placeholderImage = "/assets/default-book.png";

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>Product Details</span>
      </nav>
      {loading && <article className="mt-4 min-h-[230px] animate-pulse rounded-2xl bg-slate-200" />}
      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      {!loading && !error && product && (
        <>
          <article className="mt-4 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[30%_70%]">
            <div>
              <img
                className="h-64 w-full rounded-xl border border-slate-200 bg-white object-contain"
                src={placeholderImage}
                alt={product.name || "Product placeholder"}
              />
            </div>
            <div className="space-y-4">
              <p className="inline-flex w-fit rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">
                {product.sku}
              </p>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold text-slate-900">
                  {product.name}{" "}
                  {product.product_type === "BOOK" && product.book_details ? (
                    <span className="text-slate-600">
                      {product.book_details.book_edition ? ` ${product.book_details.book_edition}` : ""}{" "}
                      {product.book_details.cover_type ? `${product.book_details.cover_type}` : ""}
                    </span>
                  ) : null}
                </h1>
                {product.product_type === "BOOK" && product.book_details ? (
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>
                      by{" "}
                      {Array.isArray(product.book_details.authors) && product.book_details.authors.length > 0
                        ? product.book_details.authors.map((author, index) => (
                            <span key={author.uuid || author.slug || author.name}>
                              {author.slug ? (
                                <Link className="font-semibold text-orange-700 hover:text-orange-800" href={`/author/${author.slug}/books`}>
                                  {author.name}
                                </Link>
                              ) : (
                                author.name
                              )}
                              {index < product.book_details.authors.length - 1 ? ", " : ""}
                            </span>
                          ))
                        : "-"}
                    </p>
                    {product.book_details.publisher ? (
                      <div className="flex items-center gap-2">
                        {product.book_details.publisher.brand_image ? (
                          <img
                            src={product.book_details.publisher.brand_image}
                            alt={product.book_details.publisher.name || "Publisher"}
                            className="h-6 w-6 rounded-full border border-slate-200 object-contain"
                          />
                        ) : null}
                        <span>
                          Published by{" "}
                          {product.book_details.publisher?.slug ? (
                            <Link
                              className="font-semibold text-orange-700 hover:text-orange-800"
                              href={`/publisher/${product.book_details.publisher.slug}/books`}
                            >
                              {product.book_details.publisher.name}
                            </Link>
                          ) : (
                            product.book_details.publisher?.name || "-"
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {product.category ? (
                <p className="text-sm text-slate-600">
                  Category:{" "}
                  <Link className="font-semibold text-orange-700 hover:text-orange-800" href={`/category/${product.category.uuid}/products`}>
                    {product.category.name}
                  </Link>
                </p>
              ) : null}
              {Array.isArray(product.tag_details) && product.tag_details.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {product.tag_details.map((tag) => (
                    <Link
                      className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                      key={tag.slug}
                      href={`/tag/${tag.slug}/products`}
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-4">
                <p className="text-lg font-semibold text-red-600">Rs. {product.sale_price}</p>
                <button
                  className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => addToCart(product)}
                  disabled={Number(product.stock_quantity) <= 0}
                >
                  Add to cart
                </button>
              </div>
              {product.product_type === "BOOK" && product.book_details ? (
                <section className="pt-2">
                  <hr className="border-slate-200" />
                  <h2 className="mt-4 text-lg font-semibold text-slate-900">Book Details</h2>
                  <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm md:grid-cols-[160px_1fr]">
                    <dt className="font-semibold text-slate-500">ISBN-10</dt>
                    <dd className="text-slate-700">{product.book_details.isbn_10 || "-"}</dd>
                    <dt className="font-semibold text-slate-500">ISBN-13</dt>
                    <dd className="text-slate-700">{product.book_details.isbn_13 || "-"}</dd>
                    <dt className="font-semibold text-slate-500">Language</dt>
                    <dd className="text-slate-700">{product.book_details.book_language || "-"}</dd>
                    <dt className="font-semibold text-slate-500">Edition</dt>
                    <dd className="text-slate-700">{product.book_details.book_edition || "-"}</dd>
                    <dt className="font-semibold text-slate-500">Cover</dt>
                    <dd className="text-slate-700">{product.book_details.cover_type || "-"}</dd>
                    <dt className="font-semibold text-slate-500">Pages</dt>
                    <dd className="text-slate-700">{product.book_details.page_count || "-"}</dd>
                    <dt className="font-semibold text-slate-500">Published Year</dt>
                    <dd className="text-slate-700">{product.book_details.published_year || "-"}</dd>
                  </dl>
                </section>
              ) : null}
            </div>
          </article>
          <div className="mt-4 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
            >
              Continue Shopping
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
