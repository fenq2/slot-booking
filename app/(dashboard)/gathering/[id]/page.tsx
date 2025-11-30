import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getGatheringById } from '@/lib/actions/gatherings'
import { createClient } from '@/lib/supabase/server'
import { SlotList } from '@/components/gathering/slot-list'
import { WaitlistDisplay } from '@/components/gathering/waitlist-display'
import { BookingButton } from '@/components/gathering/booking-button'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'

interface GatheringPageProps {
  params: Promise<{ id: string }>
}

export default async function GatheringPage({ params }: GatheringPageProps) {
  const { id } = await params
  const { gathering, error } = await getGatheringById(id)

  if (error || !gathering) {
    notFound()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const date = new Date(gathering.gathering_date)
  const isFull = gathering.slots_count >= gathering.max_slots
  const userHasSlot = gathering.slots?.some(s => s.user_id === user?.id) || false
  const userInWaitlist = gathering.waitlist?.some(w => w.user_id === user?.id) || false

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold">{gathering.title}</h1>
          <p className="text-muted-foreground mt-2">
            Створив {gathering.creator?.display_name}
            {gathering.creator?.telegram_username && 
              ` (@${gathering.creator.telegram_username})`
            }
          </p>
        </div>
        <Badge variant={isFull ? 'secondary' : 'default'} className="text-lg px-4 py-2">
          {gathering.slots_count}/{gathering.max_slots}
        </Badge>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>Інформація про збір</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {gathering.description && (
            <div>
              <h3 className="font-medium mb-2">Опис</h3>
              <p className="text-muted-foreground">{gathering.description}</p>
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium mb-1">Дата та час</h3>
              <p className="text-muted-foreground">
                {format(date, 'd MMMM yyyy, HH:mm', { locale: uk })}
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-1">Статус</h3>
              <Badge variant={gathering.status === 'open' ? 'default' : 'secondary'}>
                {gathering.status === 'open' ? 'Відкритий' : 
                 gathering.status === 'closed' ? 'Закритий' : 'Скасований'}
              </Badge>
            </div>
          </div>

          {gathering.booking_deadline && (
            <>
              <Separator />
              <div>
                <h3 className="font-medium mb-1">Дедлайн бронювання</h3>
                <p className="text-muted-foreground text-sm">
                  {format(new Date(gathering.booking_deadline), 'd MMMM yyyy, HH:mm', { locale: uk })}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Booking Action */}
      {gathering.status === 'open' && (
        <BookingButton
          gatheringId={gathering.id}
          isFull={isFull}
          userHasSlot={userHasSlot}
          userInWaitlist={userInWaitlist}
          currentUserId={user?.id || null}
        />
      )}

      {/* Slots */}
      <Card>
        <CardHeader>
          <CardTitle>Учасники</CardTitle>
          <CardDescription>
            {gathering.slots_count} з {gathering.max_slots} місць зайнято
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SlotList slots={gathering.slots || []} maxSlots={gathering.max_slots} />
        </CardContent>
      </Card>

      {/* Waitlist */}
      {gathering.waitlist && gathering.waitlist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Черга очікування</CardTitle>
            <CardDescription>
              {gathering.waitlist.length} {gathering.waitlist.length === 1 ? 'людина' : 'людей'} в черзі
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WaitlistDisplay waitlist={gathering.waitlist} />
          </CardContent>
        </Card>
      )}

      {/* Share */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Поділитися</h3>
              <p className="text-sm text-muted-foreground">
                Скопіюй посилання та поділись з друзями
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href)
                alert('Посилання скопійовано!')
              }}
            >
              Копіювати посилання
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Back */}
      <div className="flex justify-center">
        <Link href="/">
          <Button variant="ghost">← Повернутися до списку</Button>
        </Link>
      </div>
    </div>
  )
}

