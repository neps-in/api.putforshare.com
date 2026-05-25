"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createAddress, fetchAddresses, updateAddress } from "@/lib/api";
import { parseFormError } from "@/lib/forms";
import { useAuth } from "@/components/ClientShell";

const emptyForm = {
  address_name: "",
  full_name: "",
  mobile_num: "",
  pincode: "",
  building_name: "",
  company_name: "",
  area_sector: "",
  locality: "",
  landmark: "",
  town_city: "",
  state_region: "",
  address_type: "RESIDENCE",
  default_shipping_address: false,
  default_billing_address: false
};

export default function AddressesPageClient() {
  const router = useRouter();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState("new");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchAddresses()
      .then((items) => {
        setAddresses(items);
      })
      .catch(() => setError("Could not load addresses."))
      .finally(() => setLoading(false));
  }, [user, router]);

  useEffect(() => {
    if (editingId === "new") {
      setForm(emptyForm);
      return;
    }
    const existing = addresses.find((addr) => addr.uuid === editingId);
    if (existing) {
      setForm({
        address_name: existing.address_name || "",
        full_name: existing.full_name || "",
        mobile_num: existing.mobile_num || "",
        pincode: existing.pincode || "",
        building_name: existing.building_name || "",
        company_name: existing.company_name || "",
        area_sector: existing.area_sector || "",
        locality: existing.locality || "",
        landmark: existing.landmark || "",
        town_city: existing.town_city || "",
        state_region: existing.state_region || "",
        address_type: existing.address_type || "RESIDENCE",
        default_shipping_address: Boolean(existing.default_shipping_address),
        default_billing_address: Boolean(existing.default_billing_address)
      });
    }
  }, [editingId, addresses]);

  const onChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const reload = async () => {
    const items = await fetchAddresses();
    setAddresses(items);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setFieldErrors({});

    try {
      if (editingId === "new") {
        await createAddress(form);
        setMessage("Address added.");
      } else {
        await updateAddress(editingId, form);
        setMessage("Address updated.");
      }
      await reload();
      setEditingId("new");
    } catch (err) {
      const parsedError = parseFormError(err, "Unable to save address");
      setError(parsedError.detail);
      setFieldErrors(parsedError.fieldErrors);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-300";

  return (
    <main className="w-full px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link className="font-semibold text-orange-700 hover:text-orange-800" href="/">
          Home
        </Link>
        <span>/</span>
        <span>My Address</span>
      </nav>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">My Address</h1>
      {loading ? <p className="mt-2 text-sm text-slate-500">Loading addresses...</p> : null}
      {error ? <p className="mt-2 text-sm font-semibold text-red-600">{error}</p> : null}
      {message ? <p className="mt-2 text-sm font-semibold text-emerald-600">{message}</p> : null}
      {!loading && addresses.length === 0 ? <p className="mt-4 text-sm text-slate-500">No addresses saved.</p> : null}

      {addresses.length > 0 ? (
        <section className="mt-4 grid gap-4 md:grid-cols-2">
          {addresses.map((item) => (
            <article className="grid gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" key={item.uuid}>
              <p className="text-sm font-semibold text-orange-800">{item.address_name || "Address"}</p>
              <p className="text-sm font-semibold text-slate-900">{item.full_name || "-"}</p>
              <p className="text-sm text-slate-600">
                {[item.address_name, item.building_name, item.company_name, item.area_sector, item.locality]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="text-sm text-slate-600">
                {[item.landmark, item.town_city, item.state_region, item.pincode].filter(Boolean).join(", ")}
              </p>
              {item.mobile_num ? <p className="text-sm text-slate-600">Phone: {item.mobile_num}</p> : null}
              <button
                className="mt-2 inline-flex w-fit items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                type="button"
                onClick={() => setEditingId(item.uuid)}
              >
                Edit
              </button>
            </article>
          ))}
        </section>
      ) : null}

      <section className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{editingId === "new" ? "Add Address" : "Edit Address"}</h2>
        <form className="grid gap-3" onSubmit={onSubmit}>
          <input name="address_name" placeholder="Address name" value={form.address_name} onChange={onChange} required className={inputClass} />
          <input name="full_name" placeholder="Full name" value={form.full_name} onChange={onChange} required className={inputClass} />
          <input name="mobile_num" placeholder="Mobile" value={form.mobile_num} onChange={onChange} className={inputClass} />
          <input name="pincode" placeholder="Pincode" value={form.pincode} onChange={onChange} required className={inputClass} />
          <input name="building_name" placeholder="Building name" value={form.building_name} onChange={onChange} className={inputClass} />
          <input name="company_name" placeholder="Company name" value={form.company_name} onChange={onChange} className={inputClass} />
          <input name="area_sector" placeholder="Area / Sector" value={form.area_sector} onChange={onChange} className={inputClass} />
          <input name="locality" placeholder="Locality" value={form.locality} onChange={onChange} className={inputClass} />
          <input name="landmark" placeholder="Landmark" value={form.landmark} onChange={onChange} className={inputClass} />
          <input name="town_city" placeholder="Town / City" value={form.town_city} onChange={onChange} className={inputClass} />
          <input name="state_region" placeholder="State / Region" value={form.state_region} onChange={onChange} className={inputClass} />
          <select name="address_type" value={form.address_type} onChange={onChange} className={inputClass}>
            <option value="RESIDENCE">Residence</option>
            <option value="OFFICE">Office</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="default_shipping_address"
              checked={form.default_shipping_address}
              onChange={onChange}
              className="h-4 w-4 accent-orange-500"
            />
            <span>Default shipping address</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="default_billing_address"
              checked={form.default_billing_address}
              onChange={onChange}
              className="h-4 w-4 accent-orange-500"
            />
            <span>Default billing address</span>
          </label>
          {Object.keys(fieldErrors || {}).length > 0 ? (
            <p className="text-sm font-semibold text-red-600">Please check required fields.</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
              type="submit"
            >
              {editingId === "new" ? "Add Address" : "Save Changes"}
            </button>
            {editingId !== "new" ? (
              <button
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                type="button"
                onClick={() => setEditingId("new")}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  );
}
