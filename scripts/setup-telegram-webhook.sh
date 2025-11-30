#!/bin/bash

# Скрипт для налаштування Telegram Webhook
# Використання: ./scripts/setup-telegram-webhook.sh <BOT_TOKEN> <APP_URL>

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "❌ Помилка: Потрібні параметри"
  echo ""
  echo "Використання:"
  echo "  ./scripts/setup-telegram-webhook.sh <BOT_TOKEN> <APP_URL>"
  echo ""
  echo "Приклад:"
  echo "  ./scripts/setup-telegram-webhook.sh 123456789:ABCdefGHIjklMNOpqrsTUVwxyz https://myapp.vercel.app"
  echo ""
  exit 1
fi

BOT_TOKEN=$1
APP_URL=$2
WEBHOOK_URL="${APP_URL}/api/telegram/webhook"

echo "🔧 Налаштування Telegram Webhook..."
echo "📱 Bot Token: ${BOT_TOKEN:0:10}..."
echo "🌐 Webhook URL: ${WEBHOOK_URL}"
echo ""

# Перевірка чи URL доступний
echo "🔍 Перевірка доступності URL..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${WEBHOOK_URL}" -X POST -H "Content-Type: application/json" -d '{}')

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "405" ] && [ "$HTTP_CODE" != "500" ]; then
  echo "⚠️  Попередження: URL може бути недоступний (HTTP $HTTP_CODE)"
  echo "   Переконайтеся що додаток розгорнуто та доступний"
  echo ""
fi

# Налаштування webhook
echo "📤 Встановлення webhook..."
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Перевірка webhook
echo "✅ Перевірка налаштування webhook..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo")
echo "$WEBHOOK_INFO" | jq '.' 2>/dev/null || echo "$WEBHOOK_INFO"
echo ""

# Перевірка чи webhook встановлено успішно
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "✅ Webhook успішно налаштовано!"
  echo ""
  echo "🧪 Тестування:"
  echo "   1. Відкрийте Telegram"
  echo "   2. Знайдіть вашого бота"
  echo "   3. Напишіть /help"
  echo "   4. Бот має відповісти зі списком команд"
else
  echo "❌ Помилка при налаштуванні webhook"
  echo "   Перевірте токен бота та URL"
fi

