"use client";

import Link from "next/link";
import { useMemo } from "react";

export default function CartDrawer({ isOpen, cartItems, onClose, onInc, onDec, onRemove }) {
  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.sale_price) * item.quantity, 0),
    [cartItems]
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-slate-900/40 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-[60] flex h-full w-[min(380px,92vw)] flex-col bg-white shadow-2xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 pb-2 pt-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700">Cart</p>
            <h2 className="text-lg font-semibold">Your picks</h2>
          </div>
          <button type="button" className="text-lg text-orange-700" onClick={onClose} aria-label="Close cart">
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cartItems.length === 0 ? <p className="text-sm text-slate-500">Your cart is empty.</p> : null}
          {cartItems.length > 0 && (
            <div className="grid gap-3">
              {cartItems.map((item) => (
                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3" key={item.uuid}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">Rs {item.sale_price} each</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-600 hover:bg-red-50"
                      onClick={() => onRemove(item.uuid)}
                      aria-label={`Remove ${item.name}`}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
                        <path
                          d="M4 7h16M9 7V5h6v2m-8 0l1 12h8l1-12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-700 font-bold disabled:opacity-50"
                      onClick={() => onDec(item.uuid)}
                      aria-label="Decrease"
                      disabled={item.quantity <= 1}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      value={item.quantity}
                      readOnly
                      aria-label="Quantity"
                      className="h-8 w-12 rounded-lg border border-slate-200 bg-white text-center text-sm font-semibold"
                    />
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-700 font-bold disabled:opacity-50"
                      onClick={() => onInc(item.uuid)}
                      aria-label="Increase"
                      disabled={item.quantity >= Number(item.stock_quantity)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {cartItems.length > 0 && (
          <footer className="grid gap-3 border-t border-slate-200 px-4 pb-4 pt-3">
            <div className="text-base font-extrabold text-slate-900">Subtotal: Rs {subtotal.toFixed(2)}</div>
            <Link
              className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
              href="/cart"
              onClick={onClose}
            >
              View cart
            </Link>
          </footer>
        )}
      </aside>
    </>
  );
}
