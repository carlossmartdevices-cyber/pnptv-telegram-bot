# PNPtv Web Application

Web application for PNPtv social platform - accessible from any browser with Telegram authentication.

## 🚀 Features

- **Telegram Login**: Secure authentication via Telegram Widget
- **Social Feed**: Browse and create posts with media support
- **Nearby**: Discover content and users based on geolocation
- **Profiles**: User profiles with stats and customization
- **PNPtv PRIME**: Premium subscription content
- **Live Streaming**: Watch and broadcast live content
- **Crypto Payments**: Subscribe using Daimo Pay (USDC on Base)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: React Query + Zustand
- **Database**: Firebase/Firestore (shared with Telegram bot)
- **Authentication**: Telegram Login Widget + JWT
- **Payments**: Daimo Pay (crypto/fiat)

## 📁 Project Structure

```
src/webapp/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (login)
│   ├── (main)/            # Main app routes (feed, profile, etc.)
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── auth/             # Auth components
│   ├── feed/             # Feed components
│   ├── posts/            # Post components
│   ├── profile/          # Profile components
│   └── ui/               # Reusable UI components
├── lib/                   # Utilities and helpers
│   ├── firebase.ts       # Firebase client config
│   ├── auth.ts           # Auth utilities
│   └── api.ts            # API client
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── public/                # Static assets
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project (shared with bot)
- Telegram Bot configured

### Installation

```bash
# From the webapp directory
cd src/webapp

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Update .env.local with your credentials
```

### Development

```bash
# Run development server
npm run dev

# Visit http://localhost:3001
```

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🔐 Authentication Flow

1. User clicks "Sign in with Telegram"
2. Telegram Widget validates user
3. Backend validates Telegram hash
4. Check if user exists in bot (required)
5. Generate JWT token
6. Store token in localStorage
7. Redirect to main feed

## 🗄️ Database Schema

### Collections (Firestore)

#### `users`
- User profiles and settings
- Membership tiers
- Social stats

#### `posts`
- User-generated content
- Media URLs
- Location data
- Visibility settings

#### `interactions`
- Likes, comments, shares
- Tracking user engagement

#### `feed_cache`
- Cached feed data
- Optimized queries

See `/types/index.ts` for full schema definitions.

## 🌍 Deployment

### Hostinger VPS

```bash
# Build Docker image
docker build -t pnptv-webapp .

# Run with Docker Compose
docker-compose up -d
```

### Environment Variables (Production)

Set these in your deployment platform:

- `NODE_ENV=production`
- `BOT_URL` - Your bot backend URL
- `WEBAPP_URL` - Your webapp domain
- `TELEGRAM_BOT_TOKEN` - Bot token
- `JWT_SECRET` - Strong secret for JWT
- Firebase credentials (inherited)
- Daimo Pay credentials

## 📚 API Routes

### Authentication
- `POST /api/auth/telegram` - Validate Telegram login
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Feed
- `GET /api/feed?type=main&limit=20` - Get feed
- `GET /api/feed/nearby?lat=...&lon=...` - Nearby posts

### Posts
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like post

### Users
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update profile
- `GET /api/users/:id/posts` - Get user posts

## 🔮 Future (Phase 2 - Web3)

- Neynar integration for Farcaster
- Web3 login (Sign In With Neynar)
- Cross-posting to Farcaster
- NFT profile pictures
- Decentralized identity

## 📄 License

Private - PNPtv Team

## 🤝 Contributing

Contact the development team for contribution guidelines.
