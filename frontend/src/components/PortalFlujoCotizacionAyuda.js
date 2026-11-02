import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * Ayuda visual en portal: diferencia pedido comercial vs elaboración técnica.
 */
const PortalFlujoCotizacionAyuda = ({ tieneSolicitud, tieneCotizaciones, compact = false }) => {
  if (!tieneSolicitud && !tieneCotizaciones) return null;

  if (tieneSolicitud && !tieneCotizaciones) {
    return (
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-3 text-sm text-indigo-950">
        <p className="font-semibold">¿Necesitas que cotice el equipo?</p>
        <p className="text-xs mt-1 text-indigo-900/85">
          Usa <strong>Paso 1 · Pedir cotización</strong> abajo. No llenes costos aquí: solo datos del cliente y
          proyecto.
        </p>
      </div>
    );
  }

  if (tieneCotizaciones && !tieneSolicitud) {
    return (
      <div className="rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm text-sky-950">
        <p className="font-semibold">¿Te asignaron elaborar una propuesta?</p>
        <p className="text-xs mt-1 text-sky-900/85">
          Entra a <strong>Paso 2 · Elaborar cotización</strong>. Si aún no hay pedido comercial, pide a ventas que
          registre la solicitud primero.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${
        compact ? 'px-3 py-2.5' : 'px-4 py-4'
      }`}
    >
      <p className={`font-semibold text-slate-800 ${compact ? 'text-sm' : 'text-[15px]'}`}>
        Proceso de cotización — ¿a dónde voy?
      </p>
      <div className={`mt-3 grid gap-2 ${compact ? 'text-xs' : 'text-sm'} sm:grid-cols-[1fr_auto_1fr] sm:items-stretch`}>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-700">Paso 1</span>
          <p className="font-medium text-indigo-950 mt-0.5">Pedir cotización</p>
          <p className="text-xs text-indigo-900/80 mt-1">Comercial / quien conoce al cliente</p>
        </div>
        <div className="hidden sm:flex items-center justify-center text-slate-400 px-1">
          <ArrowRightIcon className="w-5 h-5" />
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700">Paso 2</span>
          <p className="font-medium text-sky-950 mt-0.5">Elaborar cotización</p>
          <p className="text-xs text-sky-900/80 mt-1">Equipo asignado (costos y propuesta)</p>
        </div>
      </div>
      {!compact && (
        <p className="text-xs text-slate-500 mt-3">
          Son dos módulos distintos. Si solo envías el pedido, quédate en el Paso 1. Si te llegó un correo como
          responsable, usa el Paso 2.
        </p>
      )}
      {compact && (
        <div className="flex flex-wrap gap-3 mt-2">
          <Link to="/solicitud-cotizacion" className="text-xs font-semibold text-indigo-700 hover:underline">
            Ir a Paso 1
          </Link>
          <Link to="/cotizaciones" className="text-xs font-semibold text-sky-700 hover:underline">
            Ir a Paso 2
          </Link>
        </div>
      )}
    </div>
  );
};

export default PortalFlujoCotizacionAyuda;
