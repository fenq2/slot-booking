# Slot Booking MVP

Веб-додаток для організації сборів на ігри з фіксованою кількістю слотів.

## Технології

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Simple nickname-based authentication
- **Notifications**: Telegram Bot API (опційно)

## Локальний запуск

### 1. Встановлення залежностей

```bash
npm install
```

### 2. Налаштування Supabase

Встановіть Supabase CLI:

```bash
npm install -g supabase
```

Запустіть локальний Supabase:

```bash
supabase start
```

Після запуску скопіюйте API URL та anon key в `.env.local`.

### 3. Налаштування Telegram Bot (опційно)

Якщо хочете уведомлення в Telegram:

1. Створіть бота через [@BotFather](https://t.me/BotFather)
2. Отримайте токен бота
3. Додайте токен в `.env.local`

### 4. Environment змінні

Створіть файл `.env.local` (див. `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Опційно для Telegram уведомлень
TELEGRAM_BOT_TOKEN=your-bot-token
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Запуск проекту

```bash
npm run dev
```

Відкрийте [http://localhost:3000](http://localhost:3000)

## Структура проекту

```
/app
  /(auth)              # Авторизація
  /(dashboard)         # Основні сторінки
  /api                 # API routes
/lib
  /supabase           # Supabase клієнти
  /telegram           # Telegram бот
  /actions            # Server actions
  /utils              # Утиліти
/components
  /ui                 # shadcn компоненти
  /gathering          # Компоненти сборів
  /layout             # Layout компоненти
/supabase
  /migrations         # Міграції БД
```

## Функціонал

### MVP (v1)

- ✅ Створення збору
- ✅ Бронювання слотів
- ✅ Черга очікування
- ✅ Проста авторизація через нікнейм
- ✅ Telegram уведомлення
- ✅ Realtime оновлення
- ✅ Захист від race conditions

## Ліцензія

MIT
