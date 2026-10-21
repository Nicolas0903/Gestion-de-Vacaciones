import React, { useCallback, useEffect, useId, useState } from 'react';
import {
  ArrowDownTrayIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { obtenerGuiaModulo } from '../content/guiasModuloPortal';
import { slugManualModulo, urlManualModulo } from '../content/manualModuloSlug';
import { descargarManualPdf } from '../utils/manualPdfExport';
import ManualModuloModal from './ManualModuloModal';

/**
 * Ayuda del módulo: guía rápida, manual completo en pantalla y descarga PDF.
 * @param {{ moduloId: string, variant?: string, className?: string }} props
 */
export default function GuiaModuloUso({ moduloId, variant, className = '' }) {
  const guia = obtenerGuiaModulo(moduloId, variant);
  const storageKey = `portal-guia-open:${moduloId}:${variant || 'default'}`;
  const panelId = useId();
  const manualSlug = slugManualModulo(moduloId);
  const manualUrl = urlManualModulo(moduloId);

  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [manualMd, setManualMd] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState('');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved === '1') setOpen(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  const cargarManual = useCallback(async () => {
    if (!manualUrl) {
      setManualError('No hay manual publicado para este módulo.');
      return null;
    }
    if (manualMd) return manualMd;
    setManualLoading(true);
    setManualError('');
    try {
      const res = await fetch(manualUrl, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      setManualMd(text);
      return text;
    } catch {
      setManualError('No se pudo cargar el manual. Avise a administración del portal.');
      return null;
    } finally {
      setManualLoading(false);
    }
  }, [manualUrl, manualMd]);

  useEffect(() => {
    if (!manualUrl || manualMd) return undefined;
    let cancelled = false;
    setManualLoading(true);
    fetch(manualUrl, { cache: 'no-cache' })
      .then((res) => {
        if (!res.ok) throw new Error('fetch');
        return res.text();
      })
      .then((text) => {
        if (!cancelled) setManualMd(text);
      })
      .catch(() => {
        if (!cancelled) {
          setManualError('No se pudo cargar el manual. Avise a administración del portal.');
        }
      })
      .finally(() => {
        if (!cancelled) setManualLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [manualUrl, manualMd]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      try {
        sessionStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [storageKey]);

  const abrirManual = useCallback(async () => {
    const md = await cargarManual();
    if (md) setModalOpen(true);
  }, [cargarManual]);

  const descargarPdf = useCallback(async () => {
    const md = manualMd || (await cargarManual());
    if (!md) {
      toast.error('Manual no disponible');
      return;
    }
    const titulo =
      guia?.titulo || md.match(/^#\s+(.+)/m)?.[1]?.replace(/\s*—.*/, '') || 'Manual';
    try {
      descargarManualPdf({ titulo, markdown: md, fileSlug: manualSlug || moduloId });
      toast.success('PDF descargado');
    } catch {
      toast.error('No se pudo generar el PDF');
    }
  }, [manualMd, cargarManual, guia, manualSlug, moduloId]);

  if (!guia && !manualSlug) return null;

  return (
    <>
      <div
        className={`rounded-xl border border-teal-100/80 bg-gradient-to-r from-teal-50/90 to-cyan-50/50 ${className}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <span className="text-xs font-medium text-teal-800/80 uppercase tracking-wide">
            Ayuda del módulo
          </span>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            {guia ? (
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-controls={panelId}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-900 rounded-lg px-2 py-1 hover:bg-white/60 transition-colors"
              >
                <BookOpenIcon className="w-4 h-4 shrink-0" />
                Guía rápida
                {open ? (
                  <ChevronUpIcon className="w-4 h-4 shrink-0" aria-hidden />
                ) : (
                  <ChevronDownIcon className="w-4 h-4 shrink-0" aria-hidden />
                )}
              </button>
            ) : null}
            {manualSlug ? (
              <>
                <button
                  type="button"
                  onClick={abrirManual}
                  disabled={manualLoading}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-teal-800 rounded-lg px-2 py-1 hover:bg-white/60 transition-colors disabled:opacity-50"
                >
                  <DocumentTextIcon className="w-4 h-4 shrink-0" />
                  Manual completo
                </button>
                <button
                  type="button"
                  onClick={descargarPdf}
                  disabled={manualLoading}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-teal-800 rounded-lg px-2 py-1 hover:bg-white/60 transition-colors disabled:opacity-50"
                >
                  <ArrowDownTrayIcon className="w-4 h-4 shrink-0" />
                  PDF
                </button>
              </>
            ) : null}
          </div>
        </div>

        {guia && open ? (
          <div id={panelId} className="px-4 pb-4 pt-0 border-t border-teal-100/60">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">{guia.titulo}</h2>
            <p className="text-sm text-slate-600 mb-3">{guia.intro}</p>
            {guia.pasos?.length ? (
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-700">
                {guia.pasos.map((paso) => (
                  <li key={paso} className="leading-snug">
                    {paso}
                  </li>
                ))}
              </ol>
            ) : null}
            {manualSlug ? (
              <p className="mt-3 text-xs text-slate-500">
                Use <strong className="font-medium">Manual completo</strong> para ver el documento
                íntegro o <strong className="font-medium">PDF</strong> para guardarlo.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <ManualModuloModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        titulo={guia?.titulo}
        markdown={manualMd}
        fileSlug={manualSlug || moduloId}
        loading={manualLoading}
        error={manualError}
      />
    </>
  );
}
