"use client";

import { useEffect, useRef } from "react";

/** 화면이 보이는 동안 주기적으로, 그리고 앱으로 돌아올 때 바로 다시 불러온다(배송 상태 실시간 반영). */
export function useLiveRefresh(refresh: () => void, enabled: boolean, intervalMs = 15000) {
  const fn = useRef(refresh);
  fn.current = refresh;
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === "visible") fn.current();
    };
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [enabled, intervalMs]);
}
