'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GatheringWithDetails } from '@/lib/supabase/types'
import { GatheringCard } from './gathering-card'

interface RealtimeGatheringsListProps {
  initialGatherings: GatheringWithDetails[]
}

export function RealtimeGatheringsList({ initialGatherings }: RealtimeGatheringsListProps) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Підписуємось на зміни в сборах
    const channel = supabase
      .channel('gatherings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gatherings',
        },
        () => {
          // При будь-яких змінах оновлюємо список
          router.refresh()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slots',
        },
        () => {
          // При зміні слотів теж оновлюємо (для відображення кількості)
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router, supabase])

  if (initialGatherings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          Поки що немає активних сборів
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {initialGatherings.map((gathering) => (
        <GatheringCard key={gathering.id} gathering={gathering} />
      ))}
    </div>
  )
}

