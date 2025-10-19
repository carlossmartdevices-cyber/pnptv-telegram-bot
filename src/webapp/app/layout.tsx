import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PNPtv - Social Platform',
  description: 'Connect, share, and discover with PNPtv - Your social platform integrated with Telegram',
  keywords: ['social media', 'pnptv', 'telegram', 'social platform', 'nearby', 'live streaming'],
  authors: [{ name: 'PNPtv Team' }],
  openGraph: {
    title: 'PNPtv - Social Platform',
    description: 'Connect, share, and discover with PNPtv',
    type: 'website',
    locale: 'en_US',
    siteName: 'PNPtv',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PNPtv - Social Platform',
    description: 'Connect, share, and discover with PNPtv',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
