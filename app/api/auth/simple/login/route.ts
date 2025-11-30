import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { Database } from '@/lib/supabase/types'

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

    // Створюємо Supabase client для API route з правильним обробником cookies
    const response = new NextResponse()
    
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Створюємо email з нікнейму (підтримка кирилиці через hash)
    // Використовуємо формат з плюсом для уникнення проблем з валідацією домену
    const createEmailFromNickname = (nick: string): string => {
      // Створюємо простий hash з нікнейму
      let hash = 0
      for (let i = 0; i < nick.length; i++) {
        const char = nick.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash // Convert to 32bit integer
      }
      // Використовуємо формат з плюсом: user+hash@example.com
      // Плюс дозволений в email адресах і допомагає уникнути проблем з валідацією
      // Якщо це не спрацює, можна використати домен проекту Supabase
      const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const domain = projectUrl.includes('supabase.co') 
        ? 'supabase.co' 
        : 'example.com'
      return `guest+${Math.abs(hash)}@${domain}`
    }
    
    let email = createEmailFromNickname(nickname.toLowerCase().trim())
    const password = 'guest-password-123' // Фіксований пароль для всіх гостей

    // Спробуємо залогінити існуючого користувача
    let signInResult = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    let user = signInResult.data.user

    // Якщо користувача не існує, створюємо нового
    if (signInResult.error || !user) {
      // Спробуємо створити користувача через signUp
      let signUpResult = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: nickname.trim(),
          },
          emailRedirectTo: undefined, // Не потрібен redirect для guest користувачів
        },
      })

      // Якщо помилка з email валідацією, спробуємо інший формат
      if (signUpResult.error && signUpResult.error.message.includes('invalid')) {
        console.log('Email validation failed, trying alternative format')
        // Створюємо альтернативний email з простішим форматом
        let altHash = 0
        for (let i = 0; i < nickname.length; i++) {
          const char = nickname.charCodeAt(i)
          altHash = ((altHash << 5) - altHash) + char
          altHash = altHash & altHash
        }
        const altEmail = `guest${Math.abs(altHash)}@test.local`
        signUpResult = await supabase.auth.signUp({
          email: altEmail,
          password,
          options: {
            data: {
              display_name: nickname.trim(),
            },
            emailRedirectTo: undefined,
          },
        })
        if (!signUpResult.error) {
          email = altEmail // Оновлюємо email для подальшого використання
        }
      }

      if (signUpResult.error) {
        console.error('Supabase auth signUp error:', signUpResult.error)
        return NextResponse.json(
          { error: `Помилка входу: ${signUpResult.error.message}. Спробуйте інший нікнейм.` },
          { status: 500 }
        )
      }

      user = signUpResult.data.user
      
      // Якщо user все ще null після signUp, це може бути проблема з email confirmation
      if (!user) {
        console.error('User is null after signUp, data:', signUpResult.data)
        // Спробуємо залогінитися знову після невеликої затримки
        await new Promise(resolve => setTimeout(resolve, 500))
        const retrySignIn = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (retrySignIn.data.user) {
          user = retrySignIn.data.user
        } else {
          return NextResponse.json(
            { error: 'Помилка створення користувача. Спробуйте інший нікнейм.' },
            { status: 500 }
          )
        }
      }
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
        created_at: new Date().toISOString(),
      } as any, {
        onConflict: 'id',
      })

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      // Не повертаємо помилку, бо користувач вже залогінений
      // Профіль може бути створений пізніше через trigger або вручну
    }

    // Перевіряємо що сесія встановлена
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('No session after login, user:', user?.id)
      return NextResponse.json(
        { error: 'Помилка створення сесії' },
        { status: 500 }
      )
    }

    // Створюємо JSON response з cookies (cookies вже встановлені через setAll в supabase client)
    const jsonResponse = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        display_name: nickname.trim(),
      },
    })

    // Копіюємо всі cookies з response (які встановлені Supabase через setAll)
    response.cookies.getAll().forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value)
    })

    return jsonResponse
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Помилка сервера' },
      { status: 500 }
    )
  }
}

