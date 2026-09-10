import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchIncomes } from '../lib/api';
import type { Income } from '../types';
import { formatDay, formatMoney } from '../lib/dates';
import { currentMonth, currentYear, dateKey, lastDays } from '../lib/periods';
import type { DateRange } from '../lib/periods';
import { useCachedData } from '../hooks/useCachedData';

type PeriodKey = 'week' | 'month' | 'year' | 'custom';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  week: 'Неделя',
  month: 'Месяц',
  year: 'Год',
  custom: 'Период',
};

export default function IncomeSourceDetail() {
  const { name } = useParams<{ name: string }>();
  const sourceKey = useMemo(() => decodeURIComponent(name ?? ''), [name]);
  const { data: incomes, loading } = useCachedData<Income[]>('incomes', fetchIncomes, []);

  const [period, setPeriod] = useState<PeriodKey>('month');
  const [customStart, setCustomStart] = useState(dateKey(new Date()));
  const [customEnd, setCustomEnd] = useState(dateKey(new Date()));

  const range: DateRange = useMemo(() => {
    if (period === 'week') return lastDays(7);
    if (period === 'year') return currentYear();
    if (period === 'custom') return { start: customStart, end: customEnd };
    return currentMonth();
  }, [period, customStart, customEnd]);

  const filtered = useMemo(
    () =>
      incomes.filter(
        (i) =>
          i.note.trim().toLowerCase() === sourceKey &&
          i.date >= range.start &&
          i.date <= range.end,
      ),
    [incomes, sourceKey, range],
  );

  const total = filtered.reduce((s, i) => s + i.amount, 0);

  const groups = useMemo(() => {
    const map = new Map<string, Income[]>();
    for (const i of filtered) {
      const list = map.get(i.date) ?? [];
      list.push(i);
      map.set(i.date, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const displayName = sourceKey
    ? sourceKey.charAt(0).toUpperCase() + sourceKey.slice(1)
    : 'Без источника';

  if (loading) {
    return <div className="splash">Загрузка…</div>;
  }

  return (
    <section>
      <Link to="/stats" className="back-link">
        ← Статистика
      </Link>

      <div className="page-header">
        <h1>💵 {displayName}</h1>
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
        <div className="card muted">Нет доходов по этому источнику за выбранный период.</div>
      ) : (
        groups.map(([date, items]) => (
          <div key={date} className="day-group">
            <div className="day-header">
              <span>{formatDay(date)}</span>
              <span className="day-total day-total-income">
                {formatMoney(items.reduce((s, i) => s + i.amount, 0))}
              </span>
            </div>
            {items.map((i) => (
              <div key={i.id} className="expense-row">
                <span className="expense-icon income-icon">💰</span>
                <div className="expense-main">
                  <span className="expense-name">Доход</span>
                  {i.note && <span className="expense-note">{i.note}</span>}
                </div>
                <span className="expense-amount income-amount">{formatMoney(i.amount)}</span>
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}
