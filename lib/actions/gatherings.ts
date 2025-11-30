'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CreateGatheringData } from '@/lib/utils/validation'
import { Gathering } from '@/lib/supabase/types'

export async function createGathering(data: CreateGatheringData): Promise<
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
          slot_number,
          user_id,
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
      slots: gathering.slots?.sort((a: any, b: any) => a.slot_number - b.slot_number) || [],
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
        creator:profiles!gatherings_creator_id_fkey(
          id,
          display_name,
          telegram_username
        ),
        slots(
          id,
          slot_number,
          user_id,
          user:profiles!slots_user_id_fkey(
            id,
            display_name,
            telegram_username
          )
        ),
        waitlist(
          id,
          position,
          user:profiles!waitlist_user_id_fkey(
            id,
            display_name,
            telegram_username
          )
        )
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
          slots(
            id,
            slot_number,
            user_id,
            user:profiles!slots_user_id_fkey(
              id,
              display_name,
              telegram_username
            )
          )
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
        slots: g.slots?.sort((a: any, b: any) => a.slot_number - b.slot_number) || [],
        waitlist: g.waitlist?.sort((a: any, b: any) => a.position - b.position) || [],
        slots_count: g.slots?.length || 0,
        waitlist_count: g.waitlist?.length || 0,
      })) || [],
      participating: (participating as any[])?.map((p: any) => ({
        ...p.gathering,
        slots: p.gathering.slots?.sort((a: any, b: any) => a.slot_number - b.slot_number) || [],
        slots_count: p.gathering.slots?.length || 0,
      })) || [],
    }
  } catch (error) {
    console.error('Get user gatherings error:', error)
    return { error: 'Помилка сервера' }
  }
}

export async function deleteGathering(gatheringId: string): Promise<
  | { error: string; success?: never }
  | { success: true; error?: never }
> {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Необхідна авторизація' }
    }

    // Перевіряємо що користувач є створювачем
    const { data: gathering } = await (supabase as any)
      .from('gatherings')
      .select('creator_id')
      .eq('id', gatheringId)
      .single()

    if (!gathering) {
      return { error: 'Збір не знайдено' }
    }

    if (gathering.creator_id !== user.id) {
      return { error: 'Тільки створювач може видалити збір' }
    }

    // Видаляємо збір (слоти та waitlist видаляться автоматично через CASCADE)
    const { error } = await (supabase as any)
      .from('gatherings')
      .delete()
      .eq('id', gatheringId)

    if (error) {
      console.error('Delete gathering error:', error)
      return { error: 'Помилка видалення збору' }
    }

    revalidatePath('/')
    revalidatePath('/my')
    return { success: true }
  } catch (error) {
    console.error('Delete gathering error:', error)
    return { error: 'Помилка сервера' }
  }
}

// Функція для отримання активних зборів без авторизації (для Telegram бота)
export async function getActiveGatheringsForBot() {
  try {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const { Database } = await import('@/lib/supabase/types')
    
    const supabase = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await (supabase as any)
      .from('gatherings')
      .select(`
        id,
        title,
        gathering_date,
        max_slots,
        creator:profiles!gatherings_creator_id_fkey(
          display_name,
          telegram_username
        ),
        slots(id)
      `)
      .eq('status', 'open')
      .gte('gathering_date', new Date().toISOString())
      .order('gathering_date', { ascending: true })
      .limit(10)

    if (error) {
      console.error('Get active gatherings for bot error:', error)
      return { error: 'Помилка завантаження сборів' }
    }

    // Обчислюємо кількість зайнятих місць
    const gatheringsWithDetails = (data as any[]).map((gathering: any) => ({
      id: gathering.id,
      title: gathering.title,
      gathering_date: gathering.gathering_date,
      max_slots: gathering.max_slots,
      slots_count: gathering.slots?.length || 0,
      creator: gathering.creator,
    }))

    return { gatherings: gatheringsWithDetails }
  } catch (error) {
    console.error('Get active gatherings for bot error:', error)
    return { error: 'Помилка сервера' }
  }
}

