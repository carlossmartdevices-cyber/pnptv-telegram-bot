/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Environment variables que estarán disponibles en el cliente
  env: {
    NEXT_PUBLIC_BOT_URL: process.env.BOT_URL || 'https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com',
    NEXT_PUBLIC_WEBAPP_URL: process.env.WEBAPP_URL || 'https://pnptv.com',
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || 'PNPtvBot',
    NEXT_PUBLIC_DAIMO_APP_ID: process.env.DAIMO_APP_ID || 'pnptv-bot',
    NEXT_PUBLIC_TREASURY_ADDRESS: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
    NEXT_PUBLIC_REFUND_ADDRESS: process.env.NEXT_PUBLIC_REFUND_ADDRESS,
  },

  // Configuración de imágenes
  images: {
    domains: [
      'pnptv-telegram-bot-5dab055d3a53.herokuapp.com',
      'firebasestorage.googleapis.com',
      't.me',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'api.telegram.org',
      },
    ],
  },

  // Output standalone para Docker
  output: 'standalone',

  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
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
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Rewrites para API routes
  async rewrites() {
    const botUrl = process.env.NEXT_PUBLIC_BOT_URL || process.env.BOT_URL || 'https://pnptv-telegram-bot-5dab055d3a53.herokuapp.com'
    return [
      {
        source: '/api/bot/:path*',
        destination: `${botUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
