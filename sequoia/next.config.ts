import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

// Pin Turbopack root to this app when using `dev:turbo` (avoids wrong parent lockfile).
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: appRoot,
  },
  experimental: {
    webpackMemoryOptimizations: true,
    webpackBuildWorker: false,
    preloadEntriesOnStart: false,
    optimizePackageImports: ["@react-three/drei", "@react-three/postprocessing"],
  },
};

export default nextConfig;
