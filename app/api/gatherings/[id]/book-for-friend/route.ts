import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { BookSlotResponse } from '@/lib/supabase/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: gatheringId } = await context.params
    const body = await request.json()
    const { friendNickname, slotNumber } = body

    if (!friendNickname || friendNickname.trim().length < 2) {
      return NextResponse.json(
        { error: 'Нікнейм має бути мінімум 2 символи' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Перевіряємо що поточний користувач авторизований
    const { data: { user: currentUser }, error: currentUserError } = await supabase.auth.getUser()
    if (!currentUser || currentUserError) {
      return NextResponse.json(
        { error: 'Необхідна авторизація' },
        { status: 401 }
      )
    }

    // Зберігаємо поточну сесію для відновлення після створення користувача друга
    const { data: { session: originalSession } } = await supabase.auth.getSession()

    // Створюємо або знаходимо друга
    // Використовуємо hash для підтримки кирилиці
    const createEmailFromNickname = (nickname: string): string => {
      // Створюємо простий hash з нікнейму
      let hash = 0
      for (let i = 0; i < nickname.length; i++) {
        const char = nickname.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
      }
      return `guest${Math.abs(hash)}@guest.user`
    }
    
    const friendEmail = createEmailFromNickname(friendNickname.toLowerCase().trim())
    const friendPassword = 'guest-password-123'
    
    // Спробуємо залогінити існуючого користувача
    let signInResult = await supabase.auth.signInWithPassword({
      email: friendEmail,
      password: friendPassword,
    })

    let friendUser = signInResult.data.user

    // Якщо користувача не існує, створюємо нового
    if (signInResult.error) {
      const signUpResult = await supabase.auth.signUp({
        email: friendEmail,
        password: friendPassword,
        options: {
          data: {
            display_name: friendNickname.trim(),
          },
        },
      })

      if (signUpResult.error) {
        console.error('Friend signup error:', signUpResult.error)
        // Відновлюємо оригінальну сесію
        if (originalSession) {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          })
        }
        return NextResponse.json(
          { error: 'Ошибка создания пользователя для кореша' },
          { status: 500 }
        )
      }

      friendUser = signUpResult.data.user
    }

    if (!friendUser) {
      // Відновлюємо оригінальну сесію
      if (originalSession) {
        await supabase.auth.setSession({
          access_token: originalSession.access_token,
          refresh_token: originalSession.refresh_token,
        })
      }
      return NextResponse.json(
        { error: 'Ошибка создания пользователя' },
        { status: 500 }
      )
    }

    // Окремий клієнт не змінює cookies основного клієнта,
    // тому поточна сесія залишається незмінною

    // Оновлюємо або створюємо профіль друга
    const { error: profileError } = await (supabase as any)
      .from('profiles')
      .upsert({
        id: friendUser.id,
        telegram_id: null,
        telegram_username: null,
        display_name: friendNickname.trim(),
      } as any)

    if (profileError) {
      console.error('Friend profile upsert error:', profileError)
    }

    // Бронюємо слот для друга
    let finalSlotNumber: number | undefined

    if (slotNumber) {
      // Якщо вказано конкретний номер слота - перевіряємо і бронюємо його
      const { data: gathering } = await supabase
        .from('gatherings')
        .select('max_slots, status, booking_deadline')
        .eq('id', gatheringId)
        .single()

      if (!gathering) {
        if (originalSession) {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          })
        }
        return NextResponse.json(
          { error: 'Сбор не найден' },
          { status: 404 }
        )
      }

      if ((gathering as any).status !== 'open') {
        if (originalSession) {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          })
        }
        return NextResponse.json(
          { error: 'Сбор недоступен для бронирования' },
          { status: 400 }
        )
      }

      if (slotNumber < 1 || slotNumber > (gathering as any).max_slots) {
        if (originalSession) {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          })
        }
        return NextResponse.json(
          { error: 'Неверный номер слота' },
          { status: 400 }
        )
      }

      // Перевіряємо чи слот вже зайнятий
      const { data: existingSlot } = await supabase
        .from('slots')
        .select('id')
        .eq('gathering_id', gatheringId)
        .eq('slot_number', slotNumber)
        .single()

      if (existingSlot) {
        if (originalSession) {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          })
        }
        return NextResponse.json(
          { error: 'Это место уже занято' },
          { status: 400 }
        )
      }

      // Перевіряємо чи друг вже має слот
      const { data: friendSlot } = await supabase
        .from('slots')
        .select('id')
        .eq('gathering_id', gatheringId)
        .eq('user_id', friendUser.id)
        .single()

      if (friendSlot) {
        if (originalSession) {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          })
        }
        return NextResponse.json(
          { error: 'Этот кореш уже имеет место' },
          { status: 400 }
        )
      }

      // Бронюємо конкретний слот
      const { error: insertError } = await (supabase as any)
        .from('slots')
        .insert({
          gathering_id: gatheringId,
          user_id: friendUser.id,
          slot_number: slotNumber,
        })

      if (insertError) {
        console.error('Book slot for friend error:', insertError)
        if (originalSession) {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          })
        }
        return NextResponse.json(
          { error: 'Ошибка бронирования' },
          { status: 500 }
        )
      }

      finalSlotNumber = slotNumber
    } else {
      // Якщо номер не вказано - використовуємо стандартну функцію
      const { data, error } = await (supabase as any)
        .rpc('book_slot', {
          p_gathering_id: gatheringId,
          p_user_id: friendUser.id,
        })

      if (error) {
        console.error('Book slot for friend error:', error)
        if (originalSession) {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          })
        }
        return NextResponse.json(
          { error: 'Ошибка бронирования' },
          { status: 500 }
        )
      }

      const result = data as BookSlotResponse

      if (!result.success) {
        let errorMessage = 'Ошибка бронирования'
        
        switch (result.error) {
          case 'gathering_not_available':
            errorMessage = 'Сбор недоступен для бронирования'
            break
          case 'already_booked':
            errorMessage = 'Этот кореш уже имеет место'
            break
          case 'no_slots_available':
            errorMessage = 'Все места заняты'
            break
        }

        if (originalSession) {
          await supabase.auth.setSession({
            access_token: originalSession.access_token,
            refresh_token: originalSession.refresh_token,
          })
        }
        return NextResponse.json(
          { error: errorMessage },
          { status: 400 }
        )
      }

      finalSlotNumber = result.slot_number
    }

    if (finalSlotNumber === undefined) {
      // Відновлюємо оригінальну сесію
      if (originalSession) {
        await supabase.auth.setSession({
          access_token: originalSession.access_token,
          refresh_token: originalSession.refresh_token,
        })
      }
      return NextResponse.json(
        { error: 'Ошибка определения номера слота' },
        { status: 500 }
      )
    }

    // Відновлюємо оригінальну сесію перед поверненням успішного результату
    if (originalSession) {
      await supabase.auth.setSession({
        access_token: originalSession.access_token,
        refresh_token: originalSession.refresh_token,
      })
    }

    return NextResponse.json({
      success: true,
      slot_number: finalSlotNumber,
      friend_name: friendNickname.trim(),
    })
  } catch (error) {
    console.error('Book for friend error:', error)
    // Відновлюємо оригінальну сесію в разі помилки
    try {
      const supabase = await createClient()
      const { data: { session: originalSession } } = await supabase.auth.getSession()
      if (originalSession) {
        await supabase.auth.setSession({
          access_token: originalSession.access_token,
          refresh_token: originalSession.refresh_token,
        })
      }
    } catch (sessionError) {
      console.error('Error restoring session:', sessionError)
    }
    return NextResponse.json(
      { error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

