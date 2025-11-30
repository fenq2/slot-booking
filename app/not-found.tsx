import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-gray-900">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700">
          Сторінку не знайдено
        </h2>
        <p className="text-muted-foreground">
          Схоже, що ви потрапили на неіснуючу сторінку
        </p>
        <Link href="/">
          <Button size="lg">Повернутися на головну</Button>
        </Link>
      </div>
    </div>
  )
}

