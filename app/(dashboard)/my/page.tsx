import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getUserGatherings } from '@/lib/actions/gatherings'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { uk } from 'date-fns/locale'

export default async function MyGatheringsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { created, participating, error } = await getUserGatherings()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Мої збори</h1>
        <p className="text-muted-foreground mt-2">
          Збори, які ви створили або де берете участь
        </p>
      </div>

      {error && (
        <div className="text-center py-12 text-red-600">
          {error}
        </div>
      )}

      {!error && (
        <>
          {/* Створені збори */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Створені мною</h2>
              <Link href="/create">
                <Button>Створити новий</Button>
              </Link>
            </div>

            {created && created.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Ви ще не створили жодного збору
                </CardContent>
              </Card>
            )}

            {created && created.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {created.map((gathering) => {
                  const date = new Date(gathering.gathering_date)
                  const isPast = date < new Date()

                  return (
                    <Card key={gathering.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{gathering.title}</CardTitle>
                            <CardDescription>
                              {format(date, 'd MMMM yyyy, HH:mm', { locale: uk })}
                            </CardDescription>
                          </div>
                          <Badge variant={
                            gathering.status === 'open' ? 'default' : 
                            gathering.status === 'closed' ? 'secondary' : 
                            'destructive'
                          }>
                            {gathering.status === 'open' ? 'Відкритий' : 
                             gathering.status === 'closed' ? 'Закритий' : 
                             'Скасований'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Учасників:</span>
                          <Badge variant="outline">
                            {gathering.slots_count}/{gathering.max_slots}
                          </Badge>
                        </div>
                        {gathering.waitlist_count > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">В черзі:</span>
                            <Badge variant="secondary">
                              {gathering.waitlist_count}
                            </Badge>
                          </div>
                        )}
                        <Separator />
                        <Link href={`/gathering/${gathering.id}`}>
                          <Button variant="outline" className="w-full">
                            Переглянути
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          <Separator className="my-8" />

          {/* Збори де беру участь */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Беру участь</h2>

            {participating && participating.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Ви ще не берете участі в жодному зборі
                </CardContent>
              </Card>
            )}

            {participating && participating.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {participating.map((gathering) => {
                  const date = new Date(gathering.gathering_date)
                  const isPast = date < new Date()

                  return (
                    <Card key={gathering.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{gathering.title}</CardTitle>
                            <CardDescription>
                              {format(date, 'd MMMM yyyy, HH:mm', { locale: uk })}
                            </CardDescription>
                          </div>
                          <Badge variant={isPast ? 'secondary' : 'default'}>
                            {isPast ? 'Завершено' : 'Майбутній'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Учасників:</span>
                          <Badge variant="outline">
                            {gathering.slots_count}/{gathering.max_slots}
                          </Badge>
                        </div>
                        {gathering.creator && (
                          <div className="text-sm text-muted-foreground">
                            Організатор: {gathering.creator.display_name}
                          </div>
                        )}
                        <Separator />
                        <Link href={`/gathering/${gathering.id}`}>
                          <Button variant="outline" className="w-full">
                            Переглянути
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

