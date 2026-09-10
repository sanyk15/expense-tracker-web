import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createExpense,
  deleteExpense,
  ensureDefaultCategories,
  fetchCategories,
  fetchExpenses,
  updateExpense,
} from '../lib/api';
import type { Category, Expense } from '../types';
import { addDays, formatDay, formatMoney, todayKey } from '../lib/dates';
import ExpenseForm from '../components/ExpenseForm';
import type { ExpenseFormValues } from '../components/ExpenseForm';

export default function Expenses() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureDefaultCategories();
      const [cats, exps] = await Promise.all([fetchCategories(), fetchExpenses()]);
      setCategories(cats);
      setExpenses(exps);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const dayExpenses = useMemo(
    () => expenses.filter((e) => e.date === selectedDate),
    [expenses, selectedDate],
  );

  const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(e: Expense) {
    setEditing(e);
    setShowForm(true);
  }

  async function handleSubmit(values: ExpenseFormValues) {
    setBusy(true);
    setError(null);
    try {
      if (editing) await updateExpense(editing.id, values);
      else await createExpense(values);
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Удалить расход?')) return;
    setError(null);
    try {
      await deleteExpense(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить');
    }
  }

  if (loading) {
    return <div className="splash">Загрузка…</div>;
  }

  return (
    <section>
      <div className="page-header">
        <h1>Расходы</h1>
        <div className="page-header-actions">
          <button className="btn-ghost" onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'По дням' : 'Все расходы'}
          </button>
          <button className="btn-primary btn-sm" onClick={openAdd}>
            + Добавить
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
            <span className="date-nav-label">{formatDay(selectedDate)}</span>
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
            <div className="empty-icon">🎉</div>
            <div className="empty-title">Пока нет расходов</div>
            <div className="empty-sub">Добавь свой первый расход</div>
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
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Изменить расход' : 'Добавить расход'}</h2>
            <ExpenseForm
              categories={categories}
              initial={editing ?? undefined}
              defaultDate={selectedDate}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              busy={busy}
            />
          </div>
        </div>
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
