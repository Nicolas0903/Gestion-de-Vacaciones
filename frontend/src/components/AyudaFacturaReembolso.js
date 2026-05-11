import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

/**
 * Icono de ayuda junto a RUC / N° de documento: al pasar el cursor muestra una factura de ejemplo
 * (imagen en `public/reembolsos-factura-ejemplo.png`). Usa portal + posición fija para no quedar
 * recortado por modales con overflow.
 */
export function AyudaUbicacionFactura() {
  const anchorRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const imgSrc = `${publicUrl}/reembolsos-factura-ejemplo.png`;

  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const panelW = Math.min(300, window.innerWidth - 24);
    let left = r.left + r.width / 2 - panelW / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - panelW - 12));
    const estH = Math.min(400, window.innerHeight * 0.66);
    let top = r.bottom + 8;
    if (top + estH > window.innerHeight - 10) {
      top = r.top - 8 - estH;
    }
    if (top < 10) top = 10;
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    place();
    const h = () => place();
    window.addEventListener('scroll', h, true);
    window.addEventListener('resize', h);
    return () => {
      window.removeEventListener('scroll', h, true);
      window.removeEventListener('resize', h);
    };
  }, [open, place]);

  const tooltip =
    open &&
    createPortal(
      <div
        role="tooltip"
        className="fixed z-[9999] w-[min(92vw,300px)] rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl pointer-events-none"
        style={{ top: pos.top, left: pos.left }}
      >
        <img
          src={imgSrc}
          alt="Ejemplo: en el encabezado, RUC del emisor; debajo del título «Factura de venta electrónica», serie y número del documento."
          className="max-h-[min(62vh,360px)] w-full rounded-md object-contain"
          loading="lazy"
        />
        <p className="mt-1 px-0.5 text-center text-[11px] leading-snug text-slate-600">
          <strong>RUC</strong>: del emisor (arriba). <strong>N° de documento</strong>: serie y número junto al título de la
          factura.
        </p>
      </div>,
      document.body
    );

  return (
    <>
      <span
        ref={anchorRef}
        className="relative inline-flex items-center align-middle"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          className="inline-flex rounded-full text-slate-400 outline-none hover:text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-400"
          aria-label="Ver ejemplo en una factura: dónde está el RUC del emisor y el número de documento"
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          <InformationCircleIcon className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </span>
      {tooltip}
    </>
  );
}
