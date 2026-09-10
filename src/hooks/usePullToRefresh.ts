import { useCallback, useEffect, useRef, useState } from 'react';

// Потянуть список вниз, когда он на самом верху, — обновить данные.
export function usePullToRefresh(onRefresh: () => Promise<unknown> | void) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const ref = useCallback((node: HTMLElement | null) => setEl(node), []);

  useEffect(() => {
    if (!el) return;
    const scroller = (el.parentElement ?? el) as HTMLElement;
    let startY: number | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (scroller.scrollTop <= 0 && !refreshingRef.current) {
        startY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY === null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || scroller.scrollTop > 0) {
        startY = null;
        return;
      }
      const v = Math.min(110, dy * 0.45);
      pullRef.current = v;
      setPull(v);
    };

    const onTouchEnd = () => {
      if (startY === null) return;
      startY = null;
      const v = pullRef.current;
      pullRef.current = 0;
      if (v >= 60) {
        setPull(0);
        refreshingRef.current = true;
        setRefreshing(true);
        Promise.resolve(onRefreshRef.current()).finally(() => {
          refreshingRef.current = false;
          setRefreshing(false);
        });
      } else {
        setPull(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [el]);

  return { ref, pull, refreshing };
}
