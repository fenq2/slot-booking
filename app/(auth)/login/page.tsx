'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [nickname, setNickname] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nickname.trim()) {
      setError('Введіть нікнейм')
      return
    }

    if (nickname.trim().length < 2) {
      setError('Нікнейм має бути мінімум 2 символи')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/simple/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname: nickname.trim() }),
      })

      if (response.ok) {
        router.push('/')
        router.refresh()
      } else {
        const data = await response.json()
        setError(data.error || 'Помилка входу')
      }
    } catch (err) {
      setError('Помилка сервера')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Вход в хату</CardTitle>
          <CardDescription className="text-md">
            Организация сборов на игры
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nickname">Ваш никнейм <del>погоняло</del></Label>
              <Input
                id="nickname"
                type="text"
                placeholder="Введите никнейм"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={isLoading}
                autoFocus
                maxLength={50}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Вход...' : 'Вход'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
