"use client";

import { useContext } from "react";
import { AuthContext } from "@/components/pi/PiProvider";

/** Pi 공식 데모 frontend/src/hooks/useAuth.ts 와 같은 인터페이스 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within PiProvider");
  return ctx;
}
