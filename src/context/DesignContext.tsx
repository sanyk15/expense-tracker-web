import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface DesignContextValue {
  v2: boolean;
  toggle: () => void;
}

const STORAGE_KEY = 'design';

const DesignContext = createContext<DesignContextValue | undefined>(undefined);

export function DesignProvider({ children }: { children: ReactNode }) {
  const [v2, setV2] = useState<boolean>(() => localStorage.getItem(STORAGE_KEY) === 'v2');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, v2 ? 'v2' : '');
    if (v2) document.documentElement.setAttribute('data-design', 'v2');
    else document.documentElement.removeAttribute('data-design');
  }, [v2]);

  return (
    <DesignContext.Provider value={{ v2, toggle: () => setV2((v) => !v) }}>
      {children}
    </DesignContext.Provider>
  );
}

export function useDesign(): DesignContextValue {
  const ctx = useContext(DesignContext);
  if (!ctx) throw new Error('useDesign must be used within DesignProvider');
  return ctx;
}
