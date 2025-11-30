import { NextRequest, NextResponse } from 'next/server'
import { telegramBot } from '@/lib/telegram/bot'

// API для відправки уведомлень
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return NextResponse.json(
        { error: 'Telegram bot не налаштований' },
        { status: 500 }
      )
    }

    let success = false

    switch (type) {
      case 'gathering_created':
        success = await telegramBot.notifyGatheringCreated(data)
        break

      case 'gathering_almost_full':
        success = await telegramBot.notifyGatheringAlmostFull(data)
        break

      case 'gathering_full':
        success = await telegramBot.notifyGatheringFull(data)
        break

      case 'slot_available':
        success = await telegramBot.notifySlotAvailable(data)
        break

      default:
        return NextResponse.json(
          { error: 'Unknown notification type' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success })
  } catch (error) {
    console.error('Telegram notify error:', error)
    return NextResponse.json(
      { error: 'Notification failed' },
      { status: 500 }
    )
  }
}

