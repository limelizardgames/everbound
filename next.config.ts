import type { NextConfig } from "next";

/**
 * Static export for GitHub Pages. The whole site is plain HTML/JS; every rule is
 * enforced by Supabase (row-level security + database functions).
 * NEXT_PUBLIC_BASE_PATH is "/everbound" on https://<org>.github.io/everbound,
 * and empty when a custom domain is used.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
