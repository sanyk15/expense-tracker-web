import { useMemo, useState } from 'react';
import {
  createExpense,
  deleteExpense,
  ensureDefaultCategories,
  fetchCategories,
  fetchExpenses,
  updateExpense,
} from '../lib/api';
import type { Category, Expense } from '../types';
import { addDays, formatDay, formatMoney, formatWeekday, todayKey } from '../lib/dates';
import ExpenseForm from '../components/ExpenseForm';
import type { ExpenseFormValues } from '../components/ExpenseForm';
import Modal from '../components/Modal';
import Snackbar from '../components/Snackbar';
import { useCachedData } from '../hooks/useCachedData';
import { useAddShortcut } from '../hooks/useAddShortcut';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { haptic } from '../lib/haptics';

async function fetchCategoriesWithSeed(): Promise<Category[]> {
  await ensureDefaultCategories();
  return fetchCategories();
}

export default function Expenses() {
  const cats = useCachedData<Category[]>('categories', fetchCategoriesWithSeed, []);
  const exps = useCachedData<Expense[]>('expenses', fetchExpenses, []);
  const categories = cats.data;
  const expenses = exps.data;
  const loading = cats.loading || exps.loading;

  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [undo, setUndo] = useState<Expense | null>(null);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const dayExpenses = useMemo(
    () => expenses.filter((e) => e.date === selectedDate),
    [expenses, selectedDate],
  );

  const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

  const monthTotal = useMemo(() => {
    const ym = selectedDate.slice(0, 7);
    return expenses.filter((e) => e.date.startsWith(ym)).reduce((s, e) => s + e.amount, 0);
  }, [expenses, selectedDate]);

  const prevMonthTotal = useMemo(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    const prev = new Date(y, m - 2, 1);
    const ym = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    return expenses.filter((e) => e.date.startsWith(ym)).reduce((s, e) => s + e.amount, 0);
  }, [expenses, selectedDate]);

  const monthLabel = useMemo(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(new Date(y, m - 1, 1));
  }, [selectedDate]);

  const isToday = selectedDate === todayKey();
  const monthDelta = monthTotal - prevMonthTotal;
  const monthDeltaPct = prevMonthTotal > 0 ? Math.round((monthDelta / prevMonthTotal) * 100) : null;

  const filteredExpenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) => {
      const cat = categoryById.get(e.categoryId);
      return (cat?.name ?? '').toLowerCase().includes(q) || e.note.toLowerCase().includes(q);
    });
  }, [expenses, query, categoryById]);

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of filteredExpenses) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredExpenses]);

  const recentNotes = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of expenses) {
      const n = e.note.trim();
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        out.push(n);
        if (out.length >= 8) break;
      }
    }
    return out;
  }, [expenses]);

  const recentAmounts = useMemo(() => {
    const freq = new Map<number, number>();
    for (const e of expenses) freq.set(e.amount, (freq.get(e.amount) ?? 0) + 1);
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([v]) => v);
  }, [expenses]);

  const animatedDay = useAnimatedNumber(dayTotal);
  const animatedMonth = useAnimatedNumber(monthTotal);

  const { ref, pull, refreshing } = usePullToRefresh(refreshAll);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  useAddShortcut(['/expenses', '/stats', '/budgets'], openAdd);

  function openEdit(e: Expense) {
    setEditing(e);
    setShowForm(true);
  }

  async function refreshAll() {
    await Promise.all([cats.refresh(), exps.refresh()]);
  }

  async function handleSubmit(values: ExpenseFormValues) {
    setBusy(true);
    setError(null);
    try {
      if (editing) await updateExpense(editing.id, values);
      else await createExpense(values);
      await refreshAll();
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
    const expense = expenses.find((e) => e.id === id);
    if (!expense) return;
    setError(null);
    try {
      await deleteExpense(id);
      await refreshAll();
      haptic();
      setUndo(expense);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить');
    }
  }

  function handleUndoDelete() {
    const expense = undo;
    setUndo(null);
    if (!expense) return;
    createExpense({
      amount: expense.amount,
      categoryId: expense.categoryId,
      date: expense.date,
      note: expense.note,
    })
      .then(refreshAll)
      .catch((e) => setError(e instanceof Error ? e.message : 'Не удалось восстановить'));
  }

  if (loading) {
    return (
      <section className="skeleton-list">
        <div className="skeleton skeleton-card" />
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
        <h1>Расходы</h1>
        <div className="page-header-actions">
          <button className="btn-ghost" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'По дням' : 'Все расходы'}
          </button>
        </div>
      </div>

      <div className="summary-card">
        <div className="summary-block">
          <span className="summary-label">{isToday ? 'Сегодня' : 'За день'}</span>
          <span className="summary-amount">{formatMoney(animatedDay)}</span>
        </div>
        <div className="summary-block">
          <span className="summary-label">За {monthLabel}</span>
          <span className="summary-amount">{formatMoney(animatedMonth)}</span>
          {prevMonthTotal > 0 && monthDeltaPct !== null && (
            <span className={`summary-delta ${monthDelta < 0 ? 'down' : 'up'}`}>
              {monthDelta < 0 ? 'меньше' : 'больше'} на {Math.abs(monthDeltaPct)}%, чем в прошлом месяце
            </span>
          )}
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

      {!showAll && !isToday && (
        <div className="today-wrap">
          <button className="btn-ghost btn-sm" onClick={() => setSelectedDate(todayKey())}>
            Сегодня
          </button>
        </div>
      )}

      {showAll && (
        <input
          className="search-input"
          type="search"
          placeholder="Поиск по категории или заметке"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {error && <div className="error">{error}</div>}

      {showAll ? (
        groups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{query ? '🔍' : '🎉'}</div>
            <div className="empty-title">{query ? 'Ничего не найдено' : 'Пока нет расходов'}</div>
            <div className="empty-sub">{query ? 'Попробуй другой запрос' : 'Добавь свой первый расход'}</div>
          </div>
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
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  category={categoryById.get(e.categoryId)}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ))
        )
      ) : dayExpenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <div className="empty-title">Бесплатный день!</div>
          <div className="empty-sub">Поздравляем! Сегодня без расходов</div>
        </div>
      ) : (
        <div className="day-group">
          {dayExpenses.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              category={categoryById.get(e.categoryId)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
          <div className="total-row">
            <span>Итого:</span>
            <span className="expense-amount">{formatMoney(dayTotal)}</span>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Изменить расход' : 'Добавить расход'} onClose={() => setShowForm(false)} closing={closing}>
          <ExpenseForm
            categories={categories}
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
          message="Расход удалён"
          actionLabel="Отменить"
          onAction={handleUndoDelete}
          onClose={() => setUndo(null)}
        />
      )}
    </section>
  );
}

function ExpenseRow({
  expense,
  category,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  category?: Category;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="expense-row" onClick={() => onEdit(expense)}>
      <span className="expense-icon" style={{ background: category?.color }}>
        {category?.icon ?? '📦'}
      </span>
      <div className="expense-main">
        <span className="expense-name">{category?.name ?? 'Без категории'}</span>
        {expense.note && <span className="expense-note">{expense.note}</span>}
      </div>
      <span className="expense-amount">{formatMoney(expense.amount)}</span>
      <button
        className="row-delete"
        onClick={(ev) => {
          ev.stopPropagation();
          onDelete(expense.id);
        }}
        aria-label="Удалить"
      >
        ✕
      </button>
    </div>
  );
}
