import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Category, Expense } from '../types';
import { todayKey } from '../lib/dates';

export interface ExpenseFormValues {
  amount: number;
  categoryId: string;
  date: string;
  note: string;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];

interface Props {
  categories: Category[];
  initial?: Expense;
  defaultDate?: string;
  busy?: boolean;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  onCancel: () => void;
}

export default function ExpenseForm({
  categories,
  initial,
  defaultDate,
  busy,
  onSubmit,
  onCancel,
}: Props) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? todayKey());
  const [note, setNote] = useState(initial?.note ?? '');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return;
    await onSubmit({ amount: value, categoryId, date, note });
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <label>
        Сумма
        <input
          inputMode="decimal"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          required
        />
      </label>

      <div className="quick-amounts">
        {QUICK_AMOUNTS.map((v) => (
          <button key={v} type="button" className="quick-amount" onClick={() => setAmount(String(v))}>
            {v}
          </button>
        ))}
      </div>

      <label>
        Категория
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Дата
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label>
        Примечание (опционально)
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Добавь описание"
        />
      </label>

      <div className="form-actions">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Отмена
        </button>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </div>
    </form>
  );
}
