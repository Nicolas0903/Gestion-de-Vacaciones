import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/** Banner superior en páginas del flujo cotización. */
const CotizacionFlujoPageBanner = ({ paso, puedeIrSolicitud, puedeIrCotizaciones }) => {
  const esPaso1 = paso === 1;

  return (
    <div
      className={`mb-5 rounded-2xl border px-4 py-3 sm:px-5 sm:py-4 ${
        esPaso1 ? 'border-indigo-200 bg-indigo-50/70' : 'border-sky-200 bg-sky-50/70'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-wide ${esPaso1 ? 'text-indigo-700' : 'text-sky-700'}`}>
            {esPaso1 ? 'Paso 1 de 2' : 'Paso 2 de 2'}
          </p>
          <p className={`font-semibold ${esPaso1 ? 'text-indigo-950' : 'text-sky-950'}`}>
            {esPaso1
              ? 'Pedir cotización (información comercial)'
              : 'Elaborar cotización (costos, propuesta y versiones)'}
          </p>
          <p className="text-xs mt-1 text-slate-600 max-w-2xl">
            {esPaso1
              ? 'Completa cliente, proyecto y responsables. Al enviar, el equipo recibe un correo. No es la hoja de costos.'
              : 'Trabaja la propuesta técnica y comercial. Si solo querías pedir al equipo, volvé al Paso 1.'}
          </p>
        </div>
        {esPaso1 && puedeIrCotizaciones && (
          <Link
            to="/cotizaciones"
            className="inline-flex items-center gap-1 shrink-0 text-sm font-semibold text-sky-800 hover:underline"
          >
            Me asignaron elaborar
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        )}
        {!esPaso1 && puedeIrSolicitud && (
          <Link
            to="/solicitud-cotizacion"
            className="inline-flex items-center gap-1 shrink-0 text-sm font-semibold text-indigo-800 hover:underline"
          >
            Crear pedido comercial
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
};

export default CotizacionFlujoPageBanner;
