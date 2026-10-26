import React, { useMemo } from 'react';
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { nombreVisibleTipoProyecto } from '../../utils/cotizacionTiposProyecto';
import {
  perfilesConParticipacionAutomatica,
  validarActividadesDimensionamiento
} from '../../utils/cotizacionActividadesValidacion';

const mkId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const nombreBloqueDefault = (tipo) => {
  if (tipo === 'desarrollo') return 'Nueva fase';
  if (tipo === 'bolsa_horas') return 'Bolsa de horas';
  return 'Nuevo módulo';
};

const sumTotales = (bloques) => {
  let base = 0;
  let holgura = 0;
  let efectivas = 0;
  for (const b of bloques || []) {
    for (const a of b.actividades || []) {
      const h = Number(a.horas || 0);
      const hg = Number(a.holgura_horas || 0);
      base += h;
      holgura += hg;
      efectivas += h + hg;
    }
  }
  return { base, holgura, efectivas };
};

const CotizacionesActividades = ({ actividades, onChange, tipoProyecto = '', tipoProyectoCodigo = '' }) => {
  const tipo = actividades?.tipo_estructura || 'analitica';
  const bloques = actividades?.bloques || [];
  const perfilesRaw = actividades?.perfiles || [];
  const perfiles = useMemo(
    () => perfilesConParticipacionAutomatica(perfilesRaw),
    [perfilesRaw]
  );
  const totales = sumTotales(bloques);
  const totalPctPerfiles = perfiles.reduce((s, p) => s + Number(p.participacion_pct || 0), 0);
  const totalHorasPerfiles = perfiles.reduce((s, p) => s + Number(p.horas || 0), 0);
  const nombreTipo = nombreVisibleTipoProyecto(tipoProyectoCodigo, tipoProyecto);
  const validacion = validarActividadesDimensionamiento(actividades);
  const horasCuadran =
    perfiles.length > 0 && totales.base > 0
      ? Math.abs(totalHorasPerfiles - totales.base) <= 0.05
      : null;

  const update = (next) => onChange({ ...actividades, ...next });

  const setPerfiles = (nextList) => {
    update({ perfiles: perfilesConParticipacionAutomatica(nextList) });
  };

  const addPerfil = () => {
    setPerfiles([
      ...perfilesRaw,
      {
        id: mkId(),
        perfil: '',
        horas: 0,
        participacion_pct: 0,
        orden: perfilesRaw.length + 1
      }
    ]);
  };

  const updatePerfil = (idx, patch) => {
    setPerfiles(perfilesRaw.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const removePerfil = (idx) => {
    setPerfiles(perfilesRaw.filter((_, i) => i !== idx));
  };

  const addBloque = () => {
    if (tipo === 'bolsa_horas' && bloques.length >= 1) {
      return;
    }
    update({
      bloques: [
        ...bloques,
        {
          id: mkId(),
          nombre: nombreBloqueDefault(tipo),
          orden: bloques.length + 1,
          actividades: []
        }
      ]
    });
  };

  const updateBloque = (idx, patch) => {
    update({ bloques: bloques.map((b, i) => (i === idx ? { ...b, ...patch } : b)) });
  };

  const removeBloque = (idx) => {
    update({ bloques: bloques.filter((_, i) => i !== idx) });
  };

  const moveBloque = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= bloques.length) return;
    const next = [...bloques];
    [next[idx], next[j]] = [next[j], next[idx]];
    update({ bloques: next.map((b, i) => ({ ...b, orden: i + 1 })) });
  };

  const addActividad = (bloqueIdx, descripcion, horas, holgura_horas) => {
    const b = bloques[bloqueIdx];
    const acts = [
      ...(b.actividades || []),
      {
        id: mkId(),
        orden: (b.actividades?.length || 0) + 1,
        descripcion: descripcion || '',
        horas: Number(horas) || 0,
        holgura_horas: Number(holgura_horas) || 0
      }
    ];
    updateBloque(bloqueIdx, { actividades: acts });
  };

  const updateActividad = (bloqueIdx, actIdx, patch) => {
    const acts = (bloques[bloqueIdx].actividades || []).map((a, i) =>
      i === actIdx ? { ...a, ...patch } : a
    );
    updateBloque(bloqueIdx, { actividades: acts });
  };

  const removeActividad = (bloqueIdx, actIdx) => {
    updateBloque(bloqueIdx, {
      actividades: (bloques[bloqueIdx].actividades || []).filter((_, i) => i !== actIdx)
    });
  };

  const moveActividad = (bloqueIdx, actIdx, dir) => {
    const acts = [...(bloques[bloqueIdx].actividades || [])];
    const j = actIdx + dir;
    if (j < 0 || j >= acts.length) return;
    [acts[actIdx], acts[j]] = [acts[j], acts[actIdx]];
    updateBloque(bloqueIdx, { actividades: acts.map((a, i) => ({ ...a, orden: i + 1 })) });
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Dimensionamiento</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Perfiles, horas y actividades del alcance. Los perfiles se reflejan en Costos como recursos.
          </p>
        </div>
        {nombreTipo ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 min-w-[200px]">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Tipo de proyecto</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{nombreTipo}</p>
          </div>
        ) : null}
      </div>

      {validacion.iniciado && !validacion.ok && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Pendiente para cerrar el alcance (puedes guardar borrador igual)</p>
          <ul className="mt-2 list-disc list-inside space-y-0.5 text-amber-800/90">
            {validacion.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {validacion.iniciado && validacion.ok && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-sm text-emerald-800">
          Dimensionamiento cuadrado: perfiles, participación y horas de actividades coinciden.
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-b">
          <div>
            <h3 className="font-semibold text-slate-800">Perfiles y participación</h3>
            <p className="text-xs text-slate-500">
              Indica las horas por perfil; el % de participación se calcula solo.
            </p>
          </div>
          <button
            type="button"
            onClick={addPerfil}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-teal-300 text-teal-700 text-sm hover:bg-teal-50"
          >
            <PlusIcon className="w-4 h-4" /> Perfil
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 px-3 w-12">#</th>
                <th className="py-2 px-3">Perfil</th>
                <th className="py-2 px-3 w-28">Horas</th>
                <th className="py-2 px-3 w-32">% participación</th>
                <th className="py-2 px-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {perfiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 text-sm">
                    Agrega perfiles (ej. Arquitecto, Data Engineer…)
                  </td>
                </tr>
              )}
              {perfiles.map((p, idx) => (
                <tr key={p.id || idx} className="border-b border-slate-100">
                  <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-2 px-3">
                    <input
                      value={p.perfil || ''}
                      onChange={(e) => updatePerfil(idx, { perfil: e.target.value })}
                      placeholder="Nombre del perfil"
                      className="w-full rounded border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={p.horas ?? 0}
                      onChange={(e) => updatePerfil(idx, { horas: Number(e.target.value) })}
                      className="w-full rounded border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="py-2 px-3 tabular-nums text-slate-700">
                    {(Number(p.participacion_pct) || 0).toFixed(2)}%
                  </td>
                  <td className="py-2 px-3">
                    <button
                      type="button"
                      onClick={() => removePerfil(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            {perfiles.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-medium text-slate-700">
                  <td colSpan={2} className="py-2 px-3 text-right">
                    Totales
                  </td>
                  <td className="py-2 px-3">
                    {totalHorasPerfiles.toFixed(1)} h
                    {horasCuadran === false && (
                      <span className="block text-xs font-normal text-amber-600">
                        Actividades: {totales.base.toFixed(1)} h
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {totalPctPerfiles.toFixed(2)}%
                    {totalHorasPerfiles <= 0 && perfiles.length > 0 && (
                      <span className="block text-xs font-normal text-slate-400">Según horas</span>
                    )}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Actividades del proyecto</h3>
          <p className="text-sm text-slate-500">
            {bloques.length} {tipo === 'desarrollo' ? 'fases' : tipo === 'bolsa_horas' ? 'bolsa' : 'bloques'} ·{' '}
            {totales.efectivas.toLocaleString('es-PE', { minimumFractionDigits: 1 })} h efectivas (
            {totales.base.toFixed(1)} h + {totales.holgura.toFixed(1)} h holgura)
          </p>
        </div>
        {tipo !== 'bolsa_horas' && (
          <button
            type="button"
            onClick={addBloque}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
          >
            <PlusIcon className="w-4 h-4" />{' '}
            {tipo === 'desarrollo' ? 'Nueva fase' : 'Nuevo bloque'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {bloques.length === 0 && (
          <p className="text-slate-500 text-sm py-8 text-center border border-dashed rounded-xl">
            Agrega {tipo === 'desarrollo' ? 'fases' : 'bloques'} para organizar las actividades
          </p>
        )}

        {bloques.map((bloque, bIdx) => {
          const tb = sumTotales([bloque]);
          return (
            <BloqueCard
              key={bloque.id || bIdx}
              bloque={bloque}
              totalBloque={tb.efectivas}
              ocultarNombre={tipo === 'bolsa_horas'}
              onRename={(nombre) => updateBloque(bIdx, { nombre })}
              onRemove={() => removeBloque(bIdx)}
              onMoveUp={() => moveBloque(bIdx, -1)}
              onMoveDown={() => moveBloque(bIdx, 1)}
              canMove={tipo !== 'bolsa_horas'}
              canRemove={tipo !== 'bolsa_horas'}
              onAddActividad={(desc, hrs, hol) => addActividad(bIdx, desc, hrs, hol)}
              onUpdateActividad={(aIdx, patch) => updateActividad(bIdx, aIdx, patch)}
              onRemoveActividad={(aIdx) => removeActividad(bIdx, aIdx)}
              onMoveActividad={(aIdx, dir) => moveActividad(bIdx, aIdx, dir)}
            />
          );
        })}
      </div>
    </div>
  );
};

function BloqueCard({
  bloque,
  totalBloque,
  ocultarNombre,
  onRename,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMove,
  canRemove,
  onAddActividad,
  onUpdateActividad,
  onRemoveActividad,
  onMoveActividad
}) {
  const [editNombre, setEditNombre] = React.useState(false);
  const [nombreTmp, setNombreTmp] = React.useState(bloque.nombre);
  const [nuevaDesc, setNuevaDesc] = React.useState('');
  const [nuevaHoras, setNuevaHoras] = React.useState('0');
  const [nuevaHolgura, setNuevaHolgura] = React.useState('0');

  React.useEffect(() => {
    setNombreTmp(bloque.nombre);
  }, [bloque.nombre]);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
      {!ocultarNombre && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
          {editNombre ? (
            <input
              value={nombreTmp}
              onChange={(e) => setNombreTmp(e.target.value)}
              onBlur={() => {
                onRename(nombreTmp);
                setEditNombre(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (onRename(nombreTmp), setEditNombre(false))}
              className="font-semibold uppercase text-sm flex-1 min-w-[200px] rounded border px-2 py-1"
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditNombre(true)}
              className="font-semibold uppercase text-sm text-slate-800 flex items-center gap-1 hover:text-teal-700"
            >
              {bloque.nombre || 'MÓDULO'}
              <PencilSquareIcon className="w-4 h-4" />
            </button>
          )}
          <span className="ml-auto px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-medium">
            {totalBloque.toLocaleString('es-PE', { minimumFractionDigits: 1 })} h eff.
          </span>
          {canMove && (
            <>
              <button type="button" onClick={onMoveUp} className="p-1 text-slate-400 hover:text-slate-600">
                <ChevronUpIcon className="w-4 h-4" />
              </button>
              <button type="button" onClick={onMoveDown} className="p-1 text-slate-400 hover:text-slate-600">
                <ChevronDownIcon className="w-4 h-4" />
              </button>
            </>
          )}
          {canRemove && (
            <button type="button" onClick={onRemove} className="p-1 text-red-500 hover:text-red-700">
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 border-b bg-white">
              <th className="py-2 px-3 w-12">#</th>
              <th className="py-2 px-3">Actividad</th>
              <th className="py-2 px-3 w-24">Horas</th>
              <th className="py-2 px-3 w-24">Holgura</th>
              <th className="py-2 px-3 w-24">Total h</th>
              <th className="py-2 px-3 w-28">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {(bloque.actividades || []).map((act, aIdx) => {
              const totalH = Number(act.horas || 0) + Number(act.holgura_horas || 0);
              return (
                <tr key={act.id || aIdx} className="border-b border-slate-100">
                  <td className="py-2 px-3 text-slate-400">{aIdx + 1}</td>
                  <td className="py-2 px-3">
                    <input
                      value={act.descripcion || ''}
                      onChange={(e) => onUpdateActividad(aIdx, { descripcion: e.target.value })}
                      className="w-full rounded border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={act.horas ?? 0}
                      onChange={(e) => onUpdateActividad(aIdx, { horas: Number(e.target.value) })}
                      className="w-full rounded border border-slate-200 px-2 py-1"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={act.holgura_horas ?? 0}
                      onChange={(e) => onUpdateActividad(aIdx, { holgura_horas: Number(e.target.value) })}
                      className="w-full rounded border border-amber-200 bg-amber-50/50 px-2 py-1"
                      title="Holgura por actividad"
                    />
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-700">{totalH.toFixed(1)}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => onMoveActividad(aIdx, -1)} className="text-slate-400">
                        <ChevronUpIcon className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => onMoveActividad(aIdx, 1)} className="text-slate-400">
                        <ChevronDownIcon className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => onRemoveActividad(aIdx)} className="text-red-500">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2 p-3 bg-slate-50/80 border-t border-slate-100">
        <input
          value={nuevaDesc}
          onChange={(e) => setNuevaDesc(e.target.value)}
          placeholder="+ Agregar actividad…"
          className="flex-1 min-w-[160px] rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          step="0.5"
          min="0"
          value={nuevaHoras}
          onChange={(e) => setNuevaHoras(e.target.value)}
          title="Horas"
          placeholder="Horas"
          className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm"
        />
        <input
          type="number"
          step="0.5"
          min="0"
          value={nuevaHolgura}
          onChange={(e) => setNuevaHolgura(e.target.value)}
          title="Holgura"
          placeholder="Holg."
          className="w-20 rounded-lg border border-amber-200 bg-amber-50/50 px-2 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            onAddActividad(nuevaDesc, nuevaHoras, nuevaHolgura);
            setNuevaDesc('');
            setNuevaHoras('0');
            setNuevaHolgura('0');
          }}
          className="px-3 py-2 text-sm rounded-lg border border-teal-300 text-teal-700 hover:bg-teal-50"
        >
          + Agregar
        </button>
      </div>
    </div>
  );
}

export default CotizacionesActividades;
