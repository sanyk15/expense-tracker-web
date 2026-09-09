import { supabase } from './supabase';
import { fetchBudgets, fetchCategories, fetchExpenses, fetchIncomes } from './api';

// Импорт поддерживает два формата: экспорт iOS-приложения (без цвета категорий,
// ISO8601-даты, budgets опционален) и собственный экспорт этого приложения.

const PALETTE = [
  '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#14b8a6', '#6b7280', '#22c55e', '#eab308', '#0ea5e9',
];

const ZERO_UUID = '00000000-0000-0000-0000-000000000000';

interface RawCategory {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  sort_order?: number;
  sortOrder?: number;
}

interface RawExpense {
  id: string;
  amount: number;
  categoryId: string;
  date: string;
  note?: string | null;
}

interface RawIncome {
  id: string;
  amount: number;
  date: string;
  note?: string | null;
}

interface RawBudget {
  id: string;
  categoryId: string;
  year: number;
  month: number;
  limit: number;
}

interface RawBackup {
  version?: string;
  categories?: RawCategory[];
  expenses?: RawExpense[];
  incomes?: RawIncome[];
  budgets?: RawBudget[];
}

export interface ImportResult {
  categories: number;
  expenses: number;
  incomes: number;
  budgets: number;
}

function round2(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

// 'YYYY-MM-DD' оставляем как есть; ISO8601 приводим к локальной дате.
function normalizeDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function importBackup(text: string): Promise<ImportResult> {
  let raw: RawBackup;
  try {
    raw = JSON.parse(text) as RawBackup;
  } catch {
    throw new Error('Файл не является валидным JSON.');
  }

  if (!Array.isArray(raw.categories) || !Array.isArray(raw.expenses) || !Array.isArray(raw.incomes)) {
    throw new Error('Неверный формат: ожидаются поля categories, expenses, incomes.');
  }

  const categories = raw.categories.map((c, i) => ({
    id: c.id,
    name: c.name,
    icon: c.icon || '📦',
    color: c.color || PALETTE[i % PALETTE.length],
    sort_order: c.sort_order ?? c.sortOrder ?? i,
  }));

  const categoryIds = new Set(categories.map((c) => c.id));

  const expenses = raw.expenses
    .filter((e) => categoryIds.has(e.categoryId))
    .map((e) => ({
      id: e.id,
      amount: round2(e.amount),
      category_id: e.categoryId,
      date: normalizeDate(e.date),
      note: e.note ?? '',
    }));

  const incomes = raw.incomes.map((i) => ({
    id: i.id,
    amount: round2(i.amount),
    date: normalizeDate(i.date),
    note: i.note ?? '',
  }));

  const budgets = (raw.budgets ?? [])
    .filter((b) => categoryIds.has(b.categoryId))
    .map((b) => ({
      id: b.id,
      category_id: b.categoryId,
      year: b.year,
      month: b.month,
      limit: round2(b.limit),
    }));

  // Замена: чистим всё (RLS ограничивает текущим пользователем), затем вставляем.
  await clearTable('budgets');
  await clearTable('expenses');
  await clearTable('incomes');
  await clearTable('categories');

  await insertInChunks('categories', categories);
  await insertInChunks('expenses', expenses);
  await insertInChunks('incomes', incomes);
  await insertInChunks('budgets', budgets);

  return {
    categories: categories.length,
    expenses: expenses.length,
    incomes: incomes.length,
    budgets: budgets.length,
  };
}

async function clearTable(table: string): Promise<void> {
  const { error } = await supabase.from(table).delete().gte('id', ZERO_UUID);
  if (error) throw error;
}

async function insertInChunks(
  table: string,
  rows: Record<string, unknown>[],
  chunk = 1000,
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    if (slice.length === 0) continue;
    const { error } = await supabase.from(table).insert(slice);
    if (error) throw error;
  }
}

// ── Экспорт ─────────────────────────────────────────────────────

export async function buildExport(): Promise<Record<string, unknown>> {
  const [categories, expenses, incomes, budgets] = await Promise.all([
    fetchCategories(),
    fetchExpenses(),
    fetchIncomes(),
    fetchBudgets(),
  ]);

  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      sort_order: c.sortOrder,
    })),
    expenses: expenses.map((e) => ({
      id: e.id,
      amount: e.amount,
      categoryId: e.categoryId,
      date: e.date,
      note: e.note,
    })),
    incomes: incomes.map((i) => ({
      id: i.id,
      amount: i.amount,
      date: i.date,
      note: i.note,
    })),
    budgets: budgets.map((b) => ({
      id: b.id,
      categoryId: b.categoryId,
      year: b.year,
      month: b.month,
      limit: b.limit,
    })),
  };
}

export function downloadExport(data: Record<string, unknown>): void {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Finansy_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
