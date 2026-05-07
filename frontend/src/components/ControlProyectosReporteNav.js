import React from 'react';
import { Link } from 'react-router-dom';

const activeCls =
  'rounded-full px-4 py-1.5 text-sm font-medium border border-transparent bg-indigo-600 text-white shadow-sm shadow-indigo-500/25';
const idleCls =
  'rounded-full px-4 py-1.5 text-sm font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-50';

/**
 * Navegación entre vistas del reporte de control de proyectos (tipo BI).
 * @param {{ active: 'resumen'|'proyectos'|'actividades' }} props
 */
export default function ControlProyectosReporteNav({ active }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Link to="/control-proyectos/reporte" className={active === 'resumen' ? activeCls : idleCls}>
        Resumen
      </Link>
      <Link to="/control-proyectos/reporte/proyectos" className={active === 'proyectos' ? activeCls : idleCls}>
        Proyectos
      </Link>
      <Link to="/control-proyectos/reporte/actividades" className={active === 'actividades' ? activeCls : idleCls}>
        Actividades
      </Link>
    </div>
  );
}
