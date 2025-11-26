"use client";

import { useEffect, useState } from 'react';
import { TelegramWebApp } from '@/lib/telegram';

interface UserData {
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  tier?: string;
  xp?: number;
  badges?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  locationName?: string;
}

export default function HomePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isTelegramApp, setIsTelegramApp] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Telegram WebApp
    const initTelegramApp = () => {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        setIsTelegramApp(true);
        
        // Configure WebApp
        tg.ready();
        tg.expand();
        tg.enableClosingConfirmation();
        
        // Set theme
        tg.setHeaderColor('#667eea');
        tg.setBackgroundColor('#1a1a2e');
        
        // Get user data from Telegram
        const telegramUser = tg.initDataUnsafe?.user;
        if (telegramUser) {
          loadUserData(telegramUser.id.toString());
        }
        
        // Handle main button
        tg.MainButton.setText('Open Community');
        tg.MainButton.color = '#667eea';
        tg.MainButton.textColor = '#ffffff';
        tg.MainButton.onClick(() => {
          tg.sendData(JSON.stringify({ action: 'open_community' }));
        });
        
        setIsLoading(false);
      } else {
        // Desktop version
        setIsTelegramApp(false);
        setIsLoading(false);
      }
    };

    // Check if script is loaded
    if (typeof window !== 'undefined') {
      if (window.Telegram?.WebApp) {
        initTelegramApp();
      } else {
        // Wait for script to load
        const checkTelegram = setInterval(() => {
          if (window.Telegram?.WebApp) {
            clearInterval(checkTelegram);
            initTelegramApp();
          }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkTelegram);
          setIsTelegramApp(false);
          setIsLoading(false);
        }, 5000);
      }
    }
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleAction = (action: string, data?: any) => {
    if (isTelegramApp && window.Telegram?.WebApp) {
      window.Telegram.WebApp.sendData(JSON.stringify({ action, data }));
    } else {
      console.log('Action:', action, data);
    }
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          handleAction('update_location', location);
        },
        (error) => {
          console.error('Location error:', error);
        }
      );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isTelegramApp) {
    return <DesktopVersion />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80">
      {/* Header */}
      <header className="gradient-primary p-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-2xl">🎭</span>
          </div>
          <div>
            <h1 className="text-2xl font-headline font-bold">PNPtv</h1>
            <p className="text-white/80">Welcome back!</p>
          </div>
        </div>
      </header>

      {/* User Status */}
      {userData && (
        <div className="p-4">
          <div className="card-gradient p-4 rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">
                  {userData.firstName?.[0] || userData.username?.[0] || 'U'}
                </span>
              </div>
              <div>
                <h3 className="font-semibold">
                  {userData.firstName || userData.username || 'User'}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span className={`px-2 py-1 rounded-md text-xs ${
                    userData.tier === 'Premium' 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-muted/50'
                  }`}>
                    {userData.tier || 'Free'}
                  </span>
                  <span>•</span>
                  <span>{userData.xp || 0} XP</span>
                </div>
              </div>
            </div>
            
            {userData.badges && userData.badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {userData.badges.map((badge, index) => (
                  <span 
                    key={index}
                    className="text-xs px-2 py-1 rounded-full bg-special-accent/20 text-special-accent"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Actions */}
      <div className="p-4 space-y-4">
        <ActionCard
          icon="🗺️"
          title="Explore Map"
          description="Find nearby members"
          onClick={() => handleAction('show_map')}
        />
        
        <ActionCard
          icon="💬"
          title="Community Chat"
          description="Join the conversation"
          onClick={() => handleAction('show_community')}
        />
        
        <ActionCard
          icon="🎵"
          title="Music Library"
          description="Browse tracks and playlists"
          onClick={() => handleAction('show_library')}
        />
        
        <ActionCard
          icon="📅"
          title="Events"
          description="Upcoming community events"
          onClick={() => handleAction('show_events')}
        />
        
        <ActionCard
          icon="💎"
          title="Premium"
          description="Upgrade your experience"
          onClick={() => handleAction('show_subscriptions')}
        />
      </div>

      {/* Location Section */}
      <div className="p-4">
        <div className="card-gradient p-4 rounded-xl">
          <h3 className="font-semibold mb-3">Location Services</h3>
          {userData?.location ? (
            <div className="text-sm text-muted-foreground mb-3">
              📍 {userData.locationName || 'Location set'}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground mb-3">
              Enable location to find nearby members
            </div>
          )}
          <button
            onClick={requestLocation}
            className="btn-primary w-full"
          >
            {userData?.location ? 'Update Location' : 'Enable Location'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon, title, description, onClick }: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full card-gradient p-4 rounded-xl text-left hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </button>
  );
}

function DesktopVersion() {
  return (
    <div className="min-h-screen gradient-primary flex flex-col items-center justify-center text-white">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-4xl">🎭</span>
          </div>
          <h1 className="text-5xl font-headline font-bold mb-4">
            PNPtv Prime Hub
          </h1>
          <p className="text-xl text-white/90 mb-8">
            The largest PNP community online — safe, fun, and respectful.
          </p>
        </div>

        <div className="glass-effect rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            📱 Mobile Experience Available
          </h2>
          <p className="text-white/80 mb-6">
            For the full PNPtv experience with location services, community chat, 
            and premium features, please access through the Telegram bot.
          </p>
          <a
            href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`}
            className="inline-flex items-center px-6 py-3 bg-white text-primary rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            Open in Telegram
          </a>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-effect rounded-xl p-6">
            <div className="text-3xl mb-3">🗺️</div>
            <h3 className="font-semibold mb-2">Location Based</h3>
            <p className="text-sm text-white/70">
              Find and connect with nearby community members
            </p>
          </div>
          
          <div className="glass-effect rounded-xl p-6">
            <div className="text-3xl mb-3">💬</div>
            <h3 className="font-semibold mb-2">Safe Community</h3>
            <p className="text-sm text-white/70">
              Moderated spaces with verified members
            </p>
          </div>
          
          <div className="glass-effect rounded-xl p-6">
            <div className="text-3xl mb-3">💎</div>
            <h3 className="font-semibold mb-2">Premium Features</h3>
            <p className="text-sm text-white/70">
              Enhanced experience with exclusive access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}