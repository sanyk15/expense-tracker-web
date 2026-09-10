import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchBudgets, fetchCategories, fetchExpenses, fetchIncomes } from '../lib/api';
import type { Category, CategoryBudget, Expense, Income } from '../types';
import { formatMoney } from '../lib/dates';
import { currentMonth, currentYear, dateKey, lastDays } from '../lib/periods';
import type { DateRange } from '../lib/periods';
import { useCachedData } from '../hooks/useCachedData';

type PeriodKey = 'week' | 'month' | 'year' | 'custom';
type Tab = 'expenses' | 'income';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
  custom: 'Период',
};

const MONTH_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

export default function Stats() {
  const cats = useCachedData<Category[]>('categories', fetchCategories, []);
  const exps = useCachedData<Expense[]>('expenses', fetchExpenses, []);
  const incs = useCachedData<Income[]>('incomes', fetchIncomes, []);
  const buds = useCachedData<CategoryBudget[]>('budgets', fetchBudgets, []);

  const categories = cats.data;
  const expenses = exps.data;
  const incomes = incs.data;
  const budgets = buds.data;
  const loading = cats.loading || exps.loading || incs.loading || buds.loading;

  const [tab, setTab] = useState<Tab>('expenses');
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [customStart, setCustomStart] = useState(dateKey(new Date()));
  const [customEnd, setCustomEnd] = useState(dateKey(new Date()));

  const range: DateRange = useMemo(() => {
    if (period === 'week') return lastDays(7);
    if (period === 'year') return currentYear();
    if (period === 'custom') return { start: customStart, end: customEnd };
    return currentMonth();
  }, [period, customStart, customEnd]);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filteredExpenses = useMemo(
    () => expenses.filter((e) => e.date >= range.start && e.date <= range.end),
    [expenses, range],
  );

  const filteredIncomes = useMemo(
    () => incomes.filter((i) => i.date >= range.start && i.date <= range.end),
    [incomes, range],
  );

  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) {
      map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amount);
    }
    return [...map.entries()]
      .map(([categoryId, amount]) => ({ category: categoryById.get(categoryId), categoryId, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, categoryById]);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const incomeBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of filteredIncomes) {
      const key = i.note.trim() || 'Без источника';
      map.set(key, (map.get(key) ?? 0) + i.amount);
    }
    return [...map.entries()]
      .map(([note, amount]) => ({ note, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredIncomes]);

  const totalIncomes = filteredIncomes.reduce((s, i) => s + i.amount, 0);

  // Лимиты текущего месяца — показываем, когда выбран период «Месяц».
  const monthBudgets = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const map = new Map<string, CategoryBudget>();
    for (const b of budgets) {
      if (b.year === y && b.month === m) map.set(b.categoryId, b);
    }
    return map;
  }, [budgets]);

  const bars = useMemo(() => {
    const items = tab === 'expenses' ? filteredExpenses : filteredIncomes;
    if (period === 'year') {
      const months = Array.from({ length: 12 }, (_, i) => ({ label: MONTH_SHORT[i], value: 0 }));
      for (const it of items) {
        const m = Number(it.date.slice(5, 7)) - 1;
        if (m >= 0 && m < 12) months[m].value += it.amount;
      }
      return months;
    }
    const byDay = new Map<string, number>();
    for (const it of items) byDay.set(it.date, (byDay.get(it.date) ?? 0) + it.amount);
    const out: { label: string; value: number }[] = [];
    const cur = new Date(`${range.start}T00:00:00`);
    const end = new Date(`${range.end}T00:00:00`);
    while (cur <= end) {
      const key = dateKey(cur);
      out.push({ label: String(cur.getDate()), value: byDay.get(key) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [tab, period, filteredExpenses, filteredIncomes, range]);

  if (loading) {
    return <div className="splash">Загрузка…</div>;
  }

  const total = tab === 'expenses' ? totalExpenses : totalIncomes;

  return (
    <section>
      <div className="page-header">
        <h1>Статистика</h1>
      </div>

      <div className="tabs">
        <button
          className={`tab-pill${tab === 'expenses' ? ' active' : ''}`}
          onClick={() => setTab('expenses')}
        >
          Расходы
        </button>
        <button
          className={`tab-pill${tab === 'income' ? ' active' : ''}`}
          onClick={() => setTab('income')}
        >
          Доходы
        </button>
      </div>

      <div className="tabs period-tabs">
        {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((p) => (
          <button
            key={p}
            className={`tab-pill${period === p ? ' active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="range-controls">
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          <span>—</span>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
        </div>
      )}

      <div className="stat-total card">
        <span>Итого за период</span>
        <strong>{formatMoney(total)}</strong>
      </div>

      <div className="card chart-card">
        <BarChart bars={bars} />
      </div>

      <div className="breakdown">
        {tab === 'expenses'
          ? expenseBreakdown.map(({ category, categoryId, amount }) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              const budget = period === 'month' ? monthBudgets.get(categoryId) : undefined;
              const over = budget && budget.limit > 0 && amount > budget.limit;
              return (
                <Link key={categoryId} to={`/category/${categoryId}`} className="breakdown-row">
                  <span className="expense-icon" style={{ background: category?.color }}>
                    {category?.icon ?? '📦'}
                  </span>
                  <div className="breakdown-main">
                    <div className="breakdown-top">
                      <span className="expense-name">{category?.name ?? 'Без категории'}</span>
                      <span className="breakdown-amount">{formatMoney(amount)}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="breakdown-meta">
                      <span>{pct.toFixed(0)}%</span>
                      {budget && budget.limit > 0 && (
                        <span className={over ? 'over' : ''}>
                          {over ? 'Превышен лимит' : `Лимит ${formatMoney(budget.limit)}`}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          : incomeBreakdown.map(({ note, amount }) => {
              const pct = totalIncomes > 0 ? (amount / totalIncomes) * 100 : 0;
              return (
                <div key={note} className="breakdown-row">
                  <span className="expense-icon income-icon">💰</span>
                  <div className="breakdown-main">
                    <div className="breakdown-top">
                      <span className="expense-name">{note}</span>
                      <span className="breakdown-amount">{formatMoney(amount)}</span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill income" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="breakdown-meta">
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>
    </section>
  );
}

function BarChart({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(...bars.map((b) => b.value), 0);
  // При большом числе столбцов (месяц, длинный диапазон) подписи разрежаем.
  const step = bars.length > 14 ? Math.ceil(bars.length / 12) : 1;
  return (
    <div className="bar-chart">
      {bars.map((b, i) => (
        <div key={i} className="bar-col" title={`${b.label}: ${formatMoney(b.value)}`}>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ height: max > 0 ? `${(b.value / max) * 100}%` : '0%' }}
            />
          </div>
          <span className="bar-label">{i % step === 0 ? b.label : ''}</span>
        </div>
      ))}
    </div>
  );
}
