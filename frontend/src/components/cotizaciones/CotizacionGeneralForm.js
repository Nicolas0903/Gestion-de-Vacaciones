import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { parcheGeneralTipoProyectoDesdeNombre } from '../../utils/cotizacionTiposProyecto';

export const ESTADOS_COTIZACION = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'en_revision', label: 'En revisión' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'ganada', label: 'Ganada' },
  { value: 'perdida', label: 'Perdida' }
];

/**
 * Formulario de información general (crear y editar).
 * @param {object} form - campos general
 * @param {function} onChange - (patch) => void
 * @param {boolean} codigoReadOnly - en edición el código no cambia
 */
function responsableIdsSeleccionados(form) {
  if (Array.isArray(form.responsable_ids) && form.responsable_ids.length) {
    return form.responsable_ids.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  }
  if (form.responsable_id != null && form.responsable_id !== '') {
    const n = Number(form.responsable_id);
    return Number.isFinite(n) && n > 0 ? [n] : [];
  }
  return [];
}

const CotizacionGeneralForm = ({
  form,
  onChange,
  tipos = [],
  responsables = [],
  nuevoTipo = '',
  onNuevoTipoChange,
  onAgregarTipo,
  codigoReadOnly = false
}) => {
  const set = (k, v) => onChange({ [k]: v });

  const selectedIds = new Set(responsableIdsSeleccionados(form));

  const toggleResponsable = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    const ids = [...next];
    onChange({
      responsable_ids: ids,
      responsable_id: ids[0] ?? null
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 p-5 space-y-4 bg-slate-50/50">
      <h3 className="font-semibold text-slate-700">Información general</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block text-sm">
          <span className="text-slate-600">Código {codigoReadOnly ? '' : '(opcional)'}</span>
          <input
            value={form.codigo || ''}
            onChange={(e) => set('codigo', e.target.value)}
            readOnly={codigoReadOnly}
            placeholder={codigoReadOnly ? '' : 'Dejar vacío para autogenerar (ej: COT-2026-001)'}
            className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm ${
              codigoReadOnly ? 'bg-slate-100 text-slate-600' : ''
            }`}
          />
          {!codigoReadOnly && (
            <span className="text-xs text-slate-400">Si lo dejas vacío se autogenera un código secuencial</span>
          )}
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Estado *</span>
          <select
            value={form.estado || 'borrador'}
            onChange={(e) => set('estado', e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {ESTADOS_COTIZACION.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm md:col-span-2">
          <span className="text-slate-600">Nombre del proyecto *</span>
          <input
            value={form.nombre_proyecto || ''}
            onChange={(e) => set('nombre_proyecto', e.target.value)}
            placeholder="Ej: Implementación Snowflake para Integer"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Cliente *</span>
          <input
            value={form.cliente || ''}
            onChange={(e) => set('cliente', e.target.value)}
            placeholder="Nombre del cliente"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">RUC cliente</span>
          <input
            value={form.ruc_cliente || ''}
            onChange={(e) => set('ruc_cliente', e.target.value.replace(/[^\d-]/g, ''))}
            placeholder="Ej. 20100070970"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block text-sm">
          <span className="text-slate-600">Tipo de proyecto *</span>
          <div className="flex gap-2 mt-1">
            <select
              value={form.tipo_proyecto || ''}
              onChange={(e) => onChange(parcheGeneralTipoProyectoDesdeNombre(e.target.value))}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccionar…</option>
              {tipos.map((t) => (
                <option key={t.codigo || t.id} value={t.nombre}>
                  {t.nombre}
                </option>
              ))}
            </select>
            {onAgregarTipo && (
              <>
                <input
                  value={nuevoTipo}
                  onChange={(e) => onNuevoTipoChange?.(e.target.value)}
                  placeholder="Nuevo tipo"
                  className="w-28 rounded-lg border border-slate-300 px-2 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={onAgregarTipo}
                  className="px-2 rounded-lg border border-slate-300 hover:bg-white"
                  title="Crear tipo"
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          <span className="text-xs text-slate-400">
            Catálogo Prayaga (licencias, consultoría, capacitación, soporte, etc.).
          </span>
        </label>

        <div className="block text-sm md:col-span-2">
          <span className="text-slate-600">Responsable(s) *</span>
          <p className="text-xs text-slate-400 mt-0.5">Puedes seleccionar uno o más.</p>
          <div className="mt-2 rounded-lg border border-slate-300 bg-white p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {responsables.map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-2 text-sm cursor-pointer rounded-md px-2 py-1.5 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(r.id)}
                  onChange={() => toggleResponsable(r.id)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  {r.nombres} {r.apellidos}
                </span>
              </label>
            ))}
          </div>
          {selectedIds.size === 0 && (
            <span className="text-xs text-amber-600 mt-1 block">Selecciona al menos un responsable.</span>
          )}
        </div>

        <label className="block text-sm md:col-span-2">
          <span className="text-slate-600">Notas internas</span>
          <textarea
            value={form.notas_internas || ''}
            onChange={(e) => set('notas_internas', e.target.value)}
            rows={3}
            placeholder="Observaciones internas (opcional)"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
    </div>
  );
};

export default CotizacionGeneralForm;
