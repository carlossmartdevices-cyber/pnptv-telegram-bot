# PNPtv WebApp

A modern Next.js webapp for the PNPtv Telegram bot, built with React, TypeScript, and Tailwind CSS.

## Features

- 🎨 **Modern UI** - Built with Tailwind CSS and custom components
- 📱 **Telegram WebApp Integration** - Native integration with Telegram Mini Apps
- 🌗 **Dark Mode** - Optimized for dark theme with Telegram WebApp colors
- 🔄 **Responsive Design** - Works on both mobile and desktop
- 🚀 **Performance** - Built with Next.js 14 and optimized for speed
- 💎 **Premium Features** - Subscription management and premium content

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The webapp will be available at `http://localhost:3001`

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## Project Structure

```
src/webapp/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles with Tailwind
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Home page component
├── components/            # Reusable React components
│   ├── ui/               # UI components (buttons, toasts, etc.)
│   └── providers.tsx     # App providers
├── lib/                   # Utility functions
│   ├── telegram.ts       # Telegram WebApp types and utils
│   └── utils.ts          # General utilities
├── public/               # Static assets
│   └── manifest.json     # PWA manifest
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## Key Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Telegram WebApp API** - Native Telegram integration

## Telegram WebApp Integration

The webapp is designed to work as a Telegram Mini App with:

- Native theme integration (uses Telegram's color scheme)
- Main button and back button support
- Haptic feedback
- Cloud storage
- User data access
- Safe area handling for mobile devices

## Desktop Fallback

When accessed outside of Telegram, the webapp shows a desktop version with:

- Landing page promoting the Telegram bot
- Feature overview
- Direct link to the Telegram bot

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Environment Variables

The webapp uses environment variables from the main bot configuration:

- `NEXT_PUBLIC_BOT_URL` - Bot server URL
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` - Bot username
- `NEXT_PUBLIC_WEBAPP_URL` - WebApp URL

## Deployment

The webapp is deployed as part of the main PNPtv bot server and accessible at:
- Production: `https://pnptv.app/app`
- Telegram WebApp: Accessed through the @PNPtvBot

## Contributing

1. Make changes in the `src/webapp/` directory
2. Test both Telegram WebApp and desktop versions
3. Ensure TypeScript types are correct
4. Test responsive design on different screen sizes
5. Build and test production bundle before deploying