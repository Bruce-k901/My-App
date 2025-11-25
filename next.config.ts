import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trigger restart
  reactStrictMode: false, // Temporarily disabled for performance debugging
  // App Router is enabled by default in Next 15; no experimental flag needed
  // Ensure SSR build (not static export)
  // output: "standalone", // Only for production builds - causes issues in dev mode

  // Ensure Next uses this project as the workspace root to avoid mis-inference
  // when multiple lockfiles exist on the machine.
  // Only use in production - can cause issues in dev mode (static asset 404s)
  // outputFileTracingRoot: process.cwd(), // Disabled in dev mode

  // eslint configuration moved to eslint.config.mjs

  typescript: {
    ignoreBuildErrors: true,
  },

  // CSS optimization disabled in dev to prevent preload warnings
  // These warnings are harmless but annoying - they occur due to HMR in development
  experimental: {
    optimizeCss: process.env.NODE_ENV === "production", // Only enable in production
  },

  // Explicitly use webpack instead of Turbopack (Next.js 16 defaults to Turbopack)
  // The --webpack flag in package.json dev script forces webpack usage

  // Use webpack explicitly to avoid Turbopack conflicts
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add bundle analyzer for production builds
    if (!dev && !isServer) {
      const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: "static",
          openAnalyzer: false,
          reportFilename: "bundle-analyzer-report.html",
        }),
      );
    }
    return config;
  },
};

export default nextConfig;
