import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PNPTV Payment - Daimo USDC',
  description: 'Secure USDC payments for PNPTV subscriptions via Daimo Pay',
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-gradient-to-br from-indigo-500 to-purple-600 min-h-screen">
        {children}
      </body>
    </html>
  )
}