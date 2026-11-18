import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E runs build into their own folder so they never clobber a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // STATIC_EXPORT=1 emits a plain static site to out/ (static hosts like Render
  // Static Sites). The app is fully client-side, so nothing needs a server.
  ...(process.env.STATIC_EXPORT === "1" ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } } : {}),
};

export default nextConfig;
