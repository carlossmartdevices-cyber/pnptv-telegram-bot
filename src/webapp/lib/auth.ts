import type { TelegramUser } from '../components/auth/TelegramLoginButton'
import type { AuthResponse, User } from '../types'

const API_BASE_URL = process.env.NEXT_PUBLIC_BOT_URL || 'http://localhost:3000'

/**
 * Authenticate user with Telegram
 */
export async function authenticateWithTelegram(
  telegramData: TelegramUser
): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telegramData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Authentication failed')
    }

    const data: AuthResponse = await response.json()

    if (data.success && data.token) {
      // Store token in localStorage
      localStorage.setItem('authToken', data.token)

      // Store user data
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }
    }

    return data
  } catch (error) {
    console.error('Telegram auth error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    }
  }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const token = getAuthToken()
    if (!token) return null

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      // Token invalid or expired
      logout()
      return null
    }

    const data = await response.json()
    return data.user
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

/**
 * Logout user
 */
export async function logout() {
  try {
    const token = getAuthToken()

    if (token) {
      // Call logout endpoint to update server-side
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    }
  } catch (error) {
    console.error('Logout error:', error)
    // Continue with client-side logout even if server call fails
  } finally {
    // Clear client-side storage
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken()
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('authToken')
}

/**
 * Get stored user from localStorage
 */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null

  const userStr = localStorage.getItem('user')
  if (!userStr) return null

  try {
    return JSON.parse(userStr)
  } catch {
    return null
  }
}

/**
 * Validate auth token (client-side check)
 */
export function isTokenValid(token: string): boolean {
  try {
    // Basic JWT structure check
    const parts = token.split('.')
    if (parts.length !== 3) return false

    // Decode payload
    const payload = JSON.parse(atob(parts[1]))

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false
    }

    return true
  } catch {
    return false
  }
}
