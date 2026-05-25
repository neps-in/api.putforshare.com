"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useStorefront } from "@/components/ClientShell";

export default function OrderSuccessClient() {
  const { lastOrder } = useStorefront();

  useEffect(() => {
    if (!lastOrder) return;
  }, [lastOrder]);

  if (!lastOrder) {
    return (
      <main className="w-full px-4 py-8">
        <p className="text-sm text-slate-500">No recent order found.</p>
        <Link className="mt-3 inline-flex items-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white" href="/">
          Back to store
        </Link>
      </main>
    );
  }

  const { uuid, items = [], total_payable } = lastOrder;

  return (
    <main className="w-full px-4 py-8">
      <div className="grid w-full gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Order confirmed</h1>
        <p className="text-sm text-slate-500">Your order is confirmed and being processed.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3 text-left">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order ID</span>
            <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{uuid}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 text-left">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total</span>
            <p className="mt-1 text-sm font-semibold text-slate-900">Rs {Number(total_payable || 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="min-w-[480px]">
            <div className="grid grid-cols-[1.4fr_80px_110px] gap-3 bg-orange-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
              <span>Item</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Amount</span>
            </div>
            {items.map((item) => (
              <div className="grid grid-cols-[1.4fr_80px_110px] gap-3 border-t border-slate-200 px-3 py-2 text-sm text-slate-700" key={item.uuid}>
                <span>{item.product_name}</span>
                <span className="text-right">{item.quantity}</span>
                <span className="text-right">Rs {Number(item.line_total || 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
        <Link className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-700" href="/">
          Back to store
        </Link>
      </div>
    </main>
  );
}
