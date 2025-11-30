import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BookSlotResponse } from '@/lib/supabase/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Бронювання слоту
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: gatheringId } = await context.params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Необхідна авторизація' },
        { status: 401 }
      )
    }

    // Використовуємо RPC функцію для безпечного бронювання
    const { data, error } = await supabase
      .rpc('book_slot', {
        p_gathering_id: gatheringId,
        p_user_id: user.id,
      })

    if (error) {
      console.error('Book slot error:', error)
      return NextResponse.json(
        { error: 'Помилка бронювання' },
        { status: 500 }
      )
    }

    const result = data as BookSlotResponse

    if (!result.success) {
      let errorMessage = 'Помилка бронювання'
      
      switch (result.error) {
        case 'gathering_not_available':
          errorMessage = 'Збір недоступний для бронювання'
          break
        case 'already_booked':
          errorMessage = 'Ви вже забронювали місце'
          break
        case 'no_slots_available':
          errorMessage = 'Всі місця зайняті'
          break
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    // TODO: Відправити Telegram уведомлення якщо збір майже заповнений або повністю заповнений

    return NextResponse.json({
      success: true,
      slot_number: result.slot_number,
    })
  } catch (error) {
    console.error('Book slot error:', error)
    return NextResponse.json(
      { error: 'Помилка сервера' },
      { status: 500 }
    )
  }
}

// Скасування бронювання
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id: gatheringId } = await context.params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Необхідна авторизація' },
        { status: 401 }
      )
    }

    // Видаляємо слот користувача
    const { error } = await supabase
      .from('slots')
      .delete()
      .eq('gathering_id', gatheringId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Delete slot error:', error)
      return NextResponse.json(
        { error: 'Помилка скасування бронювання' },
        { status: 500 }
      )
    }

    // Trigger автоматично просуне когось з черги

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete slot error:', error)
    return NextResponse.json(
      { error: 'Помилка сервера' },
      { status: 500 }
    )
  }
}

