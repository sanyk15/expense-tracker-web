import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Модалка рендерится через портал в document.body, чтобы не попадать под
// overflow/скролл контейнера .content и всегда быть поверх нижней панели.
export default function Modal({ title, onClose, children }: Props) {
  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
