"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { checkoutInitiate, checkoutPreview, fetchAddresses } from "@/lib/api";
import { authClient } from "@/lib/storeAuth";
import { parseFormError } from "@/lib/forms";
import { useAuth, useCart, useStorefront } from "@/components/ClientShell";

export default function CheckoutPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { cartItems, setCartItems } = useCart();
  const { setLastOrder } = useStorefront();
  const [addresses, setAddresses] = useState([]);
  const [addressUuid, setAddressUuid] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [summary, setSummary] = useState({ subtotal: 0, discount: 0, total: 0 });
  const [razorpayReady, setRazorpayReady] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchAddresses()
      .then((items) => {
        setAddresses(items);
        const defaultAddress = items.find((item) => item.default_shipping_address) || items[0];
        if (defaultAddress) {
          setAddressUuid(defaultAddress.uuid);
          setSelectedAddress(defaultAddress);
        }
      })
      .catch(() => setError("Could not load addresses."))
      .finally(() => setLoading(false));
  }, [user, router]);

  useEffect(() => {
    if (!addressUuid || cartItems.length === 0) {
      return;
    }
    const match = addresses.find((item) => item.uuid === addressUuid) || null;
    setSelectedAddress(match);
    checkoutPreview({
      address_uuid: addressUuid,
      items: cartItems.map((item) => ({ product_uuid: item.uuid, quantity: item.quantity }))
    })
      .then((data) => {
        setSummary({
          subtotal: Number(data?.subtotal || 0),
          discount: Number(data?.discount || 0),
          total: Number(data?.total || 0)
        });
      })
      .catch(() => {
        setSummary({ subtotal: 0, discount: 0, total: 0 });
      });
  }, [addressUuid, cartItems, addresses]);

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

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.sale_price) * item.quantity, 0),
    [cartItems]
  );

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setPlacingOrder(true);

    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      setPlacingOrder(false);
      return;
    }
    if (!addressUuid) {
      setError("Please select a shipping address.");
      setPlacingOrder(false);
      return;
    }

    try {
      const payload = await checkoutInitiate({
        address_uuid: addressUuid,
        gateway: "razorpay",
        items: cartItems.map((item) => ({ product_uuid: item.uuid, quantity: item.quantity }))
      });
      const order = payload?.order;
      const payment = payload?.payment;
      if (!order || !payment) {
        throw new Error("Missing payment details.");
      }
      if (!window.Razorpay || !razorpayReady) {
        throw new Error("Razorpay SDK not loaded.");
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
            setLastOrder(order);
            setCartItems([]);
            router.push("/order-success");
          } catch (verifyErr) {
            const parsedError = parseFormError(verifyErr, "Payment verification failed");
            setError(parsedError.detail);
          } finally {
            setPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPlacingOrder(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      const parsedError = parseFormError(err, "Checkout failed");
      setError(parsedError.detail);
      setPlacingOrder(false);
    }
  };

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>Checkout</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Checkout</h1>
      {loading ? <p className="mt-2 text-sm text-slate-500">Loading addresses...</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      <form className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]" onSubmit={onSubmit}>
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Shipping Address</h2>
          {addresses.length === 0 && !loading ? <p className="text-sm text-slate-500">No address saved.</p> : null}
          {addresses.length > 0 ? (
            <select
              value={addressUuid}
              onChange={(event) => setAddressUuid(event.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              {addresses.map((item) => (
                <option key={item.uuid} value={item.uuid}>
                  {[
                    item.full_name,
                    item.address_name,
                    item.building_name,
                    item.company_name,
                    item.area_sector,
                    item.locality,
                    item.landmark ? `Landmark: ${item.landmark}` : "",
                    item.town_city,
                    item.state_region,
                    item.pincode
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </option>
              ))}
            </select>
          ) : null}
          {selectedAddress ? (
            <div className="grid gap-1 rounded-xl border border-dashed border-orange-200 bg-orange-50 p-3 text-sm text-slate-600">
              <p className="text-sm font-semibold text-slate-900">{selectedAddress.full_name || "Shipping Address"}</p>
              <p>
                {[
                  selectedAddress.address_name,
                  selectedAddress.building_name,
                  selectedAddress.company_name,
                  selectedAddress.area_sector,
                  selectedAddress.locality
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p>
                {[selectedAddress.landmark, selectedAddress.town_city, selectedAddress.state_region, selectedAddress.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {selectedAddress.mobile_num ? <p>Phone: {selectedAddress.mobile_num}</p> : null}
            </div>
          ) : null}
        </section>
        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Order Summary</h2>
          <div className="grid gap-2">
            {cartItems.map((item) => (
              <div className="flex items-center justify-between text-sm text-slate-600" key={item.uuid}>
                <span>
                  {item.name} × {item.quantity}
                </span>
                <strong className="text-slate-900">Rs {(Number(item.sale_price) * item.quantity).toFixed(2)}</strong>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3 text-sm font-semibold text-slate-700">
            <span>Subtotal</span>
            <strong className="text-slate-900">Rs {(summary.subtotal || subtotal).toFixed(2)}</strong>
          </div>
          {summary.discount ? (
            <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
              <span>Discount</span>
              <strong className="text-slate-900">- Rs {summary.discount.toFixed(2)}</strong>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3 text-sm font-semibold text-slate-700">
            <span>Total</span>
            <strong className="text-slate-900">Rs {(summary.total || subtotal).toFixed(2)}</strong>
          </div>
          <button
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={cartItems.length === 0 || loading || placingOrder || !razorpayReady}
          >
            Pay & Place Order
          </button>
        </section>
      </form>
    </main>
  );
}
