import { useLayoutEffect, useRef } from 'react';

// Помнит положение прокрутки контейнера между размонтированием и монтированием.
// Нужно, чтобы при уходе на детальную страницу (например, категорию) и возврате
// страница оставалась на том же месте, а не прыгала в начало.
const positions = new Map<string, number>();

export function useScrollRestore(key: string) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const saved = positions.get(key);
    if (saved !== undefined) {
      el.scrollTop = saved;
    }

    const onScroll = () => {
      positions.set(key, el.scrollTop);
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      el.removeEventListener('scroll', onScroll);
      positions.set(key, el.scrollTop);
    };
  }, [key]);

  return ref;
}
