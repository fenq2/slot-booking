# Налаштування Telegram Webhook

## Проблема: Бот не відповідає на команди

Якщо бот не відповідає на команди `/help` або `/list`, це означає що webhook не налаштований або не працює.

## Крок 1: Перевірка налаштувань

### 1.1. Перевірте Environment Variables

У вашому проекті (Vercel або локально) мають бути встановлені:

```
TELEGRAM_BOT_TOKEN=your-bot-token-here
NEXT_PUBLIC_APP_URL=https://yourdomain.vercel.app
```

### 1.2. Отримайте токен бота

1. Знайдіть [@BotFather](https://t.me/BotFather) в Telegram
2. Напишіть `/mybots`
3. Виберіть вашого бота
4. Скопіюйте токен

## Крок 2: Налаштування Webhook

### Для Production (Vercel):

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.vercel.app/api/telegram/webhook"}'
```

Замініть:
- `<YOUR_BOT_TOKEN>` на ваш токен бота
- `https://yourdomain.vercel.app` на ваш реальний URL

### Для Local Development:

Для локальної розробки потрібно використовувати ngrok або інший tunnel:

1. Встановіть ngrok:
```bash
npm install -g ngrok
```

2. Запустіть ngrok:
```bash
ngrok http 3000
```

3. Скопіюйте HTTPS URL (наприклад: `https://abc123.ngrok.io`)

4. Налаштуйте webhook:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://abc123.ngrok.io/api/telegram/webhook"}'
```

## Крок 3: Перевірка Webhook

### Перевірте чи webhook налаштований:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Ви маєте побачити щось на кшталт:
```json
{
  "ok": true,
  "result": {
    "url": "https://yourdomain.vercel.app/api/telegram/webhook",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### Видалення webhook (якщо потрібно):

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

## Крок 4: Перевірка логів

Після налаштування webhook:

1. Напишіть `/help` боту
2. Перевірте логи в Vercel Dashboard або локальній консолі
3. Ви маєте побачити логи типу:
   - `Telegram webhook received: ...`
   - `Processing message: ...`
   - `Sending help message to chat: ...`

## Крок 5: Діагностика проблем

### Проблема: Webhook не отримує запити

1. Перевірте чи URL правильний
2. Перевірте чи endpoint доступний (має повертати 200 OK)
3. Перевірте логи на помилки

### Проблема: Webhook отримує запити, але бот не відповідає

1. Перевірте чи `TELEGRAM_BOT_TOKEN` правильний
2. Перевірте логи на помилки від Telegram API
3. Перевірте чи бот не заблокований

### Проблема: "Webhook processing failed"

1. Перевірте логи на детальні помилки
2. Перевірте чи всі environment variables встановлені
3. Перевірте чи база даних доступна

## Корисні команди

### Отримати інформацію про бота:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
```

### Отримати оновлення (якщо не використовуєте webhook):
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
```

## Важливо

- Webhook потребує HTTPS (Vercel надає автоматично)
- Webhook URL має бути публічно доступним
- Після зміни webhook URL, Telegram може потребувати кілька секунд для оновлення

