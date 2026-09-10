import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { buildExport, downloadExport, importBackup } from '../lib/backup';
import { fetchBudgets, fetchCategories, fetchExpenses, fetchIncomes } from '../lib/api';

interface Counts {
  categories: number;
  expenses: number;
  incomes: number;
  budgets: number;
}

const THEME_LABELS: Record<'light' | 'dark' | 'system', string> = {
  light: 'Светлая',
  dark: 'Тёмная',
  system: 'Системная',
};

export default function SettingsPage() {
  const { preference, setPreference } = useTheme();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [compact, setCompact] = useState(() => localStorage.getItem('compactList') === '1');

  function toggleCompact() {
    const next = !compact;
    setCompact(next);
    localStorage.setItem('compactList', next ? '1' : '0');
    if (next) document.documentElement.setAttribute('data-compact', 'true');
    else document.documentElement.removeAttribute('data-compact');
  }

  async function refreshCounts() {
    try {
      const [c, e, i, b] = await Promise.all([
        fetchCategories(),
        fetchExpenses(),
        fetchIncomes(),
        fetchBudgets(),
      ]);
      setCounts({ categories: c.length, expenses: e.length, incomes: i.length, budgets: b.length });
    } catch {
      // счётчики не критичны
    }
  }

  useEffect(() => {
    refreshCounts();
  }, []);

  async function handleExport() {
    setMessage(null);
    try {
      const bundle = await buildExport();
      downloadExport(bundle);
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Не удалось экспортировать' });
    }
  }

  async function handleFile(file: File) {
    if (!window.confirm('Импорт заменит все текущие данные. Продолжить?')) return;
    setBusy(true);
    setMessage(null);
    try {
      const text = await file.text();
      const result = await importBackup(text);
      setMessage({
        type: 'ok',
        text: `Импортировано: категорий ${result.categories}, расходов ${result.expenses}, доходов ${result.incomes}, бюджетов ${result.budgets}.`,
      });
      await refreshCounts();
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Не удалось импортировать' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="page-header">
        <h1>Настройки</h1>
      </div>

      <div className="settings-section card">
        <h2>Тема</h2>
        <div className="tabs">
          {(['light', 'dark', 'system'] as const).map((p) => (
            <button
              key={p}
              className={`tab-pill${preference === p ? ' active' : ''}`}
              onClick={() => setPreference(p)}
            >
              {THEME_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section card">
        <h2>Вид</h2>
        <button className="btn-ghost" onClick={toggleCompact}>
          Компактный список: {compact ? 'вкл' : 'выкл'}
        </button>
      </div>

      <div className="settings-section card">
        <h2>Данные</h2>
        {counts && (
          <p className="muted">
            Категорий: {counts.categories} · Расходов: {counts.expenses} · Доходов:{' '}
            {counts.incomes} · Бюджетов: {counts.budgets}
          </p>
        )}
        <div className="settings-actions">
          <button className="btn-primary" onClick={handleExport}>
            Экспорт (JSON)
          </button>
          <button
            className="btn-ghost"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? 'Импортируем…' : 'Импорт (JSON)'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Импорт заменит текущие данные. Подходит файл экспорта iOS-приложения Finansy
          или этого приложения.
        </p>
      </div>

      {message && (
        <div className={message.type === 'ok' ? 'notice-ok' : 'error'}>{message.text}</div>
      )}
    </section>
  );
}
