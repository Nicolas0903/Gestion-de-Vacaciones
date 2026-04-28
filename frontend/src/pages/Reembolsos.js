import React from 'react';
import { Link } from 'react-router-dom';
import { BanknotesIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

/**
 * Módulo Gestión de reembolsos — vista empleado.
 * La lógica de solicitudes y flujos se irá incorporando por fases.
 */
const Reembolsos = () => {
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
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 mb-6">
          <BanknotesIcon className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Gestión de reembolsos</h1>
        <p className="text-slate-600 mb-6">
          Aquí podrás registrar y dar seguimiento a tus solicitudes de reembolso de gastos. Estamos
          preparando el flujo completo junto con Recursos Humanos y contaduría.
        </p>
        <div className="rounded-2xl bg-sky-50 border border-sky-100 px-5 py-4 text-sm text-sky-900">
          <p className="font-medium text-sky-800 mb-1">Próximos pasos</p>
          <p className="text-sky-700/90">
            Definiremos tipos de gasto, montos, comprobantes y aprobaciones. Mientras tanto, si
            necesitas un reembolso urgente, coordina con tu área y contaduría por los canales
            habituales.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reembolsos;
