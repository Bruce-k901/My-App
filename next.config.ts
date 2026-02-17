import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true, // Re-enabled for better Fast Refresh support
  productionBrowserSourceMaps: false,
  // App Router is enabled by default in Next 15; no experimental flag needed
  // Ensure SSR build (not static export)
  // output: "standalone", // Only for production builds - causes issues in dev mode

  // Explicitly set the project root to avoid Next.js mis-inferring workspace root
  // This prevents issues when multiple lockfiles exist on the machine
  // Using path.resolve ensures absolute path for better reliability
  outputFileTracingRoot: process.cwd(),

  // Exclude native binary packages from webpack bundling (required for Puppeteer on Vercel)
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  // eslint configuration moved to eslint.config.mjs

  typescript: {
    ignoreBuildErrors: true,
  },

  // CSS optimization disabled in dev to prevent preload warnings
  // These warnings are harmless but annoying - they occur due to HMR in development
  experimental: {
    optimizeCss: false, // Disabled to prevent SIGKILL/OOM on Vercel
  },

  // Explicitly use webpack instead of Turbopack (Next.js 16 defaults to Turbopack)
  // The --webpack flag in package.json dev script forces webpack usage

  // Use webpack explicitly to avoid Turbopack conflicts
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Use filesystem cache in dev for fast rebuilds
    if (dev) {
      config.cache = {
        type: "filesystem",
      };
    }

    // Production: strip console/debugger statements
    if (!dev) {
      config.devtool = false; // No source map hints in compiled JS

      if (!isServer) {
        const TerserPlugin = require("terser-webpack-plugin");
        // IMPORTANT: Push to existing minimizer array — do NOT replace it.
        // Next.js configures its own minimizer (SWC/Terser) with safe defaults.
        // Replacing the array breaks the webpack runtime and causes production crashes.
        config.optimization.minimizer = config.optimization.minimizer || [];
        config.optimization.minimizer.push(
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,
                drop_debugger: true,
              },
              format: {
                comments: false,
              },
            },
            extractComments: false,
          }),
        );

        // Bundle analyzer
        const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: "static",
            openAnalyzer: false,
            reportFilename: "bundle-analyzer-report.html",
          }),
        );
      }
    }
    return config;
  },

  // Permanent redirects: old food safety (PlayerShell, selfstudy, learn stub) → Learn course only (never show old version)
  async redirects() {
    const learnFoodSafety = "/learn/uk-l2-food-safety";
    return [
      {
        source: "/learn/uk-l2-food-safety-v3",
        destination: learnFoodSafety,
        permanent: true,
      },
      {
        source: "/training/courses/l2-food-hygiene/start",
        destination: learnFoodSafety,
        permanent: true,
      },
      {
        source: "/training/courses/uk-l2-food-hygiene/start",
        destination: learnFoodSafety,
        permanent: true,
      },
      {
        source: "/training/courses/l2-food-hygiene/certificate",
        destination: "/dashboard/courses",
        permanent: true,
      },
      {
        source:
          "/selfstudy/uk-l2-food-hygiene/uk_l2_food_hygiene_selfstudy_v1_0",
        destination: learnFoodSafety,
        permanent: true,
      },
      {
        source:
          "/selfstudy/uk-l2-food-hygiene/uk_l2_food_hygiene_selfstudy_v1_0/:path*",
        destination: learnFoodSafety,
        permanent: true,
      },
      {
        source: "/selfstudy/uk-l2-food-hygiene",
        destination: learnFoodSafety,
        permanent: true,
      },
      {
        source: "/selfstudy/uk-l2-food-hygiene/:path*",
        destination: learnFoodSafety,
        permanent: true,
      },
    ];
  },

  // Add headers for static assets to prevent cache issues
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
