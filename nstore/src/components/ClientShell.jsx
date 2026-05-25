"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { fetchMe } from "@/lib/api";
import { getAccessToken, getCurrentUser, logout } from "@/lib/storeAuth";

const AuthContext = createContext(null);
const CartContext = createContext(null);
const StorefrontContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside ClientShell");
  return ctx;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside ClientShell");
  return ctx;
}

export function useStorefront() {
  const ctx = useContext(StorefrontContext);
  if (!ctx) throw new Error("useStorefront must be used inside ClientShell");
  return ctx;
}

export default function ClientShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [lastOrder, setLastOrder] = useState(null);

  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const prevCartCount = useRef(cartCount);

  useEffect(() => {
    const cachedUser = getCurrentUser();
    if (cachedUser) {
      setUser(cachedUser);
    }

    if (!getAccessToken()) {
      setUser(null);
      return;
    }

    fetchMe()
      .then((resolvedUser) => {
        if (resolvedUser) setUser(resolvedUser);
      })
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setCartPulse(true);
      const timer = setTimeout(() => setCartPulse(false), 500);
      prevCartCount.current = cartCount;
      return () => clearTimeout(timer);
    }
    prevCartCount.current = cartCount;
  }, [cartCount]);

  const addToCart = (product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.uuid === product.uuid);
      if (existing) {
        const maxQty = Number(existing.stock_quantity);
        const nextQty = Math.min(existing.quantity + 1, Number.isFinite(maxQty) ? maxQty : existing.quantity + 1);
        return prev.map((item) => (item.uuid === product.uuid ? { ...item, quantity: nextQty } : item));
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const incrementQuantity = (uuid) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.uuid !== uuid) return item;
        const maxQty = Number(item.stock_quantity);
        const nextQty = Math.min(item.quantity + 1, Number.isFinite(maxQty) ? maxQty : item.quantity + 1);
        return { ...item, quantity: nextQty };
      })
    );
  };

  const decrementQuantity = (uuid) => {
    setCartItems((prev) =>
      prev
        .map((item) => (item.uuid === uuid ? { ...item, quantity: item.quantity - 1 } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (uuid) => {
    setCartItems((prev) => prev.filter((item) => item.uuid !== uuid));
  };

  const handleCheckout = () => {
    setIsCartOpen(false);
    if (!user) {
      router.push("/login");
      return;
    }
    router.push("/checkout");
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    router.push("/");
  };

  const authRoutes = ["/signup", "/login", "/forgot-password", "/reset-password"];
  const hideHeader = authRoutes.includes(pathname);
  const hideFooter = authRoutes.includes(pathname);

  const authValue = useMemo(
    () => ({ user, setUser, refreshUser: fetchMe, logout: handleLogout }),
    [user]
  );

  const cartValue = useMemo(
    () => ({
      cartItems,
      cartCount,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      incrementQuantity,
      decrementQuantity,
      removeFromCart,
      handleCheckout,
      setCartItems
    }),
    [cartItems, cartCount, isCartOpen]
  );

  const storeValue = useMemo(
    () => ({ searchText, setSearchText, lastOrder, setLastOrder, cartPulse }),
    [searchText, lastOrder, cartPulse]
  );

  return (
    <AuthContext.Provider value={authValue}>
      <CartContext.Provider value={cartValue}>
        <StorefrontContext.Provider value={storeValue}>
          {!hideHeader ? (
            <Header
              searchText={searchText}
              onSearchTextChange={setSearchText}
              cartCount={cartCount}
              onCartClick={() => setIsCartOpen(true)}
              cartPulse={cartPulse}
              user={user}
              onLogout={handleLogout}
            />
          ) : null}
          <CartDrawer
            isOpen={isCartOpen}
            cartItems={cartItems}
            onClose={() => setIsCartOpen(false)}
            onInc={incrementQuantity}
            onDec={decrementQuantity}
            onRemove={removeFromCart}
          />
          {children}
          {!hideFooter ? <Footer /> : null}
        </StorefrontContext.Provider>
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}
