import React from 'react';
import { Link } from 'react-router-dom';
import { BanknotesIcon, ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

/**
 * Vista administración — reembolsos (placeholder).
 */
const GestionReembolsos = () => {
  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/portal"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600 mb-8 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al portal
      </Link>

      <div className="rounded-3xl bg-white border border-slate-100 shadow-lg p-8 md:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0">
            <Cog6ToothIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Gestión de reembolsos</h1>
            <p className="text-sm text-slate-500">Administración · Contaduría</p>
          </div>
        </div>
        <p className="text-slate-600 mb-6">
          Panel para revisar, aprobar y registrar reembolsos del personal. Las reglas de negocio,
          reportes e integración con otros módulos se configurarán en la siguiente iteración.
        </p>
        <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-5 py-4 text-sm text-indigo-900">
          <p className="font-medium text-indigo-800 mb-1 flex items-center gap-2">
            <BanknotesIcon className="w-4 h-4" />
            Pendiente de implementación
          </p>
          <p className="text-indigo-700/90">
            Listados, filtros, exportación y permisos por rol se añadirán cuando cerremos el proceso
            con el equipo.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GestionReembolsos;
