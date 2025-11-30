import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GatheringCard } from '@/components/gathering/gathering-card'
import { getGatherings } from '@/lib/actions/gatherings'

export default async function HomePage() {
  const { gatherings, error } = await getGatherings()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Активні збори</h1>
          <p className="text-muted-foreground mt-2">
            Вибери збір і займи своє місце
          </p>
        </div>
        <Link href="/create">
          <Button size="lg">Створити збір</Button>
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
            Поки що немає активних сборів
          </p>
          <Link href="/create" className="mt-4 inline-block">
            <Button>Створити перший збір</Button>
          </Link>
        </div>
      )}

      {!error && gatherings && gatherings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gatherings.map((gathering) => (
            <GatheringCard key={gathering.id} gathering={gathering} />
          ))}
        </div>
      )}
    </div>
  )
}

