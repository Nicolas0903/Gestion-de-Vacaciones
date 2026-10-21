import React from 'react';

const CierreNegocioActividades = ({ detalle }) => {
  const act = detalle?.reporte?.actividades;
  const filas = act?.filas || [];
  const resumen = act?.propuesta_resumen;

  if (!filas.length) {
    return (
      <div className="bg-white rounded-2xl border p-10 text-center text-slate-500 text-sm">
        {detalle?.cierre?.cotizacion_id
          ? 'La cotización vinculada no tiene actividades cargadas.'
          : 'Vincula una cotización o carga actividades manualmente en hojas de costo.'}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b bg-slate-50 flex flex-wrap justify-between items-center gap-2">
        <h3 className="font-semibold text-slate-800">Actividades (desde cotización + propuesta)</h3>
        <span className="text-xs text-slate-500">
          {act.tipo_estructura} · {act.total_horas ? `${act.total_horas} h totales` : ''}
          {resumen?.monto ? ` · Propuesta S/ ${Number(resumen.monto).toLocaleString('es-PE')}` : ''}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-teal-700 text-white text-left">
            <th className="px-4 py-2 w-16">N°</th>
            <th className="px-4 py-2">Actividades</th>
            <th className="px-4 py-2 text-right w-24">Días</th>
            <th className="px-4 py-2 text-right w-24">Horas</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {filas.map((f, i) =>
            f.tipo === 'fase' ? (
              <tr key={`f-${i}`} className="bg-teal-50 font-semibold text-teal-900">
                <td className="px-4 py-2" colSpan={4}>{f.fase || f.actividad}</td>
              </tr>
            ) : f.tipo === 'hito' ? (
              <tr key={`h-${i}`} className="bg-amber-50/60 text-sm">
                <td className="px-4 py-2 text-slate-400">—</td>
                <td className="px-4 py-2">
                  {f.actividad}
                  {f.porcentaje != null ? ` (${f.porcentaje}%)` : ''}
                </td>
                <td className="px-4 py-2 text-right" colSpan={2}>
                  {f.monto ? `S/ ${Number(f.monto).toFixed(2)}` : '—'}
                </td>
              </tr>
            ) : (
              <tr key={`a-${i}`} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-500">{f.numero}</td>
                <td className="px-4 py-2">{f.actividad}</td>
                <td className="px-4 py-2 text-right tabular-nums">{f.dias ?? '—'}</td>
                <td className="px-4 py-2 text-right tabular-nums">{f.horas ?? '—'}</td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CierreNegocioActividades;
