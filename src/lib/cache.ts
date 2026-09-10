// Локальный кеш в localStorage — чтобы приложение открывалось мгновенно,
// а данные докачивались в фоне.

const PREFIX = 'finansy_cache_';

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function cacheSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // превышение квоты localStorage — кеш некритичен, игнорируем
  }
}

export function cacheClear(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}
