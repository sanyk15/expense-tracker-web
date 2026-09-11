# CLAUDE.md — Finansy (веб-версия)

## Коротко о проекте
Веб-порт iOS-приложения «Finansy» для учёта расходов и доходов. Сделан для жены и автора — **один общий аккаунт**, видят одни и те же данные. Работает как **PWA** (ставится на домашний экран iPhone) и как обычный сайт. Весь UI на русском.

Это **отдельный репозиторий** от iOS-приложения (`sanyk15/ExpenseTracker`). Здесь — `sanyk15/expense-tracker-web`.

## Технологический стек
- **React 19 + TypeScript + Vite 8** (сборка `tsc -b && vite build`, линтер `oxlint`)
- **React Router v7** — `HashRouter` (не BrowserRouter!)
- **Supabase** (`@supabase/supabase-js`) — Postgres + Auth + Row Level Security. Это единственный бэкенд и БД.
- **PWA**: `manifest.webmanifest` + иконки + apple-touch-icon.
- Внешних зависимостей кроме supabase-js и react-router-dom нет. State-менеджер не используется — всё на React-хуках.

## Архитектура
Данные текут так: `lib/api.ts` (CRUD к Supabase) → `hooks/useCachedData.ts` (кеш-first + фоновая сверка) → страницы.

- **Нет Redux/Zustand.** Общее состояние — через кастомные хуки и контексты.
- **`useCachedData<T>(cacheKey, fetcher, empty)`** — главный хук данных: синхронно отдаёт из `localStorage` (мгновенный рендер), затем в фоне грузит свежее с сервера и перезаписывает кеш. Возвращает `{ data, loading, refresh }`. Ключи кеша — `finansy_cache_<cacheKey>`.
- **Авторизация** — `context/AuthContext.tsx`: `signInWithPassword` (без `signUp` — публичной регистрации нет), восстановление сессии через `getSession()`. `Root` в `App.tsx` показывает `Login`, пока нет сессии.
- **Тема** — `context/ThemeContext.tsx`: `light | dark | system`, хранится в `localStorage.theme`, на `<html data-theme>`.

## Структура `src/`
```
App.tsx                      # HashRouter: ThemeProvider > AuthProvider > Routes
main.tsx
types.ts                     # Category, Expense, Income, CategoryBudget (+ DEFAULT_CATEGORIES)
index.css                    # ВСЯ стилизация (CSS-переменные, каркас, карусель, донат, темы)
components/
  Modal.tsx                  # createPortal в body; проп closing (анимация вылета вверх)
  Snackbar.tsx               # тост с кнопкой действия (undo) через createPortal
  DonutChart.tsx             # интерактивный донат: иконки на кольце, тап увеличивает сектор
  ExpenseForm.tsx            # форма расхода (недавние суммы/заметки — чипы)
  IncomeForm.tsx             # форма дохода
  CategoryForm.tsx, BudgetForm.tsx
context/  AuthContext.tsx, ThemeContext.tsx
hooks/
  useCachedData.ts           # кеш-first + фоновый refresh
  useAddShortcut.ts          # подписка на кнопку «+» навбара, ключ по маршруту
  usePullToRefresh.ts        # потянуть вниз → refresh (touch, scrollTop===0)
  useAnimatedNumber.ts       # плавное «докручивание» числа
lib/
  supabase.ts                # клиент (env VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY)
  api.ts                     # CRUD + selectAll() (пагинация по 1000 строк)
  backup.ts                  # импорт/экспорт JSON (совместим с бэкапом iOS)
  cache.ts, dates.ts, periods.ts, haptics.ts
  addEvent.ts                # event-bus кнопки «+»: ADD_EVENT + emitAdd()
pages/
  Layout.tsx                 # каркас: topbar + карусель 5 вкладок + навбар с «+»
  Expenses.tsx               # главный экран расходов
  Income.tsx                 # доходы
  Stats.tsx                  # статистика (столбцы + донат, свайп-карусель графиков)
  Budgets.tsx                # месячные лимиты
  Categories.tsx             # категории + drag-and-drop порядок
  CategoryDetail.tsx, IncomeSourceDetail.tsx
  Settings.tsx               # тема, компактный режим, импорт/экспорт
  Login.tsx
supabase/schema.sql          # таблицы + RLS + индексы (выполнять целиком в SQL Editor)
```

## Ключи в localStorage
| Ключ | Тип | Назначение |
|---|---|---|
| `theme` | `light\|dark\|system` | тема |
| `compactList` | `'1'` | компактный список |
| `statsChartType` | `bar\|donut` | тип графика в статистике |
| `finansy_cache_*` | JSON | кеш данных (categories/expenses/incomes/budgets) |

## Env (`.env.local`, gitignored)
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```
Ключ — **publishable** (`sb_publishable_...`), НЕ старый JWT anon. `secret` ключ (`sb_secret_...`) на клиенте не используется.

## Важные факты / грабли
- **HashRouter**, а не BrowserRouter — так не нужен `_redirects` на Cloudflare (иначе редирект `/* → /index.html` зацикливается, ошибка 100324).
- **PostgREST отдаёт максимум 1000 строк** — `selectAll()` в `api.ts` ходит `.range()` постранично. Все выборки с детерминированной сортировкой (`date desc, id desc`), чтобы пагинация была стабильной.
- **Модалки — `createPortal` в `document.body`** (иначе обрезаются скролл-контейнером на iOS) + в `index.html` viewport `interactive-widget=resizes-content`, чтобы клавиатура не прятала кнопки. Формы по центру экрана (`align-items: center`), а не bottom-sheet.
- **Карусель вкладок** в `Layout.tsx` — лента на `transform: translateX`, ведётся за пальцем через прямое манипулирование DOM (`useLayoutEffect` + touch-события), снап `cubic-bezier(0.32, 0.72, 0, 1)` 0.42s. Та же механика — у карусели графиков в `Stats.tsx`.
- **Кнопка «+» по центру навбара** — шлёт `finansy:add` (`lib/addEvent.ts`); страницы подписываются через `useAddShortcut(paths, openAdd)`, ключ по маршруту. Расходы также реагируют на `/stats` и `/budgets` (фолбэк «добавить расход»).
- **Drag-and-drop категорий** — ручка `≡` на строке, `setPointerCapture` + `elementFromPoint`, при отпускании пишет `sort_order` всем (`updateCategory`). Не HTML5 DnD (работает на таче).
- **Тактильный отклик** — `haptics.ts` (`navigator.vibrate`).
- **RLS**: все таблицы под `auth.uid() = user_id`; `user_id` подставляется Supabase, на клиенте поля `user_id` нет.
- Импорт iOS-бэкапа: у категорий может не быть цвета — `backup.ts` назначает из палитры; даты нормализуются `ISO8601 → YYYY-MM-DD`.

## Что не доделано / известно
- Нет офлайн-режима (осознанно — требуется сеть).
- Нет push-уведомлений (осознанно).
- `dist/` — артефакт сборки, коммитить не нужно (если не надо).

## Git / деплой
- Репозиторий: `https://github.com/sanyk15/expense-tracker-web.git`, ветка `main`.
- Деплой: Cloudflare Pages (build `npm run build`, out `dist`) или Vercel/Netlify.
