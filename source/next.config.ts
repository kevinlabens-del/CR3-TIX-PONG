import type { NextConfig } from "next";

const basePath = "/CR3-TIX-PONG";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
  images: { unoptimized: true },
};

export default nextConfig;
