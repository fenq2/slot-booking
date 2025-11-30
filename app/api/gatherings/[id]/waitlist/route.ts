import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JoinWaitlistResponse } from '@/lib/supabase/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Додатися в чергу
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

    // Використовуємо RPC функцію
    const { data, error } = await (supabase as any)
      .rpc('join_waitlist', {
        p_gathering_id: gatheringId,
        p_user_id: user.id,
      })

    if (error) {
      console.error('Join waitlist error:', error)
      return NextResponse.json(
        { error: 'Помилка додавання в чергу' },
        { status: 500 }
      )
    }

    const result = data as JoinWaitlistResponse

    if (!result.success) {
      let errorMessage = 'Помилка додавання в чергу'
      
      switch (result.error) {
        case 'already_in_waitlist':
          errorMessage = 'Ви вже в черзі'
          break
        case 'already_has_slot':
          errorMessage = 'Ви вже маєте місце'
          break
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      position: result.position,
    })
  } catch (error) {
    console.error('Join waitlist error:', error)
    return NextResponse.json(
      { error: 'Помилка сервера' },
      { status: 500 }
    )
  }
}

// Вийти з черги
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

    // Отримуємо позицію користувача перед видаленням
    const { data: waitlistEntry } = await (supabase as any)
      .from('waitlist')
      .select('position')
      .eq('gathering_id', gatheringId)
      .eq('user_id', user.id)
      .single()

    if (!waitlistEntry) {
      return NextResponse.json(
        { error: 'Ви не в черзі' },
        { status: 400 }
      )
    }

    // Видаляємо з черги
    const { error: deleteError } = await supabase
      .from('waitlist')
      .delete()
      .eq('gathering_id', gatheringId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Leave waitlist error:', deleteError)
      return NextResponse.json(
        { error: 'Помилка виходу з черги' },
        { status: 500 }
      )
    }

    // Оновлюємо позиції інших людей в черзі
    const { error: updateError } = await (supabase as any)
      .from('waitlist')
      .update({ position: (supabase as any).sql`position - 1` })
      .eq('gathering_id', gatheringId)
      .gt('position', waitlistEntry.position)

    if (updateError) {
      console.error('Update waitlist positions error:', updateError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Leave waitlist error:', error)
    return NextResponse.json(
      { error: 'Помилка сервера' },
      { status: 500 }
    )
  }
}

