import React from 'react';

function fmtFecha(val) {
  if (!val) return '—';
  return String(val).slice(0, 10);
}

const CierreNegocioCronograma = ({ detalle }) => {
  const cron = detalle?.reporte?.cronograma;
  const filas = cron?.filas || [];

  if (!filas.length) {
    return (
      <div className="bg-white rounded-2xl border p-10 text-center text-slate-500 text-sm">
        Cronograma disponible cuando el cierre proviene de una cotización con actividades.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b bg-slate-50 flex justify-between">
        <h3 className="font-semibold text-slate-800">Cronograma (desde cotización)</h3>
        <span className="text-xs text-slate-500">
          Total días: {cron.total_dias ?? '—'}
          {cron.total_horas ? ` · ${cron.total_horas} h` : ''}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-teal-700 text-white text-left">
              <th className="px-4 py-2 w-12">N°</th>
              <th className="px-4 py-2">Actividades</th>
              <th className="px-4 py-2 text-right w-20">Días</th>
              <th className="px-4 py-2 w-28">De</th>
              <th className="px-4 py-2 w-28">A</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filas.map((f, i) =>
              f.tipo === 'fase' ? (
                <tr key={`f-${i}`} className="bg-teal-50 font-semibold text-teal-900">
                  <td colSpan={5} className="px-4 py-2">{f.fase}</td>
                </tr>
              ) : (
                <tr key={`a-${i}`} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-500">{f.numero}</td>
                  <td className="px-4 py-2">{f.actividad}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{f.dias ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-500">{fmtFecha(f.fecha_inicio)}</td>
                  <td className="px-4 py-2 text-slate-500">{fmtFecha(f.fecha_fin)}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-xs text-slate-400 border-t">
        Las fechas De/A se completan cuando la cotización incluye cronograma; los días se estiman desde horas ÷ 8.
      </p>
    </div>
  );
};

export default CierreNegocioCronograma;
