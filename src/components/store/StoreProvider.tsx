"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Pi 결제는 상품(옵션 조합) 1개 단위라 장바구니에도 수량 없이 담는다. */
export type CartItem = { listingId: string; option?: Record<string, string>; addedAt: number };

export const cartKey = (c: { listingId: string; option?: Record<string, string> }) =>
  `${c.listingId}|${Object.entries(c.option ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&")}`;

type Store = {
  wishlist: string[];
  cart: CartItem[];
  cartLoaded: boolean;
  /** 이미 담긴 상품(같은 옵션)이면 false */
  addToCart: (listingId: string, option?: Record<string, string>) => boolean;
  removeFromCart: (listingId: string, option?: Record<string, string>) => void;
  isWished: (id: string) => boolean;
  toggleWish: (id: string) => void;
  showToast: (message: string) => void;
};

const StoreContext = createContext<Store | null>(null);

const STORAGE_KEY = "baroonda-wishlist-v2";
const CART_KEY = "baroonda-cart-v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setWishlist(JSON.parse(raw) as string[]);
      const rawCart = localStorage.getItem(CART_KEY);
      if (rawCart) setCart((JSON.parse(rawCart) as CartItem[]).filter((c) => typeof c?.listingId === "string"));
    } catch {
      // ignore corrupted storage
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // storage unavailable
    }
  }, [loaded, wishlist, cart]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

  const store = useMemo<Store>(
    () => ({
      wishlist,
      isWished: (id) => wishlist.includes(id),
      toggleWish: (id) => setWishlist((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur])),
      cart,
      cartLoaded: loaded,
      addToCart: (listingId, option) => {
        const key = cartKey({ listingId, option });
        if (cart.some((c) => cartKey(c) === key)) return false;
        setCart((cur) => [{ listingId, option, addedAt: Date.now() }, ...cur.filter((c) => cartKey(c) !== key)]);
        return true;
      },
      removeFromCart: (listingId, option) => {
        const key = cartKey({ listingId, option });
        setCart((cur) => cur.filter((c) => cartKey(c) !== key));
      },
      showToast,
    }),
    [wishlist, cart, loaded, showToast],
  );

  return (
    <StoreContext.Provider value={store}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-36 z-50 mx-auto w-fit max-w-[90%] animate-fade-in rounded-full bg-gray-900/90 px-4 py-2 text-center text-sm font-medium text-white"
        >
          {toast.message}
        </div>
      )}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
