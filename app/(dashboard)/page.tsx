import Link from 'next/link'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { GatheringCard } from '@/components/gathering/gathering-card'
import { getGatherings } from '@/lib/actions/gatherings'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const { gatherings, error } = await getGatherings()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Активные сборы</h2>
          <p className="text-muted-foreground mt-2">
            Выбери сбор и займи свое место <del>на параше</del>
          </p>
        </div>
        <Link href="/create">
          <Button size="lg">Создать сбор</Button>
        </Link>
      </div>

      {error && (
        <div className="text-center py-12 text-red-600">
          {error}
        </div>
      )}

      {!error && gatherings && gatherings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
             Пока еще никто не создал сбор
          </p>
          <Link href="/create" className="mt-4 inline-block">
            <Button>Создать первый сбор</Button>
          </Link>
        </div>
      )}

      {!error && gatherings && gatherings.length > 0 && (
        <Suspense fallback={<div>Загрузка...</div>}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gatherings.map((gathering) => (
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
  )
}

