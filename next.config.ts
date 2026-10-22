import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A2U 서명 라이브러리: 선택적 네이티브 모듈(sodium-native)을 번들하지 않고 Node에서 그대로 로드
  serverExternalPackages: ["@stellar/stellar-base", "sodium-native"],
  async redirects() {
    return [
      { source: "/market", destination: "/category/used", permanent: false },
      { source: "/market/:id", destination: "/category/used", permanent: false },
      { source: "/product/:id", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
