import { z } from 'zod'

export const createGatheringSchema = z.object({
  title: z.string().min(3, 'Назва має бути мінімум 3 символи').max(100, 'Назва занадто довга'),
  description: z.string().max(500, 'Опис занадто довгий').optional(),
  max_slots: z.string().or(z.number()).transform((val) => {
    const num = typeof val === 'string' ? parseInt(val, 10) : val
    if (isNaN(num) || num < 2 || num > 100) {
      throw new Error('Має бути число від 2 до 100')
    }
    return num
  }),
  gathering_date: z.string().min(1, 'Дата обов\'язкова').refine((dateStr) => {
    const date = new Date(dateStr)
    return date > new Date()
  }, {
    message: 'Дата має бути в майбутньому',
  }),
  booking_deadline: z.string().optional(),
  notify_telegram: z.boolean().optional(),
})

export type CreateGatheringInput = z.infer<typeof createGatheringSchema>

// Тип для server action (з Date об'єктами)
export type CreateGatheringData = {
  title: string
  description?: string
  max_slots: number
  gathering_date: Date
  booking_deadline?: Date
  notify_telegram?: boolean
}

export const updateGatheringSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  gathering_date: z.string().optional(),
  status: z.enum(['open', 'closed', 'cancelled']).optional(),
})

export type UpdateGatheringInput = z.infer<typeof updateGatheringSchema>

