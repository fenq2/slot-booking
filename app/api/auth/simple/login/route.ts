import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nickname } = body

    if (!nickname || nickname.trim().length < 2) {
      return NextResponse.json(
        { error: 'Нікнейм має бути мінімум 2 символи' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Створюємо email з нікнейму (підтримка кирилиці через hash)
    const createEmailFromNickname = (nick: string): string => {
      // Створюємо простий hash з нікнейму
      let hash = 0
      for (let i = 0; i < nick.length; i++) {
        const char = nick.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
      }
      return `guest${Math.abs(hash)}@guest.user`
    }
    
    const email = createEmailFromNickname(nickname.toLowerCase().trim())
    const password = 'guest-password-123' // Фіксований пароль для всіх гостей

    // Спробуємо залогінити існуючого користувача
    let signInResult = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    let user = signInResult.data.user

    // Якщо користувача не існує, створюємо нового
    if (signInResult.error) {
      const signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: nickname.trim(),
          },
        },
      })

      if (signUpResult.error) {
        console.error('Supabase auth error:', signUpResult.error)
        return NextResponse.json(
          { error: 'Помилка входу' },
          { status: 500 }
        )
      }

      user = signUpResult.data.user
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Помилка входу' },
        { status: 500 }
      )
    }

    // Оновлюємо або створюємо профіль
    const { error: profileError } = await (supabase as any)
      .from('profiles')
      .upsert({
        id: user.id,
        telegram_id: null,
        telegram_username: null,
        display_name: nickname.trim(),
      } as any)

    if (profileError) {
      console.error('Profile upsert error:', profileError)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        display_name: nickname.trim(),
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Помилка сервера' },
      { status: 500 }
    )
  }
}

