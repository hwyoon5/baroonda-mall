"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type RefObject } from "react";
import PiPrice from "@/components/PiPrice";
import { api } from "@/lib/client/api";
import type { ListingStatus, ShortView } from "@/lib/types";

const statusLabel: Partial<Record<ListingStatus, string>> = { reserved: "예약중", sold: "판매완료", paused: "판매중지" };

export default function ShortsPage() {
  return (
    <Suspense>
      <ShortsFeed />
    </Suspense>
  );
}

function ShortsFeed() {
  const startId = useSearchParams().get("id");
  const [shorts, setShorts] = useState<ShortView[] | null>(null);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const feed = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ shorts: ShortView[] }>("/api/shorts")
      .then((r) => setShorts(r.shorts))
      .catch((e) => setError(e instanceof Error ? e.message : "쇼츠를 불러오지 못했어요."));
  }, []);

  useEffect(() => {
    if (shorts && startId) feed.current?.querySelector(`[data-id="${CSS.escape(startId)}"]`)?.scrollIntoView();
  }, [shorts, startId]);

  return (
    <div
      ref={feed}
      className="fixed inset-x-0 top-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md snap-y snap-mandatory overflow-y-auto overscroll-contain bg-black text-white"
    >
      <header className="pointer-events-none fixed inset-x-0 top-0 z-10 mx-auto flex max-w-md items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <h1 className="text-lg font-extrabold drop-shadow">쇼츠</h1>
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="tap rounded-full bg-black/40 px-3 py-1.5 text-xs font-bold"
          >
            {muted ? "🔇 소리 켜기" : "🔊 소리 끄기"}
          </button>
          <Link href="/my/shorts" className="tap rounded-full bg-pi px-3 py-1.5 text-xs font-bold text-white">
            + 올리기
          </Link>
        </div>
      </header>
      {error ? (
        <p className="flex h-full items-center justify-center px-8 text-center text-sm text-white/70">{error}</p>
      ) : !shorts ? (
        <p className="flex h-full items-center justify-center text-sm text-white/60">불러오는 중…</p>
      ) : shorts.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-sm text-white/70">
            아직 올라온 쇼츠가 없어요.
            <br />첫 번째 쇼츠를 올려 보세요!
          </p>
          <Link href="/my/shorts" className="tap rounded-full bg-pi px-4 py-2 text-sm font-bold text-white">
            쇼츠 올리기
          </Link>
        </div>
      ) : (
        shorts.map((s) => <ShortItem key={s.id} short={s} muted={muted} root={feed} />)
      )}
    </div>
  );
}

function ShortItem({ short, muted, root }: { short: ShortView; muted: boolean; root: RefObject<HTMLDivElement | null> }) {
  const video = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setActive(e.isIntersecting);
        if (!e.isIntersecting) setPaused(false);
      },
      { root: root.current, threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    if (video.current) video.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (active && !paused) el.play().catch(() => setPaused(true));
    else el.pause();
    if (!active) el.currentTime = 0;
  }, [active, paused]);

  const l = short.listing;
  return (
    <section data-id={short.id} className="relative h-full w-full snap-start snap-always">
      <video
        ref={video}
        src={short.videoUrl}
        poster={short.posterUrl}
        muted
        loop
        playsInline
        preload={active ? "auto" : "none"}
        onClick={() => setPaused((p) => !p)}
        className="h-full w-full object-contain"
      />
      {paused && (
        <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl text-white/80">
          ▶
        </span>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-16 pb-4">
        <Link href={`/sellers/${encodeURIComponent(short.author.uid)}`} className="pointer-events-auto text-sm font-bold">
          @{short.author.username}
        </Link>
        {short.caption && <p className="mt-1 line-clamp-3 text-sm whitespace-pre-wrap text-white/90">{short.caption}</p>}
        {l && (
          <Link
            href={`/listings/${l.id}`}
            className="tap pointer-events-auto mt-3 flex items-center gap-3 rounded-xl bg-white/95 p-2 text-gray-900"
          >
            {l.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-xl">📦</span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{l.title}</span>
              <PiPrice value={l.pricePi} size="sm" />
            </span>
            <span className="shrink-0 rounded-lg bg-pi px-3 py-2 text-xs font-bold text-white">
              {statusLabel[l.status] ?? "상품 보기"}
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
