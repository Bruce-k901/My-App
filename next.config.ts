import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly disable Turbopack by giving an empty options object
  turbopack: {},

  reactStrictMode: false, // Temporarily disabled for performance debugging
  // App Router is enabled by default in Next 15; no experimental flag needed
  // Ensure SSR build (not static export)
  output: "standalone",

  // Ensure Next uses this project as the workspace root to avoid mis-inference
  // when multiple lockfiles exist on the machine.
  outputFileTracingRoot: process.cwd(),

  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config) => {
    return config; // forces classic Webpack behaviour
  },
};

export default nextConfig;
