'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-red-600">Щось пішло не так</CardTitle>
          <CardDescription className="text-lg">
            Виникла помилка при обробці вашого запиту
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg text-sm text-red-600">
            {error.message || 'Невідома помилка'}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => reset()} className="flex-1">
              Спробувати ще раз
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'} className="flex-1">
              На головну
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

