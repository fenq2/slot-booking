import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Slot } from '@/lib/supabase/types'

interface SlotWithUser extends Slot {
  user?: {
    id: string
    display_name: string
    telegram_username?: string | null
  }
}

interface SlotListProps {
  slots: SlotWithUser[]
  maxSlots: number
}

export function SlotList({ slots, maxSlots }: SlotListProps) {
  // Створюємо масив з усіма слотами (зайняті + вільні)
  const allSlots = Array.from({ length: maxSlots }, (_, i) => {
    const slotNumber = i + 1
    const slot = slots.find(s => s.slot_number === slotNumber)
    return { slotNumber, slot }
  })

  return (
    <div className="grid grid-cols-1 gap-2">
      {allSlots.map(({ slotNumber, slot }) => (
        <Card
          key={slotNumber}
          className={`p-3 ${slot ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant={slot ? 'default' : 'outline'}>
                #{slotNumber}
              </Badge>
              <div>
                {slot ? (
                  <>
                    <div className="font-medium">
                      {slot.user?.display_name || 'Невідомий'}
                    </div>
                    {slot.user?.telegram_username && (
                      <div className="text-xs text-muted-foreground">
                        @{slot.user.telegram_username}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground">Вільне місце</div>
                )}
              </div>
            </div>
            {slot && (
              <Badge variant="secondary" className="text-xs">
                Зайнято
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}

