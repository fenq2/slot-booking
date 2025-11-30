'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

declare global {
  interface Window {
    onTelegramAuth?: (user: any) => void
  }
}

export default function LoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Callback функція для Telegram Login Widget
    window.onTelegramAuth = async (user: any) => {
      try {
        const response = await fetch('/api/auth/telegram/callback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(user),
        })

        if (response.ok) {
          // Перенаправляємо на головну після успішного логіну
          router.push('/')
          router.refresh()
        } else {
          console.error('Login failed')
          alert('Помилка авторизації. Спробуйте ще раз.')
        }
      } catch (error) {
        console.error('Login error:', error)
        alert('Помилка авторизації. Спробуйте ще раз.')
      }
    }

    // Додаємо Telegram Login Widget script
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '')
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true

    const widgetContainer = document.getElementById('telegram-login-container')
    if (widgetContainer) {
      widgetContainer.appendChild(script)
    }

    return () => {
      if (widgetContainer && script.parentNode) {
        widgetContainer.removeChild(script)
      }
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Slot Booking</CardTitle>
          <CardDescription className="text-lg">
            Організація сборів на ігри
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Увійдіть через Telegram, щоб почати створювати та бронювати збори
            </p>
            <div id="telegram-login-container" className="flex justify-center" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

