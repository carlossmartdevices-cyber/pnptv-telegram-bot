import { ReactNode } from "react";
import './globals.css';
import { Inter, Space_Grotesk, Source_Code_Pro } from 'next/font/google';
import { Providers } from "@/components/providers";

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter', 
  display: 'swap' 
});

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  variable: '--font-space-grotesk', 
  display: 'swap' 
});

const sourceCodePro = Source_Code_Pro({ 
  subsets: ['latin'], 
  variable: '--font-source-code-pro', 
  display: 'swap' 
});

interface RootLayoutProps {
  children: ReactNode;
}

export const metadata = {
  title: 'PNPtv Prime Hub',
  description: 'The largest PNP community online — safe, fun, and respectful.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
  themeColor: '#667eea',
};

export default function RootLayout({ children }: RootLayoutProps) {
  // Default locale and messages for now
  const locale = 'en';
  const messages = {};

  return (
    <html 
      lang={locale} 
      className={`${inter.variable} ${spaceGrotesk.variable} ${sourceCodePro.variable} dark`} 
      style={{ colorScheme: 'dark' }}
    >
      <head>
        {/* Telegram WebApp Script */}
        <script src="https://telegram.org/js/telegram-web-app.js" async />
        
        {/* Font preloading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Meta tags for Telegram WebApp */}
        <meta name="telegram-webapp" content="true" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* PWA Meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="safe-area font-body antialiased">
        <Providers locale={locale} messages={messages}>
          <div className="min-h-screen bg-background text-foreground">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}