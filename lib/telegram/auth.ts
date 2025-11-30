import crypto from 'crypto'

export interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export function verifyTelegramAuth(data: TelegramUser, botToken: string): boolean {
  const { hash, ...authData } = data

  // Створюємо рядок для перевірки
  const checkString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key as keyof typeof authData]}`)
    .join('\n')

  // Створюємо secret key
  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  // Обчислюємо hash
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex')

  // Порівнюємо hashes
  return calculatedHash === hash
}

export function getTelegramDisplayName(user: TelegramUser): string {
  const parts = [user.first_name]
  if (user.last_name) {
    parts.push(user.last_name)
  }
  return parts.join(' ')
}

