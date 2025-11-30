import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GatheringWithDetails } from '@/lib/supabase/types'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'

interface GatheringCardProps {
  gathering: GatheringWithDetails
}

export function GatheringCard({ gathering }: GatheringCardProps) {
  const slotsCount = gathering.slots_count || 0
  const isFull = slotsCount >= gathering.max_slots
  const date = new Date(gathering.gathering_date)

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
          <p className="text-sm text-muted-foreground">{gathering.description}</p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium">
              {format(date, 'd MMMM yyyy', { locale: uk })}
            </div>
            <div className="text-muted-foreground">
              {format(date, 'HH:mm')}
            </div>
          </div>
          
          <Link href={`/gathering/${gathering.id}`}>
            <Button variant={isFull ? 'outline' : 'default'}>
              {isFull ? 'Переглянути' : 'Зайняти місце'}
            </Button>
          </Link>
        </div>

        {isFull && (
          <div className="text-xs text-center text-amber-600 font-medium">
            Всі місця зайняті
          </div>
        )}
      </CardContent>
    </Card>
  )
}

