import { useEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../lib/api';
import type { Category } from '../types';
import CategoryForm from '../components/CategoryForm';
import Modal from '../components/Modal';
import { useCachedData } from '../hooks/useCachedData';
import { useAddShortcut } from '../hooks/useAddShortcut';
import { haptic } from '../lib/haptics';

export default function CategoriesPage() {
  const { data: categories, loading, refresh } = useCachedData<Category[]>('categories', fetchCategories, []);

  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [order, setOrder] = useState<Category[]>(categories);
  const orderRef = useRef<Category[]>(categories);
  const movedRef = useRef(false);

  useEffect(() => {
    setOrder(categories);
    orderRef.current = categories;
  }, [categories]);

  function openAdd() {
    setEditing(null);
    setShowForm(true);
  }

  useAddShortcut(['/categories'], openAdd);

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
      await refresh();
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
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить');
    }
  }

  async function commitOrder(next: Category[]) {
    setError(null);
    try {
      await Promise.all(next.map((c, i) => updateCategory(c.id, { sort_order: i })));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить порядок');
      refresh();
    }
  }

  function onHandlePointerDown(e: PointerEvent<HTMLSpanElement>, c: Category) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    movedRef.current = false;
    setDraggingId(c.id);
    haptic();
  }

  function onHandlePointerMove(e: PointerEvent<HTMLSpanElement>) {
    if (!draggingId) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest('[data-cat-id]') as HTMLElement | null;
    const overId = row?.dataset.catId;
    if (!overId || overId === draggingId) return;
    movedRef.current = true;
    setOrder((prev) => {
      const from = prev.findIndex((c) => c.id === draggingId);
      const to = prev.findIndex((c) => c.id === overId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      orderRef.current = next;
      return next;
    });
  }

  function onHandlePointerUp() {
    if (!draggingId) return;
    setDraggingId(null);
    if (movedRef.current) commitOrder(orderRef.current);
  }

  async function sortAlphabetically() {
    const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    setOrder(sorted);
    orderRef.current = sorted;
    await commitOrder(sorted);
  }

  if (loading) {
    return <div className="splash">Загрузка…</div>;
  }

  return (
    <section>
      <div className="page-header">
        <h1>Категории</h1>
      </div>

      <div className="toolbar">
        <button className="btn-ghost" onClick={sortAlphabetically}>
          Сортировать по алфавиту
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          Удерживай ≡, чтобы перетащить
        </span>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="category-list">
        {order.map((c) => (
          <div key={c.id} className={`category-row${draggingId === c.id ? ' dragging' : ''}`} data-cat-id={c.id}>
            <span
              className="drag-handle"
              onPointerDown={(e) => onHandlePointerDown(e, c)}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              aria-label="Перетащить"
            >
              ≡
            </span>
            <span className="expense-icon" style={{ background: c.color }}>
              {c.icon}
            </span>
            <span className="category-name" onClick={() => openEdit(c)}>
              {c.name}
            </span>
            <div className="category-actions">
              <button className="icon-btn danger" onClick={() => handleDelete(c)} aria-label="Удалить">
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title={editing ? 'Изменить категорию' : 'Новая категория'} onClose={() => setShowForm(false)}>
          <CategoryForm
            initial={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            busy={busy}
          />
        </Modal>
      )}
    </section>
  );
}
