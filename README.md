# Finansy — веб-версия

Веб-версия приложения учёта расходов и доходов (порт iOS-приложения Finansy).
Стек: **React 19 + TypeScript + Vite**, бэкенд и БД — **Supabase** (Postgres + Auth + RLS).

Формат использования: PWA (ставится на домашний экран iPhone) + обычный сайт в браузере.
Единый общий аккаунт (данные видят одни и те же у автора и его жены).

## Быстрый старт (локально)

```bash
npm install
cp .env.example .env.local   # и подставь значения из Supabase
npm run dev
```

Приложение откроется на `http://localhost:5173`.

## Подключение Supabase

1. Создай бесплатный проект на [supabase.com](https://supabase.com).
2. Открой **SQL Editor** и выполни целиком файл [`supabase/schema.sql`](./supabase/schema.sql) —
   он создаст таблицы, индексы и Row Level Security.
3. **Отключи публичную регистрацию** (чтобы посторонние не могли завести аккаунт):
   *Authentication → Sign In / Providers → Email → отключи "Enable email confirmations" по желанию,
   а главное — не давай клиенту метод `signUp`. В этом приложении есть только вход (`signInWithPassword`),
   поэтому зарегистрироваться через сайт нельзя.*
4. Создай общий аккаунт: *Authentication → Users → Add user → Create new user* (email + пароль).
5. Скопируй ключи: *Project Settings → API* → `Project URL` и `publishable` key
   (раньше назывался anon key).
6. Вставь их в `.env.local`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

## Безопасность

- Все таблицы под **Row Level Security**: `auth.uid() = user_id`, то есть каждый запрос
  возвращает только данные текущего авторизованного пользователя.
- Пароли хранятся хэшем (Supabase Auth), не в открытом виде.
- Регистрация через клиент не предусмотрена — аккаунт создаётся только вручную в дашборде Supabase.

## Деплой

Фронт — статический, его можно хостить бесплатно:

- **Cloudflare Pages**: build command `npm run build`, output dir `dist`.
- **Vercel** / **Netlify**: аналогично.

Переменные окружения (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) задаются в настройках хостинга.

## Структура

```
src/
├── lib/supabase.ts          # клиент Supabase
├── context/AuthContext.tsx  # авторизация (сессия, вход/выход)
├── types.ts                 # модели данных (Category, Expense, Income, Budget)
└── pages/                   # экраны: Login, Layout (вкладки), Expenses, Income, Stats, Budgets, Categories
supabase/schema.sql          # SQL-схема: таблицы + RLS + индексы
```

## Статус

- [x] Каркас: авторизация (единый аккаунт), навигация по вкладкам
- [ ] CRUD расходов / доходов / категорий / бюджетов
- [ ] Статистика и графики
- [ ] PWA (manifest, service worker, «На экран Домой»)
- [ ] Импорт данных из iOS-приложения
