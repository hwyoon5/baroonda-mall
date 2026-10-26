import type { Metadata, Viewport } from "next";
import AppFrame from "@/components/AppFrame";
import BottomNav from "@/components/BottomNav";
import { PiProvider } from "@/components/pi/PiProvider";
import { StoreProvider } from "@/components/store/StoreProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "바로온다 - 파이(π)로 사고파는 P2P 오픈마켓",
  description: "Pi 계정만 있으면 누구나 상품을 올리고, 구매는 오직 π로 결제하는 오픈마켓 바로온다",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6b3fa0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <PiProvider>
          <StoreProvider>
            <AppFrame nav={<BottomNav />}>{children}</AppFrame>
          </StoreProvider>
        </PiProvider>
      </body>
    </html>
  );
}
