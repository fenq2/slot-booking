# Виправлення помилки "Помилка входу"

## Проблема

При спробі увійти в додаток з'являється помилка "Помилка входу".

## Можливі причини та рішення

### 1. Email Confirmation увімкнено в Supabase Cloud

За замовчуванням Supabase Cloud вимагає підтвердження email. Для guest-авторизації це потрібно вимкнути.

**Рішення:**

1. Відкрийте ваш проект в [Supabase Dashboard](https://app.supabase.com)
2. Перейдіть в **Authentication** → **Settings**
3. Знайдіть секцію **Email Auth**
4. Вимкніть **"Enable email confirmations"**
5. Збережіть зміни

### 2. RLS політики блокують створення профілю

Перевірте чи правильно налаштовані RLS політики для таблиці `profiles`.

**Рішення:**

Запустіть міграцію `20240104000000_fix_foreign_keys_and_rls.sql` в SQL Editor Supabase.

### 3. Перевірка логів

Перевірте логи на продакшені (Vercel Dashboard) для детальної інформації про помилку.

**Що шукати в логах:**
- `Supabase auth signUp error:` - помилки при створенні користувача
- `Profile upsert error:` - помилки при створенні профілю
- `Login error:` - загальні помилки логіну

### 4. Перевірка Environment Variables

Переконайтеся що всі необхідні змінні встановлені:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (опційно)
```

### 5. Альтернативне рішення: Використати Service Role Key

Якщо проблема з RLS політиками, можна використати service_role key для створення профілю:

```typescript
// Створити окремий клієнт з service_role key для створення профілю
import { createClient as createServiceClient } from '@supabase/supabase-js'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

## Швидке виправлення

1. **Вимкніть email confirmation** в Supabase Dashboard
2. **Запустіть міграцію** `20240104000000_fix_foreign_keys_and_rls.sql`
3. **Перевірте логи** на помилки
4. **Спробуйте увійти знову**

## Якщо проблема залишається

1. Перевірте логи в Vercel Dashboard
2. Перевірте чи правильно налаштовані RLS політики
3. Перевірте чи всі environment variables встановлені
4. Спробуйте створити профіль вручну через SQL Editor для тестування

