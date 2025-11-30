'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GatheringWithDetails } from '@/lib/supabase/types'
import { GatheringDetailsModal } from './gathering-details-modal'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'

interface GatheringCardProps {
  gathering: GatheringWithDetails
  currentUserId: string | null
}

export function GatheringCard({ gathering: initialGathering, currentUserId }: GatheringCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gatheringIdFromUrl = searchParams.get('gathering')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [gathering, setGathering] = useState(initialGathering)

  // Синхронізуємо gathering з пропсами коли вони змінюються
  useEffect(() => {
    setGathering(initialGathering)
  }, [initialGathering])

  // Відкриваємо модальне вікно якщо в URL є параметр gathering
  useEffect(() => {
    if (gatheringIdFromUrl === initialGathering.id) {
      setIsModalOpen(true)
    }
  }, [gatheringIdFromUrl, initialGathering.id])

  // Оновлюємо URL коли модальне вікно відкривається/закривається
  const handleModalOpenChange = (open: boolean) => {
    setIsModalOpen(open)
    if (open) {
      // Додаємо параметр до URL
      const params = new URLSearchParams(searchParams.toString())
      params.set('gathering', initialGathering.id)
      router.push(`?${params.toString()}`, { scroll: false })
    } else {
      // Видаляємо параметр з URL
      const params = new URLSearchParams(searchParams.toString())
      params.delete('gathering')
      const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
      router.push(newUrl, { scroll: false })
    }
  }

  // Оновлюємо дані коли модальне вікно закривається після операцій
  useEffect(() => {
    if (!isModalOpen) {
      // Завантажуємо оновлені дані
      const fetchUpdatedGathering = async () => {
        try {
          const res = await fetch(`/api/gatherings/${initialGathering.id}`)
          const data = await res.json()
          if (data.gathering) {
            setGathering(data.gathering)
          }
        } catch (err) {
          console.error('Error fetching updated gathering:', err)
        }
      }
      fetchUpdatedGathering()
    }
  }, [isModalOpen, initialGathering.id])
  const slotsCount = gathering.slots_count || 0
  const isFull = slotsCount >= gathering.max_slots
  const date = new Date(gathering.gathering_date)
  const participants = gathering.slots || []

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{gathering.title}</CardTitle>
            <CardDescription className="mt-1">
              {gathering.creator?.display_name}
              {gathering.creator?.telegram_username && 
                ` (@${gathering.creator.telegram_username})`
              }
            </CardDescription>
          </div>
          <Badge variant={isFull ? 'secondary' : 'default'}>
            {slotsCount}/{gathering.max_slots}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {gathering.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{gathering.description}</p>
        )}

        {/* Список участников */}
        {participants.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Участники:</div>
            <div className="flex flex-wrap gap-2">
              {participants.map((slot: any, index: number) => (
                <div
                  key={slot.id || index}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full text-xs"
                >
                  <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px] font-semibold">
                    {slot.user?.display_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="font-medium text-green-900">
                    {slot.user?.display_name || 'Неизвестный'}
                  </span>
                </div>
              ))}
              {slotsCount < gathering.max_slots && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs text-muted-foreground">
                  + {gathering.max_slots - slotsCount} свободных
                </div>
              )}
            </div>
          </div>
        )}

        {participants.length === 0 && (
          <div className="text-sm text-muted-foreground italic py-2">
            Пока никто не записался
          </div>
        )}
        
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm">
            <div className="font-medium">
              {format(date, 'd MMMM yyyy', { locale: uk })}
            </div>
            <div className="text-muted-foreground">
              {format(date, 'HH:mm')}
            </div>
          </div>
          
          <Button 
            variant={isFull ? 'outline' : 'default'}
            onClick={() => handleModalOpenChange(true)}
          >
            {isFull ? 'Подробнее' : 'Занять место'}
          </Button>
        </div>

        {isFull && (
          <div className="text-xs text-center text-amber-600 font-medium">
            Все места заняты
          </div>
        )}
      </CardContent>

      <GatheringDetailsModal
        gathering={gathering}
        currentUserId={currentUserId}
        open={isModalOpen}
        onOpenChange={handleModalOpenChange}
      />
    </Card>
  )
}

