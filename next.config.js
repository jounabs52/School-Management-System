/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['qinxxeliezwmplejpezu.supabase.co'],
  },
  webpack: (config, { isServer }) => {
    // Fix for jsPDF in Next.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
      };
    }

    // Optimize cache and memory usage
    config.cache = false;

    // Increase memory limits for webpack
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
          },
        },
      },
    };

    return config;
  },
};

module.exports = nextConfig;
