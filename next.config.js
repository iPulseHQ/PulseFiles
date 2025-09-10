/** @type {import('next').NextConfig} */
const nextConfig = {
  // For static export (optional - uncomment if you want static hosting)
  // output: 'export',
  // trailingSlash: true,
  // images: { unoptimized: true },
  
  // Enable large file uploads and server packages
  experimental: {
    largePageDataBytes: 128 * 1000, // 128KB
    clientTraceMetadata: false, // Disable to reduce warnings
    // Note: API payload limits are handled per route in Next.js 15+
  },
  // Webpack optimization to reduce bundle size warnings
  webpack: (config, { isServer }) => {
    // Optimize bundle splitting
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            maxSize: 200000, // 200KB chunks
          },
        },
      };
    }
    
    // Reduce string serialization warnings
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.pulseguard.pro https://clerk.ipulse.one https://*.clerk.dev https://*.clerk.accounts.dev https://*.googleapis.com https://cdn.databuddy.cc",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https: wss: *.supabase.co https://o447951.ingest.sentry.io https://clerk.pulseguard.pro https://clerk.ipulse.one https://*.clerk.dev https://*.clerk.accounts.dev https://*.clerk.com wss://*.clerk.dev wss://*.clerk.accounts.dev https://cdn.databuddy.cc https://*.databuddy.cc",
              "frame-src 'self' https://clerk.pulseguard.pro https://clerk.ipulse.one https://*.clerk.dev https://*.clerk.accounts.dev",
              "worker-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  // Enable compression
  compress: true,
  // Remove powered by header
  poweredByHeader: false,
  // Enable external packages for server components
  serverExternalPackages: ['bcrypt'],
};

// Sentry configuration
const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "pulseguard",
    project: "pulsefiles",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
