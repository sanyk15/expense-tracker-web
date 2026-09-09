import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Income } from '../types';
import { todayKey } from '../lib/dates';

export interface IncomeFormValues {
  amount: number;
  date: string;
  note: string;
}

interface Props {
  initial?: Income;
  busy?: boolean;
  onSubmit: (values: IncomeFormValues) => Promise<void>;
  onCancel: () => void;
}

export default function IncomeForm({ initial, busy, onSubmit, onCancel }: Props) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [date, setDate] = useState(initial?.date ?? todayKey());
  const [note, setNote] = useState(initial?.note ?? '');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return;
    await onSubmit({ amount: value, date, note });
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
        Дата
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>

      <label>
        Источник / заметка
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Зарплата, подработка…"
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
