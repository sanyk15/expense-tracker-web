import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchCategories, fetchExpenses } from '../lib/api';
import type { Category, Expense } from '../types';
import { formatDay, formatMoney } from '../lib/dates';
import { currentMonth, currentYear, dateKey, lastDays } from '../lib/periods';
import type { DateRange } from '../lib/periods';

type PeriodKey = 'week' | 'month' | 'year' | 'custom';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
  custom: 'Период',
};

export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [customStart, setCustomStart] = useState(dateKey(new Date()));
  const [customEnd, setCustomEnd] = useState(dateKey(new Date()));

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [cats, exps] = await Promise.all([fetchCategories(), fetchExpenses()]);
      setCategory(cats.find((c) => c.id === id) ?? null);
      setExpenses(exps.filter((e) => e.categoryId === id));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const range: DateRange = useMemo(() => {
    if (period === 'week') return lastDays(7);
    if (period === 'year') return currentYear();
    if (period === 'custom') return { start: customStart, end: customEnd };
    return currentMonth();
  }, [period, customStart, customEnd]);

  const filtered = useMemo(
    () => expenses.filter((e) => e.date >= range.start && e.date <= range.end),
    [expenses, range],
  );

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filtered) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  if (loading) {
    return <div className="splash">Загрузка…</div>;
  }

  return (
    <section>
      <Link to="/stats" className="back-link">
        ← Статистика
      </Link>

      <div className="page-header">
        <h1>
          {category ? `${category.icon} ${category.name}` : 'Категория'}
        </h1>
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

      {filtered.length === 0 ? (
        <div className="card muted">Нет расходов в этой категории за выбранный период.</div>
      ) : (
        groups.map(([date, items]) => (
          <div key={date} className="day-group">
            <div className="day-header">
              <span>{formatDay(date)}</span>
              <span className="day-total">
                {formatMoney(items.reduce((s, e) => s + e.amount, 0))}
              </span>
            </div>
            {items.map((e) => (
              <div key={e.id} className="expense-row">
                <div className="expense-main">
                  <span className="expense-name">{e.note || 'Без заметки'}</span>
                </div>
                <span className="expense-amount">{formatMoney(e.amount)}</span>
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}
