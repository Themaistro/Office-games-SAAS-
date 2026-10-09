import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  // Keep Turbopack anchored to this app when the workspace lives inside a
  // parent directory that also contains a package-lock.json.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
