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
🎉 <b>Місце звільнилось!</b>

Збір: "${params.title}"

Ти був в черзі і тепер автоматично отримав місце!
Не забудь підтвердити свою участь.
    `.trim()

    return this.sendMessage({
      chat_id: params.userId,
      text,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '👀 Переглянути збір',
              url: params.gatheringUrl,
            },
          ],
        ],
      },
    })
  }
}

export const telegramBot = new TelegramBot()

