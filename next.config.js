
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
<<<<<<< HEAD
    domains: ['localhost', 'euwmoawbdkmtuhccpexz.supabase.co', 'qinxxeliezwmplejpezu.supabase.co'],
=======

>>>>>>> 44a6fab6a2e98ace1fe094023e773142e6da848a
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'euwmoawbdkmtuhccpexz.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
<<<<<<< HEAD
=======
    unoptimized: true, // Disable image optimization for Supabase storage

    domains: ['qinxxeliezwmplejpezu.supabase.co'],
>>>>>>> 44a6fab6a2e98ace1fe094023e773142e6da848a
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
