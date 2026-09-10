# Finansy

Веб-версия приложения для учёта расходов и доходов — порт iOS-приложения Finansy.

Личный семейный трекер: автор и его жена используют **один общий аккаунт** и видят одни и те же данные. Работает как **PWA** — ставится на домашний экран iPhone как обычное приложение (без App Store и без 7-дневной переустановки), а также открывается как обычный сайт в браузере.

## Возможности

- Расходы и доходы по дням (навигация по дате, «Бесплатный день!», быстрые суммы)
- Категории (свои эмодзи и цвет, порядок, сортировка)
- Месячные лимиты по категориям с прогрессом и подсветкой превышения
- Статистика: периоды (неделя/месяц/год/свой), разбивка по категориям и источникам, график со шкалой, детализация
- Светлая/тёмная тема, импорт/экспорт данных (совместимо с бэкапом iOS-приложения)
- Локальный кеш — приложение открывается мгновенно, данные докачиваются в фоне

## Стек

**React 19 + TypeScript + Vite**, бэкенд и БД — **Supabase** (Postgres + Auth + Row Level Security). Внешних зависимостей, кроме `@supabase/supabase-js` и `react-router-dom`, нет.

## Как развернуть для себя

Нужны: [Node.js](https://nodejs.org) и бесплатный аккаунт [Supabase](https://supabase.com).

### 1. Supabase

1. Создай проект на [supabase.com](https://supabase.com).
2. В **SQL Editor** выполни целиком [`supabase/schema.sql`](./supabase/schema.sql) — он создаст таблицы, индексы и RLS.
3. Отключи публичную регистрацию: *Authentication → Sign In / Providers → Email* — в приложении есть только вход (`signInWithPassword`), метода `signUp` нет, поэтому зарегистрироваться через сайт невозможно.
4. Создай аккаунт: *Authentication → Users → Add user → Create new user* (email + пароль).
5. Скопируй ключи: *Project Settings → API* → `Project URL` и `publishable` key.

### 2. Запуск локально

```bash
npm install
cp .env.example .env.local
```

Заполни `.env.local`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

```bash
npm run dev
```

Приложение откроется на `http://localhost:5173`.

### 3. Деплой

Фронт — статический, хостится бесплатно:

- **Cloudflare Pages**: build command `npm run build`, output dir `dist`.
- **Vercel** / **Netlify** — аналогично.

Переменные окружения (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) задаются в настройках хостинга. На iPhone: открыть URL в Safari → «Поделиться» → «На экран „Домой“».

## Безопасность

- Все таблицы под **Row Level Security** (`auth.uid() = user_id`) — каждый запрос возвращает только данные авторизованного пользователя.
- Пароли хранятся хэшем (Supabase Auth), не в открытом виде.
- Регистрация через клиент не предусмотрена — аккаунт создаётся вручную в дашборде Supabase.
- `publishable` ключ безопасно хранить на клиенте; `secret` ключ на клиенте не используется.

## Перенос данных из iOS-приложения

Настройки → **Экспорт** в iOS-приложении → сохрани JSON → на сайте: ⚙️ → **Импорт (JSON)**. Импорт поддерживает формат бэкапа iOS-приложения (заменяет текущие данные).

## Структура

```
src/
├── components/   # формы (ExpenseForm, IncomeForm, CategoryForm, BudgetForm) и Modal
├── context/      # AuthContext (авторизация), ThemeContext (тема)
├── hooks/        # useCachedData (локальный кеш + фоновая сверка)
├── lib/          # supabase, api (CRUD + пагинация), backup, cache, dates, periods
├── pages/        # экраны: Login, Layout, Expenses, Income, Stats, Budgets, Categories,
│                 #          CategoryDetail, IncomeSourceDetail, Settings
├── types.ts      # модели данных (Category, Expense, Income, CategoryBudget)
├── App.tsx       # роутер
└── main.tsx
supabase/schema.sql   # SQL-схема: таблицы + RLS + индексы
```
