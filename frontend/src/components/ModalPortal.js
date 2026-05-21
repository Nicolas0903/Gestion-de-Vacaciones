import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Modal en document.body (evita que .glass / transform del padre recorte position:fixed).
 */
export default function ModalPortal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-5xl'
}) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] overflow-y-auto overflow-x-hidden bg-black/55"
      role="presentation"
      onClick={onClose}
    >
      <div className="flex min-h-full justify-center items-start sm:items-center p-4 sm:p-8">
        <div
          role="dialog"
          aria-modal="true"
          className={`relative w-full ${maxWidth} my-2 sm:my-4`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-slate-100 bg-white">
              <div className="min-w-0 pr-2">
                {title ? (
                  <h2 className="text-lg font-bold text-slate-800">{title}</h2>
                ) : null}
                {subtitle ? <p className="text-sm text-slate-600 mt-1">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 shrink-0"
                aria-label="Cerrar"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5 max-h-[calc(100dvh-11rem)] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
              {children}
            </div>

            {footer ? (
              <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap gap-3">
                {footer}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
