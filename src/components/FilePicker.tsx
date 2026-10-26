"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";

// file input은 버튼 위에 겹쳐 두지 않는다. 화면에 렌더링된 채 시각적으로만 숨겨
// WebView가 터치를 가로채거나 무시하는 문제를 막고, 탭은 아래 <button>이 받는다.
const INPUT_STYLE: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: "hidden",
  opacity: 0,
  pointerEvents: "none",
};

const BUTTON_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 10,
  width: "100%",
  height: "100%",
  margin: 0,
  padding: 0,
  border: 0,
  background: "transparent",
  cursor: "pointer",
  touchAction: "manipulation",
  WebkitAppearance: "none",
  appearance: "none",
};

/**
 * 모바일(Pi Browser·Android/iOS WebView)에서도 확실히 열리는 파일 선택 버튼.
 * - 터치는 투명 <button>이 받고, 사용자 제스처 안에서 input.click()을 동기 호출한다.
 * - file input을 버튼 위에 투명하게 겹쳐 두는 방식은 Pi Browser에서 선택창이
 *   뜨지 않는 사례가 있어 사용하지 않는다.
 * - <label>로 감싸지 않는다: label 활성화가 input 클릭과 겹쳐 선택창이 두 번
 *   열리거나 바로 닫히는 WebView가 있다.
 * - 막힌 상태여도 클릭을 취소하고 onBlocked로 이유만 알린다.
 * - 누를 때 크기가 변하지 않는다: 터치 중 대상이 움직이면 탭이 취소되는 WebView가 있다.
 * - 고를 때마다 input을 새로 만들고 value를 비워 같은 파일도 다시 고를 수 있다.
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

  const open = () => {
    if (blocked) {
      onBlocked?.();
      return;
    }
    // 반드시 탭 핸들러 안에서 동기적으로 호출해야 WebView가 제스처로 인정한다.
    inputRef.current?.click();
  };

  return (
    <div
      className={`relative overflow-hidden transition-opacity active:opacity-70 ${blocked ? "opacity-40" : ""} ${className}`}
    >
      <span aria-hidden className="pointer-events-none contents">
        {children}
      </span>
      <button
        type="button"
        style={BUTTON_STYLE}
        aria-label={label}
        aria-disabled={blocked || undefined}
        onClick={open}
      />
      <input
        ref={inputRef}
        key={gen}
        type="file"
        accept={accept}
        multiple={multiple}
        capture={capture ? "environment" : undefined}
        tabIndex={-1}
        style={INPUT_STYLE}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          setGen((g) => g + 1);
          if (files.length) onFiles(files);
        }}
      />
    </div>
  );
}
