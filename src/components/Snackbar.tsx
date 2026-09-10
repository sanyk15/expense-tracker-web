import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  duration?: number;
}

export default function Snackbar({ message, actionLabel, onAction, onClose, duration = 5000 }: Props) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const t = window.setTimeout(() => onCloseRef.current(), duration);
    return () => window.clearTimeout(t);
  }, [duration]);

  return createPortal(
    <div className="snackbar" role="status">
      <span className="snackbar-text">{message}</span>
      {actionLabel && (
        <button
          className="snackbar-action"
          onClick={() => {
            onAction?.();
            onCloseRef.current();
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>,
    document.body,
  );
}
