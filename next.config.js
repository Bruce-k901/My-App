/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
    // Remove framer-motion from optimizePackageImports since we're using dynamic imports
  },
  webpack: (config, { dev, isServer }) => {
    // Improve tree shaking - removed usedExports as it conflicts with Next.js 15's cacheUnaffected
    config.optimization = {
      ...config.optimization,
      sideEffects: false,
    };

    // Better code splitting for client-side bundles
    if (!isServer && !dev) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        chunks: 'all',
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Separate heavy libraries into their own chunks
          framerMotion: {
            name: 'framer-motion',
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          reactDatepicker: {
            name: 'react-datepicker',
            test: /[\\/]node_modules[\\/]react-datepicker[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          xlsx: {
            name: 'xlsx',
            test: /[\\/]node_modules[\\/]xlsx[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          // Group UI libraries together
          ui: {
            name: 'ui-libs',
            test: /[\\/]node_modules[\\/](@radix-ui|@headlessui|lucide-react)[\\/]/,
            chunks: 'all',
            priority: 20,
          },
          // Supabase and auth
          supabase: {
            name: 'supabase',
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            chunks: 'all',
            priority: 20,
          },
        },
      };
    }

    return config;
  },
};

module.exports = nextConfig;