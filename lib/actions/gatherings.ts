'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CreateGatheringInput } from '@/lib/utils/validation'
import { Gathering } from '@/lib/supabase/types'

export async function createGathering(data: CreateGatheringInput): Promise<
  | { error: string; success?: never; gathering?: never }
  | { success: true; gathering: Gathering; error?: never }
> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Необхідна авторизація' }
    }

    const { error, data: gathering } = await (supabase as any)
      .from('gatherings')
      .insert({
        title: data.title,
        description: data.description,
        max_slots: data.max_slots,
        gathering_date: data.gathering_date.toISOString(),
        booking_deadline: data.booking_deadline?.toISOString(),
        creator_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Create gathering error:', error)
      return { error: 'Помилка створення збору' }
    }

    // TODO: Відправити Telegram уведомлення якщо data.notify_telegram === true

    revalidatePath('/')
    return { success: true, gathering }
  } catch (error) {
    console.error('Create gathering error:', error)
    return { error: 'Помилка сервера' }
  }
}

export async function getGatherings() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await (supabase as any)
      .from('gatherings')
      .select(`
        *,
        creator:profiles!gatherings_creator_id_fkey(
          id,
          display_name,
          telegram_username
        ),
        slots(
          id,
          user:profiles!slots_user_id_fkey(
            id,
            display_name,
            telegram_username
          )
        )
      `)
      .eq('status', 'open')
      .gte('gathering_date', new Date().toISOString())
      .order('gathering_date', { ascending: true })

    if (error) {
      console.error('Get gatherings error:', error)
      return { error: 'Помилка завантаження сборів' }
    }

    // Додаємо обчислені поля
    const gatheringsWithDetails = (data as any[]).map((gathering: any) => ({
      ...gathering,
      slots_count: gathering.slots?.length || 0,
      is_full: (gathering.slots?.length || 0) >= gathering.max_slots,
    }))

    return { gatherings: gatheringsWithDetails }
  } catch (error) {
    console.error('Get gatherings error:', error)
    return { error: 'Помилка сервера' }
  }
}

export async function getGatheringById(id: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await (supabase as any)
      .from('gatherings')
      .select(`
        *,
        creator:profiles!gatherings_creator_id_fkey(
          id,
          display_name,
          telegram_username
        ),
        slots(
          id,
          slot_number,
          booked_at,
          user:profiles!slots_user_id_fkey(
            id,
            display_name,
            telegram_username
          )
        ),
        waitlist(
          id,
          position,
          joined_at,
          user:profiles!waitlist_user_id_fkey(
            id,
            display_name,
            telegram_username
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Get gathering error:', error)
      return { error: 'Збір не знайдено' }
    }

    // Сортуємо слоти та чергу
    const gathering: any = {
      ...data,
      slots: data.slots?.sort((a: any, b: any) => a.slot_number - b.slot_number) || [],
      waitlist: data.waitlist?.sort((a: any, b: any) => a.position - b.position) || [],
      slots_count: data.slots?.length || 0,
      is_full: (data.slots?.length || 0) >= data.max_slots,
    }

    return { gathering }
  } catch (error) {
    console.error('Get gathering error:', error)
    return { error: 'Помилка сервера' }
  }
}

export async function getUserGatherings() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Необхідна авторизація' }
    }

    // Збори створені користувачем
    const { data: created, error: createdError } = await (supabase as any)
      .from('gatherings')
      .select(`
        *,
        slots(id),
        waitlist(id)
      `)
      .eq('creator_id', user.id)
      .order('gathering_date', { ascending: false })

    // Збори де користувач бере участь
    const { data: participating, error: participatingError } = await (supabase as any)
      .from('slots')
      .select(`
        gathering:gatherings(
          *,
          creator:profiles!gatherings_creator_id_fkey(
            id,
            display_name,
            telegram_username
          ),
          slots(id)
        )
      `)
      .eq('user_id', user.id)

    if (createdError || participatingError) {
      console.error('Get user gatherings error:', createdError || participatingError)
      return { error: 'Помилка завантаження сборів' }
    }

    return {
      created: (created as any[])?.map((g: any) => ({
        ...g,
        slots_count: g.slots?.length || 0,
        waitlist_count: g.waitlist?.length || 0,
      })) || [],
      participating: (participating as any[])?.map((p: any) => ({
        ...p.gathering,
        slots_count: p.gathering.slots?.length || 0,
      })) || [],
    }
  } catch (error) {
    console.error('Get user gatherings error:', error)
    return { error: 'Помилка сервера' }
  }
}

