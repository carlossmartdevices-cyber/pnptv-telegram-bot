// User types
export interface User {
  userId: string
  telegramId?: number
  username?: string
  firstName?: string
  lastName?: string
  displayName: string
  photoUrl?: string
  bio?: string
  location?: {
    text: string
    coordinates?: {
      lat: number
      lon: number
    }
  }
  membership?: {
    tier: 'free' | 'prime' | 'premium'
    expiresAt?: Date | any
    autoRenew?: boolean
  }
  socialStats?: {
    posts: number
    followers: number
    following: number
  }
  settings?: {
    adsOptOut?: boolean
    language?: string
    notifications?: boolean
  }
  createdAt?: Date | any
  lastActive?: Date | any
  lastLoginWeb?: Date | any
}

// Post types
export interface Post {
  postId: string
  userId: string
  author: {
    userId: string
    displayName: string
    username?: string
    photoUrl?: string
  }
  content: string
  mediaUrls?: string[]
  location?: {
    text: string
    coordinates?: {
      lat: number
      lon: number
    }
  }
  visibility: 'public' | 'prime' | 'nearby'
  likes: number
  comments: number
  shares: number
  hasLiked?: boolean
  createdAt: Date
  updatedAt?: Date
}

// Comment types
export interface Comment {
  commentId: string
  postId: string
  userId: string
  author: {
    userId: string
    displayName: string
    username?: string
    photoUrl?: string
  }
  content: string
  likes: number
  hasLiked?: boolean
  createdAt: Date
}

// Feed types
export type FeedType = 'main' | 'nearby' | 'prime' | 'following' | 'profile'

export interface FeedParams {
  type: FeedType
  limit?: number
  cursor?: string
  userId?: string
  lat?: number
  lon?: number
  radius?: number
}

// Auth types
export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export interface AuthResponse {
  success: boolean
  token?: string
  user?: User
  error?: string
}

// Subscription types
export interface Plan {
  id: string
  name: string
  displayName: string
  price: number
  duration: number
  features: string[]
  icon: string
  description?: string
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
  total?: number
}
