import React from 'react';
import {
  MAX_DIAS_VACACIONES_CONTRATO,
  MIN_DIAS_VACACIONES_CONTRATO
} from '../../utils/diasVacacionesContrato';

const INPUT =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500';

/**
 * @param {{
 *   modo: '15' | '30' | 'otro',
 *   otro: string,
 *   onModoChange: (modo: '15' | '30' | 'otro') => void,
 *   onOtroChange: (valor: string) => void,
 *   className?: string,
 *   compact?: boolean
 * }} props
 */
export default function DiasVacacionesContratoFields({
  modo,
  otro,
  onModoChange,
  onOtroChange,
  className = '',
  compact = false
}) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">
        Días de vacaciones por año (contrato)
      </label>
      <div className={`flex flex-col gap-2 ${compact ? '' : ''}`}>
        <select
          className={INPUT}
          value={modo}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '15' || v === '30' || v === 'otro') onModoChange(v);
          }}
        >
          <option value="30">30 días — estándar</option>
          <option value="15">15 días — PYME / reducido</option>
          <option value="otro">Personalizado…</option>
        </select>
        {modo === 'otro' ? (
          <input
            type="number"
            min={MIN_DIAS_VACACIONES_CONTRATO}
            max={MAX_DIAS_VACACIONES_CONTRATO}
            step={1}
            required
            className={INPUT}
            placeholder={`Entre ${MIN_DIAS_VACACIONES_CONTRATO} y ${MAX_DIAS_VACACIONES_CONTRATO}`}
            value={otro}
            onChange={(e) => onOtroChange(e.target.value)}
          />
        ) : null}
      </div>
      {!compact ? (
        <p className="text-[11px] text-slate-500 mt-1">
          Usado al generar y renovar períodos. Los períodos ya cerrados no se recalculan solos; ajústelos en
          la tabla si hace falta.
        </p>
      ) : null}
    </div>
  );
}
