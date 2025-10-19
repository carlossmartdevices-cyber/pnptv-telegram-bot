import crypto from 'crypto'

export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

/**
 * Validate Telegram Login Widget authentication data
 *
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */
export function validateTelegramAuth(
  data: TelegramAuthData,
  botToken: string
): boolean {
  const { hash, ...dataWithoutHash } = data

  // Create data check string
  const dataCheckString = Object.keys(dataWithoutHash)
    .sort()
    .map((key) => `${key}=${dataWithoutHash[key as keyof typeof dataWithoutHash]}`)
    .join('\n')

  // Create secret key from bot token
  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  // Calculate hash
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  // Compare hashes
  return calculatedHash === hash
}

/**
 * Check if Telegram auth data is not too old
 * Default: 1 hour (3600 seconds)
 */
export function isAuthDataFresh(authDate: number, maxAge: number = 3600): boolean {
  const currentTimestamp = Math.floor(Date.now() / 1000)
  return currentTimestamp - authDate <= maxAge
}

/**
 * Validate Telegram auth data (hash + freshness)
 */
export function validateTelegramAuthComplete(
  data: TelegramAuthData,
  botToken: string,
  maxAge?: number
): { valid: boolean; error?: string } {
  // Validate hash
  if (!validateTelegramAuth(data, botToken)) {
    return {
      valid: false,
      error: 'Invalid authentication hash. Data may have been tampered with.',
    }
  }

  // Check freshness
  if (!isAuthDataFresh(data.auth_date, maxAge)) {
    return {
      valid: false,
      error: 'Authentication data is too old. Please try logging in again.',
    }
  }

  return { valid: true }
}
