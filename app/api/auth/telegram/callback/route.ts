import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTelegramAuth, getTelegramDisplayName, TelegramUser } from '@/lib/telegram/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const telegramData = body as TelegramUser

    // Перевірка підпису Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json(
        { error: 'Telegram bot не налаштований' },
        { status: 500 }
      )
    }

    if (!verifyTelegramAuth(telegramData, botToken)) {
      return NextResponse.json(
        { error: 'Невалідний Telegram auth' },
        { status: 401 }
      )
    }

    // Перевірка терміну дії (24 години)
    const authAge = Date.now() / 1000 - telegramData.auth_date
    if (authAge > 86400) {
      return NextResponse.json(
        { error: 'Auth токен застарів' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Створюємо або оновлюємо користувача через Supabase Auth
    // Використовуємо telegram_id як унікальний ідентифікатор
    const email = `${telegramData.id}@telegram.user`
    const password = crypto.randomUUID()

    // Спробуємо залогінити існуючого користувача
    let authResult = await supabase.auth.signInWithPassword({
      email,
      password: telegramData.id.toString(),
    })

    // Якщо користувача не існує, створюємо нового
    if (authResult.error) {
      authResult = await supabase.auth.signUp({
        email,
        password: telegramData.id.toString(),
        options: {
          data: {
            telegram_id: telegramData.id,
            telegram_username: telegramData.username,
            display_name: getTelegramDisplayName(telegramData),
          },
        },
      })
    }

    if (authResult.error) {
      console.error('Supabase auth error:', authResult.error)
      return NextResponse.json(
        { error: 'Помилка авторизації' },
        { status: 500 }
      )
    }

    const user = authResult.data.user

    // Оновлюємо або створюємо профіль
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user!.id,
        telegram_id: telegramData.id,
        telegram_username: telegramData.username || null,
        display_name: getTelegramDisplayName(telegramData),
      })

    if (profileError) {
      console.error('Profile upsert error:', profileError)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user!.id,
        display_name: getTelegramDisplayName(telegramData),
        telegram_username: telegramData.username,
      },
    })
  } catch (error) {
    console.error('Telegram auth error:', error)
    return NextResponse.json(
      { error: 'Помилка сервера' },
      { status: 500 }
    )
  }
}

