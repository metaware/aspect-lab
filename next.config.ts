import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E runs build into their own folder so they never clobber a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
