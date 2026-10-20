import type { Metadata, Viewport } from "next";
import BottomNav from "@/components/BottomNav";
import { StoreProvider } from "@/components/store/StoreProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "바로온다 - 파이로 결제하는 빠른배송 쇼핑몰",
  description: "파이브라우저에서 π로 결제하고 내일 바로 받는 쇼핑몰, 바로온다",
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
        <StoreProvider>
          <div className="mx-auto min-h-dvh max-w-md bg-gray-100 pb-20 shadow-xl">{children}</div>
          <BottomNav />
        </StoreProvider>
      </body>
    </html>
  );
}
