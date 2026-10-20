"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { p2pListings, type P2PListing } from "@/data/p2p";

type Store = {
  listings: P2PListing[];
  addListing: (listing: P2PListing) => void;
  wishlist: string[];
  isWished: (id: string) => boolean;
  toggleWish: (id: string) => void;
  cart: Record<string, number>;
  cartCount: number;
  addToCart: (id: string, qty?: number) => void;
  setCartQty: (id: string, qty: number) => void;
  showToast: (message: string) => void;
};

const StoreContext = createContext<Store | null>(null);

const STORAGE_KEY = "baroonda-store-v1";

type Persisted = { myListings: P2PListing[]; wishlist: string[]; cart: Record<string, number> };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [myListings, setMyListings] = useState<P2PListing[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as Partial<Persisted>;
        setMyListings(data.myListings ?? []);
        setWishlist(data.wishlist ?? []);
        setCart(data.cart ?? {});
      }
    } catch {
      // ignore corrupted storage
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const data: Persisted = {
      myListings: myListings.map((l) => (l.imageUrl?.startsWith("blob:") ? { ...l, imageUrl: undefined } : l)),
      wishlist,
      cart,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage full or unavailable
    }
  }, [loaded, myListings, wishlist, cart]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = useCallback((message: string) => setToast({ id: Date.now(), message }), []);

  const store = useMemo<Store>(() => {
    const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
    return {
      listings: [...myListings, ...p2pListings],
      addListing: (l) => setMyListings((cur) => [l, ...cur]),
      wishlist,
      isWished: (id) => wishlist.includes(id),
      toggleWish: (id) => setWishlist((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur])),
      cart,
      cartCount,
      addToCart: (id, qty = 1) => setCart((cur) => ({ ...cur, [id]: (cur[id] ?? 0) + qty })),
      setCartQty: (id, qty) =>
        setCart((cur) => {
          const next = { ...cur };
          if (qty <= 0) delete next[id];
          else next[id] = qty;
          return next;
        }),
      showToast,
    };
  }, [myListings, wishlist, cart, showToast]);

  return (
    <StoreContext.Provider value={store}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-36 z-50 mx-auto w-fit animate-fade-in rounded-full bg-gray-900/90 px-4 py-2 text-sm font-medium text-white"
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
