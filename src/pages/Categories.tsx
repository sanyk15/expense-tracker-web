import { useCallback, useEffect, useState } from 'react';
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../lib/api';
import type { Category } from '../types';
import CategoryForm from '../components/CategoryForm';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCategories(await fetchCategories());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(c: Category) {
    setEditing(c);
    setShowForm(true);
  }

  async function handleSubmit(values: { name: string; icon: string; color: string }) {
    setBusy(true);
    setError(null);
    try {
      if (editing) await updateCategory(editing.id, values);
      else await createCategory(values);
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(c: Category) {
    if (!window.confirm(`Удалить категорию «${c.name}» и все её расходы?`)) return;
    setError(null);
    try {
      await deleteCategory(c.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить');
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = categories.findIndex((c) => c.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= categories.length) return;
    const a = categories[idx];
    const b = categories[j];
    const next = [...categories];
    [next[idx], next[j]] = [next[j], next[idx]];
    setCategories(next);
    setError(null);
    try {
      await Promise.all([
        updateCategory(a.id, { sort_order: b.sortOrder }),
        updateCategory(b.id, { sort_order: a.sortOrder }),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить порядок');
      load();
    }
  }

  async function sortAlphabetically() {
    const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    const next = sorted.map((c, i) => ({ ...c, sortOrder: i }));
    setCategories(next);
    setError(null);
    try {
      await Promise.all(next.map((c, i) => updateCategory(c.id, { sort_order: i })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось отсортировать');
      load();
    }
  }

  if (loading) {
    return <div className="splash">Загрузка…</div>;
  }

  return (
    <section>
      <div className="page-header">
        <h1>Категории</h1>
        <button className="btn-primary btn-sm" onClick={openAdd}>
          + Добавить
        </button>
      </div>

      <div className="toolbar">
        <button className="btn-ghost" onClick={sortAlphabetically}>
          Сортировать по алфавиту
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="category-list">
        {categories.map((c, idx) => (
          <div key={c.id} className="category-row">
            <span className="expense-icon" style={{ background: c.color }}>
              {c.icon}
            </span>
            <span className="category-name" onClick={() => openEdit(c)}>
              {c.name}
            </span>
            <div className="category-actions">
              <button
                className="icon-btn"
                disabled={idx === 0}
                onClick={() => move(c.id, -1)}
                aria-label="Вверх"
              >
                ↑
              </button>
              <button
                className="icon-btn"
                disabled={idx === categories.length - 1}
                onClick={() => move(c.id, 1)}
                aria-label="Вниз"
              >
                ↓
              </button>
              <button className="icon-btn danger" onClick={() => handleDelete(c)} aria-label="Удалить">
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Изменить категорию' : 'Новая категория'}</h2>
            <CategoryForm
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
