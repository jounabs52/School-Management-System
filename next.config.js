// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'euwmoawbdkmtuhccpexz.supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'euwmoawbdkmtuhccpexz.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
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
}

module.exports = nextConfig
