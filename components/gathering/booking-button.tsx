'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface BookingButtonProps {
  gatheringId: string
  isFull: boolean
  userHasSlot: boolean
  userInWaitlist: boolean
  currentUserId: string | null
}

export function BookingButton({
  gatheringId,
  isFull,
  userHasSlot,
  userInWaitlist,
  currentUserId,
}: BookingButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!currentUserId) {
    return (
      <Button onClick={() => router.push('/login')} className="w-full">
        Увійти щоб забронювати
      </Button>
    )
  }

  const handleBook = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gatherings/${gatheringId}/book`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Помилка бронювання')
      } else {
        router.refresh()
      }
    } catch (err) {
      setError('Помилка сервера')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnbook = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gatherings/${gatheringId}/book`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Помилка скасування')
      } else {
        router.refresh()
      }
    } catch (err) {
      setError('Помилка сервера')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinWaitlist = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gatherings/${gatheringId}/waitlist`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Помилка додавання в чергу')
      } else {
        router.refresh()
      }
    } catch (err) {
      setError('Помилка сервера')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLeaveWaitlist = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/gatherings/${gatheringId}/waitlist`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Помилка виходу з черги')
      } else {
        router.refresh()
      }
    } catch (err) {
      setError('Помилка сервера')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {userHasSlot ? (
        <Button
          onClick={handleUnbook}
          disabled={isLoading}
          variant="destructive"
          className="w-full"
        >
          {isLoading ? 'Скасування...' : 'Звільнити місце'}
        </Button>
      ) : isFull ? (
        userInWaitlist ? (
          <Button
            onClick={handleLeaveWaitlist}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? 'Вихід...' : 'Вийти з черги'}
          </Button>
        ) : (
          <Button
            onClick={handleJoinWaitlist}
            disabled={isLoading}
            variant="secondary"
            className="w-full"
          >
            {isLoading ? 'Додавання...' : 'Встати в чергу'}
          </Button>
        )
      ) : (
        <Button
          onClick={handleBook}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Бронювання...' : 'Зайняти місце'}
        </Button>
      )}
    </div>
  )
}

