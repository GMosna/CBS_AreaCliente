'use client';

import { useEffect, ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  // Fecha ao pressionar Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Trava o scroll do body enquanto aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title && (
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '26px',
              letterSpacing: '1px',
              marginBottom: '24px',
            }}
          >
            {title}
          </h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="modal-close"
          onClick={onClose}
          aria-label="Fechar modal"
        >
          ✕
        </Button>
        {children}
      </div>
    </div>
  );
}
