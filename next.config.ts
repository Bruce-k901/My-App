import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly disable Turbopack by giving an empty options object
  turbopack: {},

  reactStrictMode: true,

  eslint: {
    ignoreDuringBuilds: true,
  },

  webpack: (config) => {
    return config; // forces classic Webpack behaviour
  },
};

export default nextConfig;
