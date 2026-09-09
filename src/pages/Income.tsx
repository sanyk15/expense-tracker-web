import { useCallback, useEffect, useMemo, useState } from 'react';
import { createIncome, deleteIncome, fetchIncomes, updateIncome } from '../lib/api';
import type { Income } from '../types';
import { formatDay, formatMoney } from '../lib/dates';
import IncomeForm from '../components/IncomeForm';
import type { IncomeFormValues } from '../components/IncomeForm';

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setIncomes(await fetchIncomes());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => {
    const map = new Map<string, Income[]>();
    for (const inc of incomes) {
      const list = map.get(inc.date) ?? [];
      list.push(inc);
      map.set(inc.date, list);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [incomes]);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

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
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Удалить доход?')) return;
    setError(null);
    try {
      await deleteIncome(id);
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
        <h1>Доходы</h1>
        <button className="btn-primary btn-sm" onClick={openAdd}>
          + Добавить
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {incomes.length === 0 ? (
        <div className="card muted">Пока нет доходов. Нажми «Добавить».</div>
      ) : (
        groups.map(([date, items]) => {
          const total = items.reduce((sum, i) => sum + i.amount, 0);
          return (
            <div key={date} className="day-group">
              <div className="day-header">
                <span>{formatDay(date)}</span>
                <span className="day-total day-total-income">{formatMoney(total)}</span>
              </div>
              {items.map((inc) => (
                <div key={inc.id} className="expense-row" onClick={() => openEdit(inc)}>
                  <span className="expense-icon income-icon">💰</span>
                  <div className="expense-main">
                    <span className="expense-name">{inc.note || 'Без источника'}</span>
                  </div>
                  <span className="expense-amount income-amount">{formatMoney(inc.amount)}</span>
                  <button
                    className="row-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(inc.id);
                    }}
                    aria-label="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          );
        })
      )}

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Изменить доход' : 'Новый доход'}</h2>
            <IncomeForm
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
