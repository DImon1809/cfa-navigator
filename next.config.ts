import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize imports from icon libraries — reduces JS bundle size
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },

  // Docker deployment
  output: 'standalone',

  // Fix monorepo nesting: standalone output stays flat in the project dir
  outputFileTracingRoot: __dirname,

  // Performance
  compress: true,

  // Security
  poweredByHeader: false,

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Redirect /favicon.ico to the SVG icon so all crawlers get the right icon
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/icon.svg',
        permanent: true,
      },
    ];
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
