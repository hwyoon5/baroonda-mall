"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Store = {
  wishlist: string[];
  isWished: (id: string) => boolean;
  toggleWish: (id: string) => void;
  showToast: (message: string) => void;
};

const StoreContext = createContext<Store | null>(null);

const STORAGE_KEY = "baroonda-wishlist-v2";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setWishlist(JSON.parse(raw) as string[]);
    } catch {
      // ignore corrupted storage
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    } catch {
      // storage unavailable
    }
  }, [loaded, wishlist]);

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
      showToast,
    }),
    [wishlist, showToast],
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
