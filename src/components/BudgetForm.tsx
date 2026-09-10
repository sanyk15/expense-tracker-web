import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Category } from '../types';
import Modal from './Modal';

interface Props {
  category: Category;
  currentLimit: number;
  onSubmit: (category: Category, limit: number) => Promise<void>;
  onCancel: () => void;
}

export default function BudgetForm({ category, currentLimit, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(currentLimit > 0 ? String(currentLimit) : '');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const num = Number(value.replace(',', '.'));
    await onSubmit(category, Number.isFinite(num) && num >= 0 ? num : 0);
    setBusy(false);
  }

  return (
    <Modal title={`Лимит: ${category.icon} ${category.name}`} onClose={onCancel}>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          Лимит на месяц (₽)
          <input
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="0"
          />
        </label>
        <p className="muted">Укажи 0, чтобы убрать лимит.</p>
        <div className="form-actions">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Отмена
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
