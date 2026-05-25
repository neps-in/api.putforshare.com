"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMyOrders, initiatePayment, fetchProductByUuid } from "@/lib/api";
import { authClient } from "@/lib/storeAuth";
import { parseFormError } from "@/lib/forms";
import { useAuth, useCart } from "@/components/ClientShell";

const placeholderImage = "/assets/placeholder-product.svg";

export default function OrdersPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { setCartItems } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);

  const formatPlacedOn = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchMyOrders()
      .then(setOrders)
      .catch(() => setError("Could not load orders."))
      .finally(() => setLoading(false));
  }, [user, router]);

  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    script.onerror = () => setRazorpayReady(false);
    document.body.appendChild(script);
  }, []);

  const handleRetryPayment = async (order) => {
    setError("");
    try {
      const payload = await initiatePayment({ order_uuid: order.uuid, gateway: "razorpay" });
      const payment = payload?.payment;
      if (!payment || !window.Razorpay || !razorpayReady) {
        throw new Error("Razorpay SDK not ready.");
      }

      const options = {
        key: payment.key_id || "",
        amount: Number(payment.amount) * 100,
        currency: payment.currency || "INR",
        name: "Put For Share",
        description: "Order payment",
        order_id: payment.gateway_order_id,
        handler: async (response) => {
          try {
            await authClient.authFetch("payment/verify/", {
              method: "POST",
              body: {
                order_uuid: order.uuid,
                gateway: "razorpay",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature
              }
            });
            const refreshed = await fetchMyOrders();
            setOrders(refreshed);
          } catch (verifyErr) {
            const parsedError = parseFormError(verifyErr, "Payment verification failed");
            setError(parsedError.detail);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      const parsedError = parseFormError(err, "Unable to initiate payment");
      setError(parsedError.detail);
    }
  };

  const handleReorder = async (order) => {
    const items = Array.isArray(order?.items) ? order.items : [];
    if (items.length === 0) return;
    try {
      const products = await Promise.all(items.map((item) => fetchProductByUuid(item.product_uuid).catch(() => null)));
      const nextCart = items
        .map((item, index) => {
          const product = products[index];
          if (!product) return null;
          return { ...product, quantity: item.quantity };
        })
        .filter(Boolean);
      setCartItems(nextCart);
      router.push("/cart");
    } catch {
      router.push("/cart");
    }
  };

  const statusClass = (status) => {
    const key = String(status || "").toLowerCase();
    const map = {
      pending_payment: "bg-amber-100 text-amber-700",
      payment_pending: "bg-amber-100 text-amber-700",
      pending: "bg-amber-100 text-amber-700",
      paid: "bg-emerald-100 text-emerald-700",
      captured: "bg-emerald-100 text-emerald-700",
      failed: "bg-red-100 text-red-700",
      payment_failed: "bg-red-100 text-red-700",
      cancelled: "bg-red-100 text-red-700",
      refunded: "bg-indigo-100 text-indigo-700",
      shipped: "bg-sky-100 text-sky-700",
      delivered: "bg-sky-100 text-sky-700"
    };
    return map[key] || "bg-slate-100 text-slate-700";
  };

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>My Orders</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">My Orders</h1>
      {loading ? <p className="mt-2 text-sm text-slate-500">Loading orders...</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      {!loading && orders.length === 0 ? <p className="mt-4 text-sm text-slate-500">No orders yet.</p> : null}
      {orders.length > 0 ? (
        <section className="mt-4 grid gap-4">
          {orders.map((order) => (
            <article className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={order.uuid}>
              <div className="grid gap-3 md:grid-cols-[1fr_180px_200px_1fr_160px] md:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order ID</p>
                  <p className="mt-1 break-all text-sm font-semibold text-slate-900">{order.uuid}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    Rs {Number(order.total_payable || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Placed</p>
                  <p className="mt-1 text-sm text-slate-700">{formatPlacedOn(order.placed_on || order.created_on)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {order.status === "PENDING_PAYMENT" ? (
                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                      type="button"
                      onClick={() => handleRetryPayment(order)}
                    >
                      Make Payment
                    </button>
                  ) : null}
                  {order.status === "PAYMENT_FAILED" ? (
                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                      type="button"
                      onClick={() => handleRetryPayment(order)}
                    >
                      Retry Payment
                    </button>
                  ) : null}
                  {order.status === "CANCELLED" ? (
                    <button
                      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                      type="button"
                      onClick={() => handleReorder(order)}
                    >
                      Re-order
                    </button>
                  ) : null}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                  <p
                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusClass(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Items</p>
                {Array.isArray(order.items) && order.items.length > 0 ? (
                  <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                    <div className="min-w-[520px]">
                      <div className="grid grid-cols-[1.4fr_80px_100px_110px] gap-3 bg-orange-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
                        <span>Item</span>
                        <span className="text-right">Qty</span>
                        <span className="text-right">Rate</span>
                        <span className="text-right">Amount</span>
                      </div>
                      {order.items.map((item) => (
                        <div
                          className="grid grid-cols-[1.4fr_80px_100px_110px] gap-3 border-t border-slate-200 px-3 py-2 text-sm text-slate-700"
                          key={item.uuid}
                        >
                          <span className="inline-flex items-center gap-2">
                            <img
                              src={item.product_image_url || placeholderImage}
                              alt={item.product_name}
                              className="h-9 w-9 rounded-lg border border-slate-200 object-cover"
                            />
                            {item.product_name}
                          </span>
                          <span className="text-right">{item.quantity}</span>
                          <span className="text-right">Rs {Number(item.unit_price || 0).toFixed(2)}</span>
                          <span className="text-right">
                            Rs {Number(item.line_total || Number(item.unit_price || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No items.</p>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
