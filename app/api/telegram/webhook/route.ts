import { NextRequest, NextResponse } from 'next/server'
import { telegramBot } from '@/lib/telegram/bot'
import { getActiveGatheringsForBot } from '@/lib/actions/gatherings'

// Webhook для отримання повідомлень від Telegram бота
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Перевіряємо що це повідомлення
    if (!body.message) {
      return NextResponse.json({ ok: true })
    }

    const message = body.message
    const chatId = message.chat.id
    const text = message.text
    const chatType = message.chat.type // 'private', 'group', 'supergroup'

    // Обробляємо команди
    if (text?.startsWith('/')) {
      const command = text.split(' ')[0].toLowerCase()

      switch (command) {
        case '/start':
        case '/help': {
          const helpText = `
🎮 <b>Ласкаво просимо до FastCup Booking Bot!</b>

<b>Доступні команди:</b>
/list або /active - Показати активні збори
/help - Показати цю довідку

Бот працює в особистих чатах та групах. Додай бота в групу, щоб отримувати сповіщення про нові збори!
          `.trim()

          await telegramBot.sendMessage({
            chat_id: chatId,
            text: helpText,
            parse_mode: 'HTML',
          })
          break
        }

        case '/list':
        case '/active': {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fastcup-booking.vercel.app'
          const { gatherings, error } = await getActiveGatheringsForBot()

          if (error) {
            await telegramBot.sendMessage({
              chat_id: chatId,
              text: `❌ Помилка: ${error}`,
            })
            break
          }

          await telegramBot.sendActiveGatheringsList({
            chatId,
            gatherings: gatherings || [],
            baseUrl,
          })
          break
        }

        default: {
          await telegramBot.sendMessage({
            chat_id: chatId,
            text: '❓ Невідома команда. Використай /help для списку команд.',
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

