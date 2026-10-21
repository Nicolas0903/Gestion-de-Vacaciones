import React, { useEffect, useState } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { formatoMontoRendicion, normalizarMonedaRendicion } from '../../utils/monedaRendicion';

const inp = 'w-full border border-slate-200 rounded px-2 py-1 text-sm';
const inpNum = `${inp} text-right tabular-nums`;

function nuevaLinea() {
  return { actividad: '', dias: 0, precio: 0, referencia: '', estado: '', es_fase: false };
}

function nuevaHoja() {
  return {
    id: `h-${Date.now()}`,
    nombre: 'Nueva hoja de costos',
    tipo: 'inicial',
    proveedor: '',
    lineas: []
  };
}

const CierreNegocioHojasCosto = ({ detalle, onGuardar, guardando }) => {
  const moneda = normalizarMonedaRendicion(detalle?.cierre?.moneda);
  const fmt = (n) => formatoMontoRendicion(n, moneda);
  const [hojas, setHojas] = useState([]);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    setHojas(detalle?.hojas_costo?.length ? detalle.hojas_costo : []);
    setTab(0);
  }, [detalle]);

  const hoja = hojas[tab];

  const patchHoja = (idx, patch) => {
    setHojas((list) => list.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  };

  const patchLinea = (hIdx, lIdx, patch) => {
    setHojas((list) =>
      list.map((h, i) => {
        if (i !== hIdx) return h;
        const lineas = (h.lineas || []).map((l, j) => (j === lIdx ? { ...l, ...patch } : l));
        return { ...h, lineas };
      })
    );
  };

  const totalHoja = (h) =>
    (h?.lineas || [])
      .filter((l) => !l.es_fase)
      .reduce((s, l) => s + Number(l.precio || 0), 0);

  const guardar = () => onGuardar?.({ hojas_costo_var: hojas });

  if (!hojas.length) {
    return (
      <div className="bg-white rounded-2xl border p-8 text-center space-y-4">
        <p className="text-slate-500 text-sm">Sin hojas de costo. Agrega hojas variables (ej. Costos Jeff inicial, modificado, final).</p>
        <button
          type="button"
          onClick={() => setHojas([nuevaHoja()])}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm"
        >
          <PlusIcon className="w-4 h-4" /> Crear primera hoja
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {hojas.map((h, i) => (
          <button
            key={h.id || i}
            type="button"
            onClick={() => setTab(i)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              tab === i ? 'bg-teal-50 border-teal-300 text-teal-900 font-medium' : 'bg-white text-slate-600'
            }`}
          >
            {h.nombre || `Hoja ${i + 1}`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setHojas((l) => [...l, nuevaHoja()]);
            setTab(hojas.length);
          }}
          className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-teal-700"
        >
          <PlusIcon className="w-4 h-4" /> Hoja
        </button>
      </div>

      {hoja && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500">Nombre hoja</label>
              <input className={inp} value={hoja.nombre || ''} onChange={(e) => patchHoja(tab, { nombre: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Proveedor</label>
              <input className={inp} value={hoja.proveedor || ''} onChange={(e) => patchHoja(tab, { proveedor: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500">Tipo</label>
              <select className={inp} value={hoja.tipo || 'inicial'} onChange={(e) => patchHoja(tab, { tipo: e.target.value })}>
                <option value="inicial">Inicial</option>
                <option value="modificado">Modificado</option>
                <option value="final">Final</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-teal-700 text-white text-left">
                  <th className="px-3 py-2 min-w-[200px]">Actividad</th>
                  <th className="px-3 py-2 text-right w-24">Días</th>
                  <th className="px-3 py-2 text-right w-28">Precio S/.</th>
                  <th className="px-3 py-2 w-32">Referencia</th>
                  <th className="px-3 py-2 w-28">Estado</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {(hoja.lineas || []).map((l, li) => (
                  <tr key={li} className={l.es_fase ? 'bg-teal-50 font-semibold' : ''}>
                    <td className="px-2 py-1">
                      <input className={inp} value={l.actividad || ''} onChange={(e) => patchLinea(tab, li, { actividad: e.target.value })} />
                    </td>
                    <td className="px-2 py-1">
                      {!l.es_fase && (
                        <input type="number" className={inpNum} value={l.dias ?? ''} onChange={(e) => patchLinea(tab, li, { dias: e.target.value })} />
                      )}
                    </td>
                    <td className="px-2 py-1">
                      {!l.es_fase && (
                        <input type="number" className={inpNum} value={l.precio ?? ''} onChange={(e) => patchLinea(tab, li, { precio: e.target.value })} />
                      )}
                    </td>
                    <td className="px-2 py-1">
                      <input className={inp} value={l.referencia || ''} onChange={(e) => patchLinea(tab, li, { referencia: e.target.value })} />
                    </td>
                    <td className="px-2 py-1">
                      <input className={inp} value={l.estado || ''} onChange={(e) => patchLinea(tab, li, { estado: e.target.value })} placeholder="CANCELADO…" />
                    </td>
                    <td className="px-2 py-1">
                      <button type="button" onClick={() => patchHoja(tab, { lineas: hoja.lineas.filter((_, j) => j !== li) })} className="text-red-500 p-1">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={2} className="px-3 py-2 text-right">Total S/.</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(totalHoja(hoja))}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="px-4 py-2 border-t">
            <button
              type="button"
              onClick={() => patchHoja(tab, { lineas: [...(hoja.lineas || []), nuevaLinea()] })}
              className="text-sm text-teal-700 inline-flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" /> Agregar actividad
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="px-5 py-2 rounded-xl bg-teal-600 text-white text-sm disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar hojas de costo'}
        </button>
      </div>
    </div>
  );
};

export default CierreNegocioHojasCosto;
