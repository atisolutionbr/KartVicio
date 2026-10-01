import type { NextConfig } from "next";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const nextConfig: NextConfig = {
  basePath,
  distDir: process.env.KART_BUILD_DIR === "production" ? ".next-production" : ".next",
  output: "standalone",
  turbopack: { root: process.cwd() },
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }, { key: "X-Content-Type-Options", value: "nosniff" }] }];
  },
};
export default nextConfig;
