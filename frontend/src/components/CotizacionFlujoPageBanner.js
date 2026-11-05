import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

/** Guía del flujo (solo dentro de Solicitud / Cotizaciones), colapsada por defecto. */
const CotizacionFlujoPageBanner = ({ paso, puedeIrSolicitud, puedeIrCotizaciones }) => {
  const esPaso1 = paso === 1;

  return (
    <details className="mb-4 rounded-lg border border-slate-200 bg-slate-50/90 group open:shadow-sm">
      <summary className="cursor-pointer list-none px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-2 min-w-0">
          <ChevronDownIcon className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
          <span className="font-medium text-slate-800">Guía del proceso</span>
          <span className="text-slate-500 truncate">
            · {esPaso1 ? 'Paso 1 — Pedir cotización' : 'Paso 2 — Elaborar cotización'}
          </span>
        </span>
        <span className="flex flex-wrap gap-3 text-xs font-semibold shrink-0">
          {esPaso1 && puedeIrCotizaciones && (
            <Link
              to="/cotizaciones"
              className="text-sky-700 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Ir a Paso 2
            </Link>
          )}
          {!esPaso1 && puedeIrSolicitud && (
            <Link
              to="/solicitud-cotizacion"
              className="text-indigo-700 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Ir a Paso 1
            </Link>
          )}
        </span>
      </summary>

      <div className="px-3 pb-3 pt-1 border-t border-slate-200/80 text-sm">
        <p className="text-xs text-slate-600 mb-3">
          {esPaso1
            ? 'Aquí solo va la información comercial del cliente. Los costos y la propuesta se arman en el Paso 2.'
            : 'Aquí elaboras costos, propuesta y versiones. Si solo debías pedir al equipo, vuelve al Paso 1.'}
        </p>
        <div className="grid gap-2 text-xs sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
          <div
            className={`rounded-lg border p-2.5 ${
              esPaso1 ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200' : 'border-indigo-200 bg-indigo-50/60'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">Paso 1</span>
            <p className="font-medium text-indigo-950 mt-0.5">Pedir cotización</p>
            <p className="text-indigo-900/80 mt-0.5">Comercial / quien conoce al cliente</p>
          </div>
          <div className="hidden sm:flex items-center justify-center text-slate-400 px-1">
            <ArrowRightIcon className="w-4 h-4" />
          </div>
          <div
            className={`rounded-lg border p-2.5 ${
              !esPaso1 ? 'border-sky-300 bg-sky-50 ring-1 ring-sky-200' : 'border-sky-200 bg-sky-50/60'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700">Paso 2</span>
            <p className="font-medium text-sky-950 mt-0.5">Elaborar cotización</p>
            <p className="text-sky-900/80 mt-0.5">Equipo asignado (costos y propuesta)</p>
          </div>
        </div>
      </div>
    </details>
  );
};

export default CotizacionFlujoPageBanner;
