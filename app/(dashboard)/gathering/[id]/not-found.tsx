import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Збір не знайдено</CardTitle>
          <CardDescription className="text-lg">
            Можливо він був видалений або посилання невірне
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/">
            <Button>Повернутися до списку сборів</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

