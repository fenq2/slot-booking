import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WaitlistEntry } from '@/lib/supabase/types'

interface WaitlistWithUser extends WaitlistEntry {
  user?: {
    id: string
    display_name: string
    telegram_username?: string | null
  }
}

interface WaitlistDisplayProps {
  waitlist: WaitlistWithUser[]
}

export function WaitlistDisplay({ waitlist }: WaitlistDisplayProps) {
  if (waitlist.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Черга очікування</h3>
      <div className="grid grid-cols-1 gap-2">
        {waitlist.map((entry) => (
          <Card key={entry.id} className="p-3 bg-amber-50 border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-white">
                  #{entry.position}
                </Badge>
                <div>
                  <div className="font-medium">
                    {entry.user?.display_name || 'Невідомий'}
                  </div>
                  {entry.user?.telegram_username && (
                    <div className="text-xs text-muted-foreground">
                      @{entry.user.telegram_username}
                    </div>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                В черзі
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

