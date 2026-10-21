import React from 'react';
import ModalPortal from './ModalPortal';
import ManualMarkdown from './ManualMarkdown';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { descargarManualPdf } from '../utils/manualPdfExport';

export default function ManualModuloModal({
  open,
  onClose,
  titulo,
  markdown,
  fileSlug,
  loading,
  error
}) {
  const onPdf = () => {
    if (!markdown) return;
    descargarManualPdf({ titulo, markdown, fileSlug });
  };

  return (
    <ModalPortal
      open={open}
      onClose={onClose}
      title={titulo || 'Manual de usuario'}
      subtitle="Documentación oficial del módulo"
      maxWidth="max-w-3xl"
      footer={
        <div className="flex flex-wrap justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
          <button
            type="button"
            disabled={!markdown || loading}
            onClick={onPdf}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Descargar PDF
          </button>
        </div>
      }
    >
      {loading ? (
        <p className="text-slate-500 text-sm py-8 text-center">Cargando manual…</p>
      ) : error ? (
        <p className="text-rose-600 text-sm py-6">{error}</p>
      ) : (
        <ManualMarkdown markdown={markdown} />
      )}
    </ModalPortal>
  );
}
