import { useCallback, useEffect, useRef, useState } from 'react';
import { cacheGet, cachePeek, cacheSet, onCacheChange } from '../lib/cache';

// Загружает данные: мгновенно отдаёт закешированное значение (без спиннера),
// затем в фоне обновляет с сервера и перезаписывает кеш.
// Подписывается на изменения кеша: если другая страница обновила тот же ключ,
// перечитывает значение — статистика и бюджеты не отстают от ввода.
export function useCachedData<T>(cacheKey: string, fetcher: () => Promise<T>, empty: T) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T>(() => cacheGet<T>(cacheKey) ?? empty);
  const [loading, setLoading] = useState<boolean>(() => cacheGet<T>(cacheKey) === null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const fresh = await fetcherRef.current();
      cacheSet(cacheKey, fresh);
      setData(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    return onCacheChange(cacheKey, () => {
      setData(cachePeek<T>(cacheKey) ?? empty);
      setLoading(false);
    });
  }, [cacheKey, empty]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
