import Link from "next/link";
import { fetchProductsBySeller } from "@/lib/serverApi";

function normalizePage(value) {
  const parsed = Number.parseInt(String(value || "1"), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export default async function SellerProductsPage({ params, searchParams }) {
  const { uuid } = params;
  const page = normalizePage(searchParams?.page);

  let pageData = { count: 0, next: null, previous: null, results: [] };
  try {
    pageData = await fetchProductsBySeller(uuid, { page, pageSize: 24 });
  } catch {
    pageData = { count: 0, next: null, previous: null, results: [] };
  }

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>Seller</span>
      </nav>

      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Seller Products</h1>
      <p className="mt-1 text-sm text-slate-500">Seller ID: {uuid}</p>
      <p className="mt-2 text-sm text-slate-600">
        Total products: <strong>{pageData.count}</strong>
      </p>

      <section className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pageData.results.map((item) => (
          <Link
            className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            key={item.uuid}
            href={`/product/${item.uuid}`}
          >
            <p className="inline-flex w-fit rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-700">{item.sku}</p>
            <h2 className="mt-2 text-base font-semibold text-slate-900">{item.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{item.short_description || "No description available."}</p>
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-base font-semibold text-orange-800">Rs {item.sale_price}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  Number(item.stock_quantity) > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                }`}
              >
                {Number(item.stock_quantity) > 0 ? "In stock" : "Out of stock"}
              </span>
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-6 flex items-center gap-3">
        {page > 1 ? (
          <Link className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={`/seller/${uuid}/products?page=${page - 1}`}>
            Previous
          </Link>
        ) : null}
        {pageData.next ? (
          <Link className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={`/seller/${uuid}/products?page=${page + 1}`}>
            Next
          </Link>
        ) : null}
      </section>
    </main>
  );
}
