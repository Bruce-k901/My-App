import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly disable Turbopack by giving an empty options object
  turbopack: {},

  reactStrictMode: true,
  // App Router is enabled by default in Next 15; no experimental flag needed
  // Ensure SSR build (not static export)
  output: "standalone",

  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config) => {
    return config; // forces classic Webpack behaviour
  },
};

export default nextConfig;
