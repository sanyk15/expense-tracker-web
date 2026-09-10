import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchBudgets, fetchCategories, fetchExpenses, upsertBudget } from '../lib/api';
import type { Category, CategoryBudget, Expense } from '../types';
import { formatMoney } from '../lib/dates';
import { addMonths, currentYearMonth, monthLabel } from '../lib/periods';
import type { YearMonth } from '../lib/periods';
import BudgetForm from '../components/BudgetForm';

export default function BudgetsPage() {
  const [ym, setYm] = useState<YearMonth>(currentYearMonth());
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, exps, buds] = await Promise.all([
        fetchCategories(),
        fetchExpenses(),
        fetchBudgets(),
      ]);
      setCategories(cats);
      setExpenses(exps);
      setBudgets(buds);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      const [y, m] = e.date.split('-').map(Number);
      if (y === ym.year && m === ym.month) {
        map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amount);
      }
    }
    return map;
  }, [expenses, ym]);

  const budgetByCategory = useMemo(() => {
    const map = new Map<string, CategoryBudget>();
    for (const b of budgets) {
      if (b.year === ym.year && b.month === ym.month) map.set(b.categoryId, b);
    }
    return map;
  }, [budgets, ym]);

  const totalSpent = [...spentByCategory.values()].reduce((s, v) => s + v, 0);

  async function handleSetLimit(category: Category, limit: number) {
    setError(null);
    try {
      await upsertBudget({ categoryId: category.id, year: ym.year, month: ym.month, limit });
      setEditingCat(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить лимит');
    }
  }

  if (loading) {
    return <div className="splash">Загрузка…</div>;
  }

  return (
    <section>
      <div className="page-header">
        <h1>Лимиты</h1>
      </div>

      <div className="month-nav">
        <button className="btn-ghost" onClick={() => setYm(addMonths(ym, -1))}>
          ←
        </button>
        <span className="month-label">{monthLabel(ym)}</span>
        <button className="btn-ghost" onClick={() => setYm(addMonths(ym, 1))}>
          →
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="budget-total card">
        <span>Потрачено за месяц</span>
        <strong>{formatMoney(totalSpent)}</strong>
      </div>

      <div className="budget-list">
        {categories.map((c) => {
          const spent = spentByCategory.get(c.id) ?? 0;
          const budget = budgetByCategory.get(c.id);
          const limit = budget?.limit ?? 0;
          const over = limit > 0 && spent > limit;
          const pct = limit > 0 ? Math.min(spent / limit, 1) : 0;
          return (
            <button key={c.id} className="budget-row" onClick={() => setEditingCat(c)}>
              <span className="expense-icon" style={{ background: c.color }}>
                {c.icon}
              </span>
              <div className="budget-main">
                <div className="budget-top">
                  <span className="expense-name">{c.name}</span>
                  <span className={over ? 'over' : ''}>
                    {formatMoney(spent)}
                    {limit > 0 ? ` / ${formatMoney(limit)}` : ''}
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill${over ? ' over' : ''}`}
                    style={{ width: `${Math.round(pct * 100)}%` }}
                  />
                </div>
                {limit > 0 && (
                  <span className={`budget-remaining${over ? ' over' : ''}`}>
                    {over
                      ? `Превышение на ${formatMoney(spent - limit)}`
                      : `Осталось ${formatMoney(limit - spent)}`}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {editingCat && (
        <BudgetForm
          category={editingCat}
          currentLimit={budgetByCategory.get(editingCat.id)?.limit ?? 0}
          onSubmit={handleSetLimit}
          onCancel={() => setEditingCat(null)}
        />
      )}
    </section>
  );
}
