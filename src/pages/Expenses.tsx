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
import { formatDay, formatMoney } from '../lib/dates';
import ExpenseForm from '../components/ExpenseForm';
import type { ExpenseFormValues } from '../components/ExpenseForm';

export default function Expenses() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

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
        <button className="btn-primary btn-sm" onClick={openAdd}>
          + Добавить
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {expenses.length === 0 ? (
        <div className="card muted">Пока нет расходов. Нажми «Добавить», чтобы начать.</div>
      ) : (
        groups.map(([date, items]) => {
          const total = items.reduce((sum, e) => sum + e.amount, 0);
          return (
            <div key={date} className="day-group">
              <div className="day-header">
                <span>{formatDay(date)}</span>
                <span className="day-total">{formatMoney(total)}</span>
              </div>
              {items.map((e) => {
                const cat = categoryById.get(e.categoryId);
                return (
                  <div key={e.id} className="expense-row" onClick={() => openEdit(e)}>
                    <span className="expense-icon" style={{ background: cat?.color }}>
                      {cat?.icon ?? '📦'}
                    </span>
                    <div className="expense-main">
                      <span className="expense-name">{cat?.name ?? 'Без категории'}</span>
                      {e.note && <span className="expense-note">{e.note}</span>}
                    </div>
                    <span className="expense-amount">{formatMoney(e.amount)}</span>
                    <button
                      className="row-delete"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        handleDelete(e.id);
                      }}
                      aria-label="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Изменить расход' : 'Новый расход'}</h2>
            <ExpenseForm
              categories={categories}
              initial={editing ?? undefined}
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
