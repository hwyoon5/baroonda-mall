"use client";

import { useEffect } from "react";

const DAY = 24 * 60 * 60 * 1000;

/** 상세 화면 조회수: 같은 기기에서는 24시간에 한 번만 센다 */
export default function ViewTracker({ id }: { id: string }) {
  useEffect(() => {
    const key = `bo:viewed:${id}`;
    try {
      const last = Number(localStorage.getItem(key));
      if (last && Date.now() - last < DAY) return;
      localStorage.setItem(key, String(Date.now()));
    } catch {}
    fetch(`/api/listings/${id}/view`, { method: "POST", keepalive: true }).catch(() => undefined);
  }, [id]);
  return null;
}
