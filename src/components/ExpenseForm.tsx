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

interface Props {
  categories: Category[];
  initial?: Expense;
  busy?: boolean;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  onCancel: () => void;
}

export default function ExpenseForm({ categories, initial, busy, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '');
  const [date, setDate] = useState(initial?.date ?? todayKey());
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
        Сумма (₽)
        <input
          inputMode="decimal"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          required
        />
      </label>

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
        Заметка
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Необязательно"
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
