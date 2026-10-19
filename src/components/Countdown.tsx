"use client";

import { useEffect, useState } from "react";

function remainingUntilMidnight() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function Countdown() {
  const [secs, setSecs] = useState<number | null>(null);

  useEffect(() => {
    setSecs(remainingUntilMidnight());
    const t = setInterval(() => setSecs(remainingUntilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = secs === null ? "--" : pad(Math.floor(secs / 3600));
  const m = secs === null ? "--" : pad(Math.floor((secs % 3600) / 60));
  const s = secs === null ? "--" : pad(secs % 60);

  return (
    <span className="flex items-center gap-0.5 text-xs font-bold tabular-nums text-white" aria-label="특가 남은 시간">
      {[h, m, s].map((v, i) => (
        <span key={i} className="flex items-center gap-0.5">
          <span className="rounded bg-gray-900 px-1.5 py-0.5">{v}</span>
          {i < 2 && <span className="text-gray-900">:</span>}
        </span>
      ))}
    </span>
  );
}
