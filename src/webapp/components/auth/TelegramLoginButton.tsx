'use client'

import { useEffect, useRef } from 'react'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface TelegramLoginButtonProps {
  botUsername: string
  onAuth: (user: TelegramUser) => void
  buttonSize?: 'large' | 'medium' | 'small'
  cornerRadius?: number
  requestAccess?: boolean
  lang?: string
}

declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth?: (user: TelegramUser) => void
    }
  }
}

export function TelegramLoginButton({
  botUsername,
  onAuth,
  buttonSize = 'large',
  cornerRadius,
  requestAccess = true,
  lang = 'en',
}: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackName = useRef(`telegramCallback_${Date.now()}_${Math.random().toString(36).substring(7)}`)

  useEffect(() => {
    if (!containerRef.current) return

    // Create unique callback function
    const funcName = callbackName.current
    ;(window as any)[funcName] = (user: TelegramUser) => {
      console.log('Telegram auth successful:', user)
      onAuth(user)
    }

    // Create script element
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', botUsername)
    script.setAttribute('data-size', buttonSize)
    script.setAttribute('data-onauth', `${funcName}(user)`)
    script.setAttribute('data-request-access', requestAccess ? 'write' : '')

    if (cornerRadius !== undefined) {
      script.setAttribute('data-radius', cornerRadius.toString())
    }

    if (lang) {
      script.setAttribute('data-lang', lang)
    }

    script.async = true

    // Clear container and append script
    containerRef.current.innerHTML = ''
    containerRef.current.appendChild(script)

    // Cleanup
    return () => {
      delete (window as any)[funcName]
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }
    }
  }, [botUsername, onAuth, buttonSize, cornerRadius, requestAccess, lang])

  return <div ref={containerRef} className="telegram-login-button" />
}
