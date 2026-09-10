import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ADD_EVENT } from '../lib/addEvent';

// Подписывается на кнопку «+» из навбара, когда активен один из указанных маршрутов.
export function useAddShortcut(paths: string[], onAdd: () => void) {
  const { pathname } = useLocation();
  const onAddRef = useRef(onAdd);
  onAddRef.current = onAdd;
  const pathsKey = paths.join('|');

  useEffect(() => {
    if (!paths.includes(pathname)) return;
    const handler = () => onAddRef.current();
    window.addEventListener(ADD_EVENT, handler);
    return () => window.removeEventListener(ADD_EVENT, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, pathsKey]);
}
