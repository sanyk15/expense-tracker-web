// Локальный кеш в localStorage — чтобы приложение открывалось мгновенно,
// а данные докачивались в фоне. Плюс подписки в памяти: когда одна страница
// обновила данные (добавила расход и т.п.), остальные страницы с тем же ключом
// перечитывают их — так статистика и бюджеты не отстают от ввода.

const PREFIX = 'finansy_cache_';

// In-memory хранилище: держит последний записанный объект по ссылке,
// чтобы подписчики не парсили JSON заново и не перерендеривались зря.
const memory = new Map<string, unknown>();
const listeners = new Map<string, Set<() => void>>();

function notify(key: string): void {
  const set = listeners.get(key);
  if (!set) return;
  for (const fn of [...set]) fn();
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function cacheSet(key: string, value: unknown): void {
  memory.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // превышение квоты localStorage — кеш некритичен, игнорируем
  }
  notify(key);
}

// Значение из in-memory кеша (та же ссылка, что записали последней) — для подписчиков.
export function cachePeek<T>(key: string): T | null {
  return (memory.get(key) as T | null) ?? null;
}

export function onCacheChange(key: string, fn: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(fn);
  return () => {
    set.delete(fn);
  };
}

export function cacheClear(key: string): void {
  memory.delete(key);
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
  notify(key);
}
