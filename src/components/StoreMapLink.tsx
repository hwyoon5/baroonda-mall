"use client";

import type { MouseEvent, ReactNode } from "react";
import { initPiSdk } from "@/lib/client/pi-sdk";
import { STORE_MAP_ANDROID_INTENT, STORE_MAP_APP_LINK, STORE_MAP_URL } from "@/lib/links";

function openTab(url: string) {
  const w = window.open(url, "_blank");
  if (w) w.opener = null;
  else location.href = url;
}

const openWeb = () => openTab(STORE_MAP_URL);

/** 휴대폰에서는 네이버 지도 앱을 바로 열고, PC·앱 없는 기기에서는 웹 저장 목록을 새 창으로 연다. */
export default function StoreMapLink({ className, children }: { className?: string; children: ReactNode }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const ua = navigator.userAgent;
    const android = /Android/i.test(ua);
    const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (!android && !ios) return;
    e.preventDefault();

    // Pi Browser 안에서는 웹뷰가 앱 링크를 처리하지 못하므로 휴대폰 시스템(OS)에 넘겨 앱을 연다.
    if (/PiBrowser/i.test(ua) && window.Pi?.openUrlInSystemBrowser) {
      initPiSdk();
      window.Pi.openUrlInSystemBrowser(STORE_MAP_APP_LINK).catch(openWeb);
      return;
    }
    if (android && !/; wv\)/.test(ua)) {
      location.href = STORE_MAP_ANDROID_INTENT;
      return;
    }
    openTab(STORE_MAP_APP_LINK);
  };

  return (
    <a href={STORE_MAP_URL} target="_blank" rel="noopener noreferrer" onClick={onClick} className={className}>
      {children}
    </a>
  );
}
