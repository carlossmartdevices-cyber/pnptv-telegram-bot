/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/app',
  reactStrictMode: true,
  // App router is default in Next.js 15
  outputFileTracingRoot: process.cwd(),
  env: {
    NEXT_PUBLIC_BOT_URL: process.env.BOT_URL || 'https://pnptv.app',
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'PNPtvBot',
    NEXT_PUBLIC_WEBAPP_URL: process.env.WEBAPP_URL || 'https://pnptv.app/app',
    NEXT_PUBLIC_API_URL: process.env.BOT_URL || 'https://pnptv.app',
  },
  async redirects() {
    return [
      {
        source: '/app.html',
        destination: '/app',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BOT_URL || 'https://pnptv.app'}/api/:path*`,
      },
    ];
  },
  images: {
    domains: ['pnptv.app', 'localhost'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self' https://telegram.org https://pnptv.app;
              script-src 'self' 'unsafe-eval' 'unsafe-inline' https://telegram.org;
              style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
              font-src 'self' https://fonts.gstatic.com;
              img-src 'self' data: https: blob:;
              connect-src 'self' https://pnptv.app https://api.telegram.org wss:;
              frame-src 'self' https://telegram.org;
            `.replace(/\s+/g, ' ').trim()
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
