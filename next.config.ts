import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Temporarily disabled for performance debugging
  // App Router is enabled by default in Next 15; no experimental flag needed
  // Ensure SSR build (not static export)
  output: "standalone",

  // Ensure Next uses this project as the workspace root to avoid mis-inference
  // when multiple lockfiles exist on the machine.
  outputFileTracingRoot: process.cwd(),

  // eslint configuration moved to eslint.config.mjs
  
  typescript: {
    ignoreBuildErrors: true,
  },

  // CSS optimization disabled in dev to prevent preload warnings
  // These warnings are harmless but annoying - they occur due to HMR in development
  experimental: {
    optimizeCss: process.env.NODE_ENV === 'production', // Only enable in production
  },

  // Explicitly disable Turbopack to use webpack
  // experimental: {
  //   turbo: false, // This key is invalid in Next.js 16
  // },

  // Use webpack explicitly to avoid Turbopack conflicts
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add bundle analyzer for production builds
    if (!dev && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-analyzer-report.html',
        })
      );
    }
    return config;
  },
};

export default nextConfig;
