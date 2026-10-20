import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/market", destination: "/category/used", permanent: false },
      { source: "/market/:id", destination: "/category/used", permanent: false },
      { source: "/product/:id", destination: "/", permanent: false },
      { source: "/cart", destination: "/orders", permanent: false },
    ];
  },
};

export default nextConfig;
