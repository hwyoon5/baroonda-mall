"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useStore } from "@/components/store/StoreProvider";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/client/api";
import { inspectVideo, uploadMedia, videoExt } from "@/lib/client/media";
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, VIDEO_TYPES } from "@/lib/media";
import { MAX_SHORT_CAPTION, MAX_SHORTS_PER_USER } from "@/lib/shorts";
import type { Listing, ShortView } from "@/lib/types";

const errText = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

export default function MyShortsPage() {
  const { user, ready } = useAuth();
  const { showToast } = useStore();
  const [shorts, setShorts] = useState<ShortView[] | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [blobEnabled, setBlobEnabled] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [phase, setPhase] = useState<"idle" | "checking" | "uploading">("idle");
  const abortRef = useRef<AbortController | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [listingId, setListingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api<{ shorts: ShortView[] }>("/api/shorts?author=me")
      .then((r) => setShorts(r.shorts))
      .catch(() => setShorts([]));
    api<{ listings: Listing[] }>("/api/listings?seller=me")
      .then((r) => setListings(r.listings.filter((l) => l.status !== "draft")))
      .catch(() => undefined);
    api<{ enabled: boolean }>("/api/upload")
      .then((r) => setBlobEnabled(r.enabled))
      .catch(() => setBlobEnabled(false));
  }, [user]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.type && !VIDEO_TYPES.includes(file.type)) return showToast("MP4·MOV·WebM 동영상만 올릴 수 있어요.");
    if (file.size > MAX_VIDEO_BYTES) return showToast(`동영상은 ${MAX_VIDEO_BYTES / 1024 / 1024}MB 이하만 올릴 수 있어요.`);
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setPhase("checking");
    try {
      const { duration, poster } = await inspectVideo(file, true);
      if (ac.signal.aborted) return;
      if (duration !== null && duration > MAX_VIDEO_SECONDS + 0.5) return showToast(`쇼츠는 ${MAX_VIDEO_SECONDS}초 이하만 올릴 수 있어요.`);
      setPhase("uploading");
      setProgress(0);
      const url = await uploadMedia(file, "video", videoExt(file.type), setProgress, ac.signal);
      const poster_ = poster ? await uploadMedia(poster, "photo", "jpg", undefined, ac.signal).catch(() => "") : "";
      if (ac.signal.aborted) return;
      setVideoUrl(url);
      setPosterUrl(poster_);
    } catch {
      if (!ac.signal.aborted) showToast("동영상을 올리지 못했어요. 다시 시도해 주세요.");
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
        setPhase("idle");
        setProgress(null);
      }
    }
  };

  const cancelUpload = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    setProgress(null);
  };

  const resetDraft = () => {
    setVideoUrl("");
    setPosterUrl("");
  };

  const submit = async () => {
    if (!videoUrl || busy) return;
    setBusy(true);
    try {
      const { short } = await api<{ short: ShortView }>("/api/shorts", { videoUrl, posterUrl: posterUrl || undefined, caption, listingId: listingId || undefined });
      setShorts((cur) => [short, ...(cur ?? [])]);
      resetDraft();
      setCaption("");
      setListingId("");
      showToast("쇼츠를 등록했어요!");
    } catch (e) {
      showToast(errText(e, "쇼츠를 등록하지 못했어요."));
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (s: ShortView, status: "public" | "hidden") => {
    setBusyId(s.id);
    try {
      const { short } = await api<{ short: ShortView }>(`/api/shorts/${s.id}`, { status }, "PATCH");
      setShorts((cur) => cur?.map((c) => (c.id === s.id ? short : c)) ?? null);
      showToast(status === "hidden" ? "쇼츠를 숨겼어요. 피드에 보이지 않아요." : "쇼츠를 다시 공개했어요.");
    } catch (e) {
      showToast(errText(e, "변경하지 못했어요."));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (s: ShortView) => {
    if (!window.confirm("이 쇼츠를 삭제할까요? 삭제하면 되돌릴 수 없어요.")) return;
    setBusyId(s.id);
    try {
      await api(`/api/shorts/${s.id}`, undefined, "DELETE");
      setShorts((cur) => cur?.filter((c) => c.id !== s.id) ?? null);
      showToast("쇼츠를 삭제했어요.");
    } catch (e) {
      showToast(errText(e, "삭제하지 못했어요."));
    } finally {
      setBusyId(null);
    }
  };

  const count = shorts?.length ?? 0;
  const full = count >= MAX_SHORTS_PER_USER;
  const blockReason =
    blobEnabled === null
      ? "업로드를 준비하고 있어요. 잠시 후 다시 눌러 주세요."
      : blobEnabled === false
        ? "동영상 저장소가 연결되지 않아 지금은 올릴 수 없어요."
        : full
          ? `쇼츠는 최대 ${MAX_SHORTS_PER_USER}개까지 등록할 수 있어요. 안 쓰는 쇼츠를 삭제해 주세요.`
          : phase !== "idle"
            ? "동영상을 올리는 중이에요."
            : null;
  const onBlocked = () => blockReason && showToast(blockReason);

  return (
    <div>
      <SubHeader title="내 쇼츠 관리" />
      {!ready ? null : !user ? (
        <div className="p-4">
          <LoginCard message="쇼츠를 올리고 관리하려면 Pi 계정으로 로그인해 주세요." />
        </div>
      ) : (
        <div className="space-y-3 p-3">
          <section className="rounded-2xl bg-white p-4">
            <h2 className="text-sm font-extrabold">새 쇼츠 등록</h2>
            <p className="mt-1 text-xs text-gray-500">
              세로 영상 권장 · {MAX_VIDEO_SECONDS}초 · {MAX_VIDEO_BYTES / 1024 / 1024}MB 이하 · MP4·MOV·WebM
            </p>
            {blobEnabled === false && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                동영상 저장소가 연결되지 않아 지금은 쇼츠를 올릴 수 없어요.
              </p>
            )}
            {full && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                쇼츠는 최대 {MAX_SHORTS_PER_USER}개까지 등록할 수 있어요. 안 쓰는 쇼츠를 삭제해 주세요.
              </p>
            )}
            {phase !== "idle" ? (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full bg-pi transition-all" style={{ width: `${progress ?? 0}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>{phase === "checking" ? "동영상 확인 중…" : `동영상 올리는 중… ${progress ?? 0}%`}</span>
                  <button type="button" onClick={cancelUpload} className="tap rounded-md border border-gray-200 px-2 py-1 font-bold text-gray-600">
                    취소
                  </button>
                </div>
              </div>
            ) : !videoUrl ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <PickButton icon="📹" label="촬영하기" capture blocked={!!blockReason} onBlocked={onBlocked} onPick={pick} />
                <PickButton icon="🖼️" label="앨범에서 선택" blocked={!!blockReason} onBlocked={onBlocked} onPick={pick} />
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <video src={videoUrl} controls playsInline className="mx-auto aspect-[9/16] max-h-80 rounded-xl bg-black" />
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">설명 (선택)</span>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    maxLength={MAX_SHORT_CAPTION}
                    rows={2}
                    placeholder="예) 오늘 입고된 신상 컬러 보여드려요!"
                    className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm"
                  />
                  <span className="block text-right text-[11px] text-gray-400">
                    {caption.length}/{MAX_SHORT_CAPTION}
                  </span>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-gray-700">연결할 내 상품 (선택)</span>
                  <select
                    value={listingId}
                    onChange={(e) => setListingId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white p-2 text-sm"
                  >
                    <option value="">연결 안 함</option>
                    {listings.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[11px] text-gray-400">연결하면 쇼츠 피드에서 바로 상품으로 이동할 수 있어요.</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={resetDraft} className="tap rounded-xl border border-gray-200 py-3 text-sm font-bold">
                    다시 선택
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={busy}
                    className="tap col-span-2 rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {busy ? "등록 중…" : "쇼츠 등록하기"}
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold">
                내 쇼츠 <span className="text-gray-400">{count}/{MAX_SHORTS_PER_USER}</span>
              </h2>
              <Link href="/shorts" className="text-xs font-bold text-pi">
                쇼츠 피드 보기 ›
              </Link>
            </div>
            {!shorts ? (
              <p className="py-8 text-center text-sm text-gray-400">불러오는 중…</p>
            ) : shorts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">아직 올린 쇼츠가 없어요.</p>
            ) : (
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {shorts.map((s) => (
                  <li key={s.id} className="min-w-0">
                    <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-black">
                      {s.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <span aria-hidden className="flex h-full items-center justify-center text-3xl">
                          🎬
                        </span>
                      )}
                      {s.status === "public" ? (
                        <Link href={`/shorts?id=${s.id}`} aria-label="피드에서 보기" className="absolute inset-0" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-bold text-white">숨김</span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs">{s.caption || "설명 없음"}</p>
                    {s.listing && <p className="truncate text-[11px] text-pi">🔗 {s.listing.title}</p>}
                    <div className="mt-1 grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => setStatus(s, s.status === "public" ? "hidden" : "public")}
                        className="tap rounded-md border border-gray-200 py-1 text-[11px] font-bold disabled:opacity-50"
                      >
                        {s.status === "public" ? "숨기기" : "공개"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === s.id}
                        onClick={() => remove(s)}
                        className="tap rounded-md border border-red-100 py-1 text-[11px] font-bold text-red-500 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

/** 숨긴 file input을 버튼에서 직접 연다. 열기 전에 값을 비워 같은 파일을 다시 골라도 onChange가 오고, 막힌 상태면 이유를 알려 준다. */
function PickButton({
  icon,
  label,
  capture,
  blocked,
  onBlocked,
  onPick,
}: {
  icon: string;
  label: string;
  capture?: boolean;
  blocked: boolean;
  onBlocked: () => void;
  onPick: (f: File | undefined) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative">
      <button
        type="button"
        aria-disabled={blocked}
        onClick={() => {
          const el = ref.current;
          if (blocked || !el) return onBlocked();
          el.value = "";
          el.click();
        }}
        className={`tap flex w-full flex-col items-center gap-1 rounded-xl border-2 border-dashed border-gray-200 py-5 text-sm font-bold ${blocked ? "opacity-40" : ""}`}
      >
        <span className="text-2xl">{icon}</span>
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept="video/*"
        capture={capture ? "environment" : undefined}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          onPick(f);
        }}
      />
    </div>
  );
}
