/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Payment page runs on a separate port from the bot
  basePath: '/pay',
  // Disable TypeScript build errors for now (can enable later)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_DAIMO_APP_ID: process.env.NEXT_PUBLIC_DAIMO_APP_ID,
    NEXT_PUBLIC_TREASURY_ADDRESS: process.env.NEXT_PUBLIC_TREASURY_ADDRESS,
    NEXT_PUBLIC_REFUND_ADDRESS: process.env.NEXT_PUBLIC_REFUND_ADDRESS,
    NEXT_PUBLIC_BOT_URL: process.env.BOT_URL,
  },
}

module.exports = nextConfig
