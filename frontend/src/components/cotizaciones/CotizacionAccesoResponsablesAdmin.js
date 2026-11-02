import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { cotizacionesService } from '../../services/api';

function idsDesdeBorrador(borrador, cot) {
  if (Array.isArray(borrador?.general?.responsable_ids) && borrador.general.responsable_ids.length) {
    return borrador.general.responsable_ids.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  }
  const rid = borrador?.general?.responsable_id ?? cot?.responsable_id;
  if (rid != null && rid !== '') {
    const n = Number(rid);
    return Number.isFinite(n) && n > 0 ? [n] : [];
  }
  return [];
}

/**
 * Admin: reasigna quién puede elaborar/ver una cotización (no modifica la solicitud comercial).
 */
const CotizacionAccesoResponsablesAdmin = ({ cotizacionId, borrador, cot, responsables, onActualizado }) => {
  const [seleccion, setSeleccion] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setSeleccion(idsDesdeBorrador(borrador, cot));
  }, [cotizacionId, borrador, cot]);

  const toggle = (id) => {
    setSeleccion((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return [...set];
    });
  };

  const guardar = async () => {
    if (!seleccion.length) {
      toast.error('Debe quedar al menos un responsable con acceso');
      return;
    }
    setGuardando(true);
    try {
      const { data } = await cotizacionesService.asignarAccesoResponsables(cotizacionId, {
        responsable_ids: seleccion
      });
      toast.success(data.mensaje || 'Acceso actualizado');
      onActualizado?.(data.data);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo actualizar el acceso');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-5 space-y-3">
      <div className="flex items-start gap-2">
        <UserGroupIcon className="w-6 h-6 text-violet-700 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-violet-900">Acceso a esta cotización (admin)</h3>
          <p className="text-xs text-violet-800/90 mt-1">
            Cambios de última hora: agrega o quita personas que pueden ver y editar{' '}
            <strong>solo esta cotización</strong>. La solicitud comercial original no se modifica.
          </p>
        </div>
      </div>
      <div className="rounded-lg border border-violet-200 bg-white p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
        {responsables.map((r) => (
          <label
            key={r.id}
            className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-violet-50"
          >
            <input
              type="checkbox"
              checked={seleccion.includes(r.id)}
              onChange={() => toggle(r.id)}
              className="rounded border-violet-300 text-violet-600 focus:ring-violet-500"
            />
            <span>
              {r.nombres} {r.apellidos}
              {r.email ? <span className="block text-xs text-slate-500">{r.email}</span> : null}
            </span>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={guardar}
        disabled={guardando}
        className="px-4 py-2 rounded-lg bg-violet-700 text-white text-sm font-medium hover:bg-violet-800 disabled:opacity-60"
      >
        {guardando ? 'Guardando…' : 'Guardar acceso'}
      </button>
    </div>
  );
};

export default CotizacionAccesoResponsablesAdmin;
