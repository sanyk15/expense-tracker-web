-- Finansy — схема БД (Supabase / Postgres)
-- Выполнить целиком в SQL Editor.
-- Единый общий аккаунт: user_id берётся из auth.uid() и закрыт RLS.

create extension if not exists "pgcrypto";

-- ── Категории расходов ─────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  color       text not null default '#6b7280',
  icon        text not null default '📦',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Расходы ────────────────────────────────────────────────────
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount       numeric(12, 2) not null check (amount >= 0),
  category_id  uuid not null references public.categories (id) on delete cascade,
  date         date not null default current_date,
  note         text not null default '',
  created_at   timestamptz not null default now()
);

-- ── Доходы ─────────────────────────────────────────────────────
create table if not exists public.incomes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  amount      numeric(12, 2) not null check (amount >= 0),
  date        date not null default current_date,
  note        text not null default '',
  created_at  timestamptz not null default now()
);

-- ── Лимиты категорий по месяцам ────────────────────────────────
create table if not exists public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id  uuid not null references public.categories (id) on delete cascade,
  year         integer not null,
  month        integer not null check (month between 1 and 12),
  "limit"      numeric(12, 2) not null check ("limit" >= 0),
  created_at   timestamptz not null default now(),
  unique (user_id, category_id, year, month)
);

-- ── Индексы ────────────────────────────────────────────────────
create index if not exists expenses_user_date_idx  on public.expenses (user_id, date desc);
create index if not exists expenses_category_idx   on public.expenses (category_id);
create index if not exists incomes_user_date_idx   on public.incomes (user_id, date desc);
create index if not exists budgets_lookup_idx      on public.budgets (user_id, category_id, year, month);

-- ── Row Level Security: каждый видит только свои строки ────────
alter table public.categories enable row level security;
alter table public.expenses   enable row level security;
alter table public.incomes    enable row level security;
alter table public.budgets    enable row level security;

create policy "categories_own" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "expenses_own" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "incomes_own" on public.incomes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budgets_own" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
