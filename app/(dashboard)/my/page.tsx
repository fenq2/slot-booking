import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getUserGatherings } from '@/lib/actions/gatherings'
import { createClient } from '@/lib/supabase/server'
import { GatheringCard } from '@/components/gathering/gathering-card'

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
        <h1 className="text-3xl font-bold">Мои сборы</h1>
        <p className="text-muted-foreground mt-2">
          Сборы, которые вы создали или в которых участвуете
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
              <h2 className="text-2xl font-semibold">Созданные мной</h2>
              <Link href="/create">
                <Button>Создать новый</Button>
              </Link>
            </div>

            {created && created.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Вы еще не создали ни одного сбор
                </CardContent>
              </Card>
            )}

            {created && created.length > 0 && (
              <Suspense fallback={<div>Загрузка...</div>}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {created.map((gathering) => (
                    <GatheringCard
                      key={gathering.id}
                      gathering={gathering}
                      currentUserId={user?.id || null}
                    />
                  ))}
                </div>
              </Suspense>
            )}
          </div>

          <div className="my-8 border-t" />

          {/* Збори де беру участь */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Участвую</h2>

            {participating && participating.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Вы еще не участвуете ни в одном сбору
                </CardContent>
              </Card>
            )}

            {participating && participating.length > 0 && (
              <Suspense fallback={<div>Загрузка...</div>}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {participating.map((gathering) => (
                    <GatheringCard
                      key={gathering.id}
                      gathering={gathering}
                      currentUserId={user?.id || null}
                    />
                  ))}
                </div>
              </Suspense>
            )}
          </div>
        </>
      )}
    </div>
  )
}

