'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createGathering } from '@/lib/actions/gatherings'
import { createGatheringSchema, CreateGatheringInput } from '@/lib/utils/validation'

export default function CreateGatheringPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createGatheringSchema),
    defaultValues: {
      max_slots: 5,
      notify_telegram: true,
    },
  })

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Конвертуємо дату в Date об'єкт
      const gatheringData = {
        ...data,
        gathering_date: new Date(data.gathering_date),
        booking_deadline: data.booking_deadline ? new Date(data.booking_deadline) : undefined,
        max_slots: parseInt(data.max_slots),
      }

      const result = await createGathering(gatheringData)

      if (result.error) {
        setError(result.error)
      } else if (result.gathering) {
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError('Помилка створення збору')
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Новый сбор</CardTitle>
          <CardDescription>
            Новый сбор - новое поражение!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Название сбора *</Label>
              <Input
                id="title"
                placeholder="Не знающие побед"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gathering_date">Дата и время *</Label>
                <Input
                  id="gathering_date"
                  type="datetime-local"
                  {...register('gathering_date')}
                />
                {errors.gathering_date && (
                  <p className="text-sm text-red-600">{errors.gathering_date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_slots">Количество мест *</Label>
                <Input
                  id="max_slots"
                  type="number"
                  min="2"
                  max="100"
                  {...register('max_slots')}
                />
                {errors.max_slots && (
                  <p className="text-sm text-red-600">{errors.max_slots.message}</p>
                )}
              </div>
            </div>


            <div className="flex items-center space-x-2">
              <input
                id="notify_telegram"
                type="checkbox"
                className="rounded"
                {...register('notify_telegram')}
              />
              <Label htmlFor="notify_telegram" className="cursor-pointer">
                Отправить уведомление в Telegram
              </Label>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Создание...' : 'Создать сбор'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Отмена
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

