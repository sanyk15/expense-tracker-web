import { supabase } from './supabase';
import { DEFAULT_CATEGORIES } from '../types';
import type { Category, CategoryBudget, Expense, Income } from '../types';

// ── Строки БД (snake_case) ──────────────────────────────────────

interface CategoryRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
}

interface ExpenseRow {
  id: string;
  amount: number | string;
  category_id: string;
  date: string;
  note: string | null;
}

interface IncomeRow {
  id: string;
  amount: number | string;
  date: string;
  note: string | null;
}

interface BudgetRow {
  id: string;
  category_id: string;
  year: number;
  month: number;
  limit: number | string;
}

const mapCategory = (r: CategoryRow): Category => ({
  id: r.id,
  name: r.name,
  color: r.color,
  icon: r.icon,
  sortOrder: r.sort_order,
});

const mapExpense = (r: ExpenseRow): Expense => ({
  id: r.id,
  amount: Number(r.amount),
  categoryId: r.category_id,
  date: r.date,
  note: r.note ?? '',
});

const mapIncome = (r: IncomeRow): Income => ({
  id: r.id,
  amount: Number(r.amount),
  date: r.date,
  note: r.note ?? '',
});

const mapBudget = (r: BudgetRow): CategoryBudget => ({
  id: r.id,
  categoryId: r.category_id,
  year: r.year,
  month: r.month,
  limit: Number(r.limit),
});

// Выборка всех строк с пагинацией (PostgREST отдаёт максимум 1000 за раз).
async function selectAll(
  table: string,
  orders: Array<{ column: string; ascending: boolean }> = [],
): Promise<unknown[]> {
  const pageSize = 1000;
  const result: unknown[] = [];
  let from = 0;
  for (;;) {
    let query = supabase.from(table).select('*');
    for (const o of orders) query = query.order(o.column, { ascending: o.ascending });
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as unknown[];
    result.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return result;
}

// ── Категории ───────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  const rows = await selectAll('categories', [
    { column: 'sort_order', ascending: true },
    { column: 'id', ascending: true },
  ]);
  return (rows as CategoryRow[]).map(mapCategory);
}

// При первом входе таблица категорий пуста — заполняем предустановленными.
let defaultsSeeded = false;
export async function ensureDefaultCategories(): Promise<void> {
  if (defaultsSeeded) return;
  defaultsSeeded = true;
  const { count, error } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  if ((count ?? 0) > 0) return;

  const rows = DEFAULT_CATEGORIES.map((c, i) => ({
    name: c.name,
    color: c.color,
    icon: c.icon,
    sort_order: i,
  }));
  const { error: insertError } = await supabase.from('categories').insert(rows);
  if (insertError) throw insertError;
}

export async function createCategory(input: {
  name: string;
  color: string;
  icon: string;
}): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...input, sort_order: 999 })
    .select()
    .single();
  if (error) throw error;
  return mapCategory(data as CategoryRow);
}

export async function updateCategory(
  id: string,
  input: Partial<{ name: string; color: string; icon: string; sort_order: number }>,
): Promise<void> {
  const { error } = await supabase.from('categories').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// ── Расходы ─────────────────────────────────────────────────────

export interface ExpenseInput {
  amount: number;
  categoryId: string;
  date: string; // 'YYYY-MM-DD'
  note: string;
}

export async function fetchExpenses(): Promise<Expense[]> {
  const rows = await selectAll('expenses', [
    { column: 'date', ascending: false },
    { column: 'id', ascending: false },
  ]);
  return (rows as ExpenseRow[]).map(mapExpense);
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      amount: input.amount,
      category_id: input.categoryId,
      date: input.date,
      note: input.note,
    })
    .select()
    .single();
  if (error) throw error;
  return mapExpense(data as ExpenseRow);
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({
      amount: input.amount,
      category_id: input.categoryId,
      date: input.date,
      note: input.note,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ── Доходы ──────────────────────────────────────────────────────

export interface IncomeInput {
  amount: number;
  date: string; // 'YYYY-MM-DD'
  note: string;
}

export async function fetchIncomes(): Promise<Income[]> {
  const rows = await selectAll('incomes', [
    { column: 'date', ascending: false },
    { column: 'id', ascending: false },
  ]);
  return (rows as IncomeRow[]).map(mapIncome);
}

export async function createIncome(input: IncomeInput): Promise<Income> {
  const { data, error } = await supabase
    .from('incomes')
    .insert({ amount: input.amount, date: input.date, note: input.note })
    .select()
    .single();
  if (error) throw error;
  return mapIncome(data as IncomeRow);
}

export async function updateIncome(id: string, input: IncomeInput): Promise<void> {
  const { error } = await supabase
    .from('incomes')
    .update({ amount: input.amount, date: input.date, note: input.note })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase.from('incomes').delete().eq('id', id);
  if (error) throw error;
}

// ── Бюджеты ─────────────────────────────────────────────────────

export async function fetchBudgets(): Promise<CategoryBudget[]> {
  const rows = await selectAll('budgets');
  return (rows as BudgetRow[]).map(mapBudget);
}

export async function upsertBudget(input: {
  categoryId: string;
  year: number;
  month: number;
  limit: number;
}): Promise<void> {
  const { error } = await supabase.from('budgets').upsert(
    { category_id: input.categoryId, year: input.year, month: input.month, limit: input.limit },
    { onConflict: 'user_id,category_id,year,month' },
  );
  if (error) throw error;
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
}
