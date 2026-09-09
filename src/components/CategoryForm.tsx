import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Category } from '../types';

const EMOJIS = [
  '🍔', '🚗', '🎬', '🛍️', '💊', '🏠', '📦', '☕',
  '🎁', '✈️', '🐶', '💄', '📱', '🎮', '🏋️', '📚',
  '🧾', '🚕', '🍕', '👶', '💼', '🎓', '🏖️', '🌸',
];

const COLORS = [
  '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444',
  '#14b8a6', '#6b7280', '#22c55e', '#eab308', '#0ea5e9',
];

interface Props {
  initial?: Category;
  busy?: boolean;
  onSubmit: (values: { name: string; icon: string; color: string }) => Promise<void>;
  onCancel: () => void;
}

export default function CategoryForm({ initial, busy, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '📦');
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await onSubmit({ name: trimmed, icon, color });
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <label>
        Название
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например, Кофе"
          required
        />
      </label>

      <div className="field-group">
        <span className="field-label">Иконка</span>
        <div className="emoji-grid">
          {EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              className={`emoji-option${icon === em ? ' selected' : ''}`}
              onClick={() => setIcon(em)}
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <span className="field-label">Цвет</span>
        <div className="color-grid">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-option${color === c ? ' selected' : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={c}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="color-custom"
            aria-label="Свой цвет"
          />
        </div>
      </div>

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
