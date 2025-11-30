'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GatheringWithDetails } from '@/lib/supabase/types'

interface RealtimeGatheringProps {
  initialGathering: GatheringWithDetails
  children: (gathering: GatheringWithDetails) => React.ReactNode
}

export function RealtimeGathering({ initialGathering, children }: RealtimeGatheringProps) {
  const [gathering, setGathering] = useState(initialGathering)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Підписуємось на зміни в слотах
    const slotsChannel = supabase
      .channel(`gathering-slots-${gathering.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slots',
          filter: `gathering_id=eq.${gathering.id}`,
        },
        () => {
          // При будь-яких змінах в слотах оновлюємо сторінку
          router.refresh()
        }
      )
      .subscribe()

    // Підписуємось на зміни в черзі
    const waitlistChannel = supabase
      .channel(`gathering-waitlist-${gathering.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'waitlist',
          filter: `gathering_id=eq.${gathering.id}`,
        },
        () => {
          // При будь-яких змінах в черзі оновлюємо сторінку
          router.refresh()
        }
      )
      .subscribe()

    // Підписуємось на зміни самого збору
    const gatheringChannel = supabase
      .channel(`gathering-${gathering.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'gatherings',
          filter: `id=eq.${gathering.id}`,
        },
        () => {
          // При змінах статусу або інших полів оновлюємо сторінку
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(slotsChannel)
      supabase.removeChannel(waitlistChannel)
      supabase.removeChannel(gatheringChannel)
    }
  }, [gathering.id, router, supabase])

  return <>{children(gathering)}</>
}

