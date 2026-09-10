import { useMemo, useState } from 'react';
import { createIncome, deleteIncome, fetchIncomes, updateIncome } from '../lib/api';
import type { Income } from '../types';
import { addDays, formatDay, formatMoney, formatWeekday, todayKey } from '../lib/dates';
import IncomeForm from '../components/IncomeForm';
import type { IncomeFormValues } from '../components/IncomeForm';
import Modal from '../components/Modal';
import Snackbar from '../components/Snackbar';
import { useCachedData } from '../hooks/useCachedData';
import { useAddShortcut } from '../hooks/useAddShortcut';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { haptic } from '../lib/haptics';

export default function IncomePage() {
  const { data: incomes, loading, refresh } = useCachedData<Income[]>('incomes', fetchIncomes, []);

  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [undo, setUndo] = useState<Income | null>(null);

  const dayIncomes = useMemo(
    () => incomes.filter((i) => i.date === selectedDate),
    [incomes, selectedDate],
  );

  const dayTotal = dayIncomes.reduce((s, i) => s + i.amount, 0);

  const groups = useMemo(() => {
    const map = new Map<string, Income[]>();
    for (const i of incomes) {
      const list = map.get(i.date) ?? [];
      list.push(i);
      map.set(i.date, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [incomes]);

  const recentNotes = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const i of incomes) {
      const n = i.note.trim();
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        out.push(n);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [incomes]);

  const recentAmounts = useMemo(() => {
    const freq = new Map<number, number>();
    for (const i of incomes) freq.set(i.amount, (freq.get(i.amount) ?? 0) + 1);
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([v]) => v);
  }, [incomes]);

  const { ref, pull, refreshing } = usePullToRefresh(refresh);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  useAddShortcut(['/income'], openAdd);

  function openEdit(inc: Income) {
    setEditing(inc);
    setShowForm(true);
  }

  async function handleSubmit(values: IncomeFormValues) {
    setBusy(true);
    setError(null);
    try {
      if (editing) await updateIncome(editing.id, values);
      else await createIncome(values);
      await refresh();
      haptic();
      setClosing(true);
      window.setTimeout(() => {
        setShowForm(false);
        setClosing(false);
      }, 320);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    const income = incomes.find((i) => i.id === id);
    if (!income) return;
    setError(null);
    try {
      await deleteIncome(id);
      await refresh();
      haptic();
      setUndo(income);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить');
    }
  }

  function handleUndoDelete() {
    const income = undo;
    setUndo(null);
    if (!income) return;
    createIncome({ amount: income.amount, date: income.date, note: income.note })
      .then(refresh)
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось восстановить'));
  }

  if (loading) {
    return (
      <section className="skeleton-list">
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
        <div className="skeleton skeleton-row" />
      </section>
    );
  }

  return (
    <section ref={ref}>
      <div
        className={`ptr${refreshing ? ' refreshing' : ''}`}
        style={{ height: refreshing ? 44 : pull, opacity: refreshing ? 1 : Math.min(1, pull / 50) }}
      >
        <div className="spinner-ring" />
      </div>

      <div className="page-header">
        <h1>Доходы</h1>
        <div className="page-header-actions">
          <button className="btn-ghost" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'По дням' : 'Все доходы'}
          </button>
        </div>
      </div>

      {!showAll && (
        <div className="date-nav">
          <button
            className="icon-btn"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            aria-label="Предыдущий день"
          >
            ←
          </button>
          <div className="date-nav-center">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            <span className="date-nav-label">{formatWeekday(selectedDate)}</span>
          </div>
          <button
            className="icon-btn"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            aria-label="Следующий день"
          >
            →
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {showAll ? (
        groups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💰</div>
            <div className="empty-title">Пока нет доходов</div>
            <div className="empty-sub">Добавь свой первый доход</div>
          </div>
        ) : (
          groups.map(([date, items]) => (
            <div key={date} className="day-group">
              <div className="day-header">
                <span>{formatDay(date)}</span>
                <span className="day-total day-total-income">
                  {formatMoney(items.reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
              {items.map((inc) => (
                <IncomeRow key={inc.id} income={inc} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          ))
        )
      ) : dayIncomes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <div className="empty-title">Нет доходов</div>
          <div className="empty-sub">Добавь свой первый доход</div>
        </div>
      ) : (
        <div className="day-group">
          {dayIncomes.map((inc) => (
            <IncomeRow key={inc.id} income={inc} onEdit={openEdit} onDelete={handleDelete} />
          ))}
          <div className="total-row">
            <span>Итого:</span>
            <span className="income-amount">{formatMoney(dayTotal)}</span>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Изменить доход' : 'Новый доход'} onClose={() => setShowForm(false)} closing={closing}>
          <IncomeForm
            initial={editing ?? undefined}
            defaultDate={selectedDate}
            recentAmounts={recentAmounts}
            recentNotes={recentNotes}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            busy={busy}
          />
        </Modal>
      )}

      {undo && (
        <Snackbar
          message="Доход удалён"
          actionLabel="Отменить"
          onAction={handleUndoDelete}
          onClose={() => setUndo(null)}
        />
      )}
    </section>
  );
}

function IncomeRow({
  income,
  onEdit,
  onDelete,
}: {
  income: Income;
  onEdit: (i: Income) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="expense-row" onClick={() => onEdit(income)}>
      <span className="expense-icon income-icon">💰</span>
      <div className="expense-main">
        <span className="expense-name">Доход</span>
        {income.note && <span className="expense-note">{income.note}</span>}
      </div>
      <span className="expense-amount income-amount">{formatMoney(income.amount)}</span>
      <button
        className="row-delete"
        onClick={(ev) => {
          ev.stopPropagation();
          onDelete(income.id);
        }}
        aria-label="Удалить"
      >
        ✕
      </button>
    </div>
  );
}
