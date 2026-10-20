"use client";

import { useState, type ReactNode } from "react";

/**
 * 모바일(Pi Browser·Android WebView)에서도 확실히 열리는 파일 선택 버튼.
 * - 투명한 file input을 버튼 전체에 덮어 사용자가 input을 직접 누르게 한다.
 *   (스크립트로 input.click()을 부르거나 숨긴 input에 의존하면 일부 WebView에서 조용히 무시된다.)
 * - 고를 때마다 input을 새로 만들어 같은 파일도 다시 고를 수 있다.
 * - 막힌 상태(blocked)면 input 대신 버튼을 두어, 누르면 이유를 알려 준다.
 */
export default function FilePicker({
  label,
  accept,
  multiple,
  capture,
  blocked,
  onBlocked,
  onFiles,
  className = "",
  children,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  capture?: boolean;
  blocked?: boolean;
  onBlocked?: () => void;
  onFiles: (files: File[]) => void;
  className?: string;
  children: ReactNode;
}) {
  const [gen, setGen] = useState(0);
  return (
    <label className={`tap relative overflow-hidden ${blocked ? "opacity-40" : ""} ${className}`}>
      <span aria-hidden className="contents">
        {children}
      </span>
      {blocked ? (
        <button type="button" aria-label={label} onClick={onBlocked} className="absolute inset-0 z-10" />
      ) : (
        <input
          key={gen}
          type="file"
          accept={accept}
          multiple={multiple}
          capture={capture ? "environment" : undefined}
          aria-label={label}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onClick={(e) => {
            e.currentTarget.value = "";
          }}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            setGen((g) => g + 1);
            if (files.length) onFiles(files);
          }}
        />
      )}
    </label>
  );
}
