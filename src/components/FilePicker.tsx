"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";

const INPUT_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 10,
  width: "100%",
  height: "100%",
  margin: 0,
  padding: 0,
  border: 0,
  opacity: 0,
  cursor: "pointer",
  touchAction: "manipulation",
  WebkitAppearance: "none",
  appearance: "none",
};

/**
 * 모바일(Pi Browser·Android/iOS WebView)에서도 확실히 열리는 파일 선택 버튼.
 * - 투명 file input이 버튼 전체를 덮고, 손가락이 input을 직접 누른다(WebView는 스크립트 input.click()을 무시하기도 함).
 * - <label>로 감싸지 않는다: label 활성화가 input 클릭과 겹쳐 선택창이 두 번 열리거나 바로 닫히는 WebView가 있다.
 * - input은 늘 같은 자리에 있다: 막힌 상태여도 button으로 바꾸지 않고 클릭을 취소해 이유만 알린다
 *   (상태가 바뀌는 순간 누른 터치가 사라진 요소에 떨어지지 않게).
 * - 누를 때 크기가 변하지 않는다: 터치 중 대상이 움직이면 탭이 취소되는 WebView가 있다.
 * - 고를 때마다 input을 새로 만들어 같은 파일도 다시 고를 수 있다.
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
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`relative overflow-hidden transition-opacity active:opacity-70 ${blocked ? "opacity-40" : ""} ${className}`}
      onClick={(e) => {
        // 터치가 input 바깥(테두리 등)에 떨어졌을 때만 대신 연다.
        if (e.target !== inputRef.current) inputRef.current?.click();
      }}
    >
      <span aria-hidden className="pointer-events-none contents">
        {children}
      </span>
      <input
        ref={inputRef}
        key={gen}
        type="file"
        accept={accept}
        multiple={multiple}
        capture={capture ? "environment" : undefined}
        aria-label={label}
        aria-disabled={blocked || undefined}
        style={INPUT_STYLE}
        onClick={(e) => {
          e.stopPropagation();
          if (blocked) {
            e.preventDefault();
            onBlocked?.();
            return;
          }
          e.currentTarget.value = "";
        }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          setGen((g) => g + 1);
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}
