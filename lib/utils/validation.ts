import { z } from 'zod'

export const createGatheringSchema = z.object({
  title: z.string().min(3, 'Назва має бути мінімум 3 символи').max(100, 'Назва занадто довга'),
  description: z.string().max(500, 'Опис занадто довгий').optional(),
  max_slots: z.number().min(2, 'Мінімум 2 місця').max(100, 'Максимум 100 місць'),
  gathering_date: z.date().refine((date) => date > new Date(), {
    message: 'Дата має бути в майбутньому',
  }),
  booking_deadline: z.date().optional(),
  notify_telegram: z.boolean().default(false),
})

export type CreateGatheringInput = z.infer<typeof createGatheringSchema>

export const updateGatheringSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  gathering_date: z.date().refine((date) => date > new Date()).optional(),
  status: z.enum(['open', 'closed', 'cancelled']).optional(),
})

export type UpdateGatheringInput = z.infer<typeof updateGatheringSchema>

