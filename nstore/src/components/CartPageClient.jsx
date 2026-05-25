"use client";

import Link from "next/link";
import { useCart } from "@/components/ClientShell";

export default function CartPageClient() {
  const { cartItems, incrementQuantity, decrementQuantity, removeFromCart, handleCheckout } = useCart();
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.sale_price) * item.quantity, 0);

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>Cart</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Your cart</h1>

      {cartItems.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Your cart is empty.</p>
      ) : (
        <section className="mt-4 grid gap-4">
          {cartItems.map((item) => (
            <article
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
              key={item.uuid}
            >
              <div>
                <h2 className="text-base font-semibold text-slate-900">{item.name}</h2>
                <p className="text-sm text-slate-500">Rs {item.sale_price} each</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  onClick={() => decrementQuantity(item.uuid)}
                >
                  -
                </button>
                <span className="text-sm font-semibold">{item.quantity}</span>
                <button
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  onClick={() => incrementQuantity(item.uuid)}
                >
                  +
                </button>
                <button
                  className="inline-flex items-center justify-center text-slate-500 transition hover:text-slate-700"
                  onClick={() => removeFromCart(item.uuid)}
                  aria-label="Remove item"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M8 6V4h8v2" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round"></path>
                    <path d="M10 11v6" strokeLinecap="round"></path>
                    <path d="M14 11v6" strokeLinecap="round"></path>
                  </svg>
                </button>
              </div>
            </article>
          ))}
          <div className="text-base font-extrabold text-slate-900">Subtotal: Rs {subtotal.toFixed(2)}</div>
        </section>
      )}

      <footer className="mt-6 flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={handleCheckout}
          disabled={cartItems.length === 0}
        >
          Checkout
        </button>
        <Link className="text-sm font-semibold text-slate-500 hover:underline" href="/">
          Continue shopping
        </Link>
      </footer>
    </main>
  );
}
