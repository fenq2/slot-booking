# Production Deployment

## Коротка інструкція для деплою на Vercel + Supabase Cloud

### 1. Supabase Cloud

1. Зареєструйтесь на [supabase.com](https://supabase.com)
2. Створіть новий проект
3. В SQL Editor запустіть міграцію з `supabase/migrations/20240101000000_initial_schema.sql`
4. В Settings → API отримайте:
   - Project URL
   - anon (public) key
   - service_role key

### 2. Telegram Bot для Production

1. В BotFather налаштуйте домен вашого production сайту
   ```
   /setdomain
   Виберіть бота
   Введіть: yourdomain.com
   ```

### 3. Vercel

1. Зареєструйтесь на [vercel.com](https://vercel.com)
2. Підключіть GitHub репозиторій
3. Додайте Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   TELEGRAM_BOT_TOKEN=your-bot-token
   TELEGRAM_BOT_USERNAME=your_bot_username
   NEXT_PUBLIC_TELEGRAM_BOT_ID=your-bot-id
   NEXT_PUBLIC_APP_URL=https://yourdomain.vercel.app
   ```
4. Deploy!

### 4. Налаштування Telegram Webhook

Після деплою налаштуйте webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.vercel.app/api/telegram/webhook"}'
```

### 5. Тестування

1. Відкрийте ваш production URL
2. Залогіньтесь через Telegram
3. Створіть тестовий збір
4. Перевірте що все працює

## Важливі примітки

- Supabase безкоштовний tier має ліміти (500MB DB, 2GB bandwidth)
- Vercel безкоштовний план підходить для MVP
- Telegram webhook потребує HTTPS (Vercel надає автоматично)
- RLS політики обов'язково перевірте перед production

## Моніторинг

Рекомендовано додати:
- [Sentry](https://sentry.io) для error tracking
- [Vercel Analytics](https://vercel.com/analytics) для метрик
- Supabase Dashboard для моніторингу БД

## Backup

Налаштуйте регулярний backup в Supabase Dashboard:
- Settings → Database → Point in time recovery (платна опція)
- Або weekly pg_dump через CLI

## Масштабування

Якщо проект виросте:
1. Upgrade Supabase plan для більшої БД
2. Додайте CDN для static assets
3. Оптимізуйте SQL запити з індексами
4. Розгляньте read replicas для БД

