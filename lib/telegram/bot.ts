interface TelegramMessage {
  chat_id: number | string
  text: string
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  reply_markup?: {
    inline_keyboard: Array<Array<{
      text: string
      url?: string
      callback_data?: string
    }>>
  }
}

export class TelegramBot {
  private botToken: string
  private apiUrl: string

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || ''
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`
  }

  async sendMessage(message: TelegramMessage): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      })

      const data = await response.json()
      return data.ok
    } catch (error) {
      console.error('Telegram send message error:', error)
      return false
    }
  }

  async notifyGatheringCreated(params: {
    chatId: number | string
    title: string
    date: string
    slots: number
    gatheringUrl: string
  }): Promise<boolean> {
    const text = `
🎮 <b>Новий збір: "${params.title}"</b>

📅 ${params.date}
👥 Місць: 0/${params.slots}

Поспішай зайняти своє місце!
    `.trim()

    return this.sendMessage({
      chat_id: params.chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🔥 Зайняти місце',
              url: params.gatheringUrl,
            },
          ],
        ],
      },
    })
  }

  async notifyGatheringAlmostFull(params: {
    chatId: number | string
    title: string
    currentSlots: number
    maxSlots: number
    gatheringUrl: string
  }): Promise<boolean> {
    const remaining = params.maxSlots - params.currentSlots

    const text = `
🔥 <b>Збір "${params.title}" майже заповнений!</b>

👥 ${params.currentSlots}/${params.maxSlots} місць зайнято
⚡ Залишилось: ${remaining} ${remaining === 1 ? 'місце' : 'місця'}

Встигни зайняти!
    `.trim()

    return this.sendMessage({
      chat_id: params.chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '⚡ Зайняти останнє місце',
              url: params.gatheringUrl,
            },
          ],
        ],
      },
    })
  }

  async notifyGatheringFull(params: {
    chatId: number | string
    title: string
    participants: string[]
    gatheringUrl: string
  }): Promise<boolean> {
    const participantsList = params.participants
      .map((name, index) => `${index + 1}. ${name}`)
      .join('\n')

    const text = `
✅ <b>Збір "${params.title}" укомплектований!</b>

👥 Учасники:
${participantsList}

Бажаєш приєднатися? Встань в чергу очікування!
    `.trim()

    return this.sendMessage({
      chat_id: params.chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📋 Встати в чергу',
              url: params.gatheringUrl,
            },
          ],
        ],
      },
    })
  }

  async notifySlotAvailable(params: {
    chatId: number | string
    userId: number
    title: string
    gatheringUrl: string
  }): Promise<boolean> {
    const text = `
🎉 <b>Место освободилось!</b>

Сбор: "${params.title}"

Ты был в очереди и теперь автоматически получил место!
Не забудь подтвердить свою участие.
    `.trim()

    return this.sendMessage({
      chat_id: params.userId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '👀 Посмотреть сбор',
              url: params.gatheringUrl,
            },
          ],
        ],
      },
    })
  }

  async sendActiveGatheringsList(params: {
    chatId: number | string
    gatherings: Array<{
      id: string
      title: string
      gathering_date: string
      slots_count: number
      max_slots: number
      creator?: { display_name?: string; telegram_username?: string }
    }>
    baseUrl: string
  }): Promise<boolean> {
    if (params.gatherings.length === 0) {
      const text = `
📭 <b>Активних зборів немає</b>

На даний момент немає активних зборів. Створи новий збір на сайті!
      `.trim()

      return this.sendMessage({
        chat_id: params.chatId,
        text,
        parse_mode: 'HTML',
      })
    }

    const text = `
🎮 <b>Активні збори (${params.gatherings.length})</b>

${params.gatherings.map((gathering, index) => {
      const date = new Date(gathering.gathering_date)
      const dateStr = date.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      const isFull = gathering.slots_count >= gathering.max_slots
      const creatorName = gathering.creator?.display_name || 'Невідомий'
      
      return `
${index + 1}. <b>${gathering.title}</b>
   📅 ${dateStr}
   👥 ${gathering.slots_count}/${gathering.max_slots} ${isFull ? '✅ Заповнено' : 'місць'}
   👤 Організатор: ${creatorName}
      `
    }).join('\n')}
    `.trim()

    // Створюємо кнопки для кожного збору
    const inlineKeyboard = params.gatherings.map((gathering) => [
      {
        text: `🔗 ${gathering.title.substring(0, 30)}${gathering.title.length > 30 ? '...' : ''}`,
        url: `${params.baseUrl}/?gathering=${gathering.id}`,
      },
    ])

    return this.sendMessage({
      chat_id: params.chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    })
  }
}

export const telegramBot = new TelegramBot()

