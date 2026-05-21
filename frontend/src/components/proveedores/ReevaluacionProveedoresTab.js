import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { proveedoresService } from '../../services/api';
import { formatoFechaDMY } from '../../utils/dateUtils';

const reevalVacia = () => ({
  proveedor_id: '',
  producto_servicio: '',
  criterio_seleccion: 'historico',
  fecha_ultima_interaccion: '',
  conformidad: 'si',
  fecha_revaluacion: new Date().toISOString().slice(0, 10),
  puntaje_habido: 10,
  puntaje_entrega_efectiva: 8,
  puntaje_precio_mercado: 5,
  proxima_revaluacion: ''
});

function calcPuntaje(f) {
  return (
    Number(f.puntaje_habido || 0) +
    Number(f.puntaje_entrega_efectiva || 0) +
    Number(f.puntaje_precio_mercado || 0)
  );
}

function calcResultado(puntaje) {
  if (puntaje > 21) return { key: 'apto', label: 'APTO' };
  if (puntaje > 15) return { key: 'apto_con_restricciones', label: 'APTO CON RESTRICCIONES' };
  return { key: 'no_apto', label: 'NO APTO' };
}

function badgeResultado(resultado) {
  if (resultado === 'apto') return 'bg-emerald-100 text-emerald-800';
  if (resultado === 'apto_con_restricciones') return 'bg-amber-100 text-amber-900';
  return 'bg-rose-100 text-rose-800';
}

export default function ReevaluacionProveedoresTab({ listaProveedores, catalogos }) {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(reevalVacia());
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await proveedoresService.listarReevaluaciones();
      setFilas(data.data || []);
    } catch {
      toast.error('Error al cargar reevaluaciones.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const preview = useMemo(() => {
    const puntaje = calcPuntaje(form);
    return { puntaje, ...calcResultado(puntaje) };
  }, [form]);

  const abrirNuevo = () => {
    setForm(reevalVacia());
    setModal('nuevo');
  };

  const abrirEditar = (r) => {
    setForm({
      proveedor_id: String(r.proveedor_id),
      producto_servicio: r.producto_servicio || '',
      criterio_seleccion: r.criterio_seleccion,
      fecha_ultima_interaccion: r.fecha_ultima_interaccion
        ? String(r.fecha_ultima_interaccion).slice(0, 10)
        : '',
      conformidad: r.conformidad,
      fecha_revaluacion: String(r.fecha_revaluacion).slice(0, 10),
      puntaje_habido: r.puntaje_habido,
      puntaje_entrega_efectiva: r.puntaje_entrega_efectiva,
      puntaje_precio_mercado: r.puntaje_precio_mercado,
      proxima_revaluacion: r.proxima_revaluacion
        ? String(r.proxima_revaluacion).slice(0, 10)
        : ''
    });
    setModal(r.id);
  };

  const onProveedorChange = (id) => {
    const p = listaProveedores.find((x) => String(x.id) === String(id));
    setForm((f) => ({
      ...f,
      proveedor_id: id,
      producto_servicio: p?.producto_servicio || f.producto_servicio
    }));
  };

  const guardar = async () => {
    if (!form.proveedor_id) {
      toast.error('Seleccione un proveedor.');
      return;
    }
    setGuardando(true);
    try {
      const body = {
        ...form,
        proveedor_id: parseInt(form.proveedor_id, 10),
        fecha_ultima_interaccion: form.fecha_ultima_interaccion || null,
        proxima_revaluacion: form.proxima_revaluacion || null
      };
      if (modal === 'nuevo') {
        await proveedoresService.crearReevaluacion(body);
        toast.success('Reevaluación registrada.');
      } else {
        await proveedoresService.actualizarReevaluacion(modal, body);
        toast.success('Reevaluación actualizada.');
      }
      setModal(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar reevaluación de "${nombre}"?`)) return;
    try {
      await proveedoresService.eliminarReevaluacion(id);
      toast.success('Eliminada.');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo eliminar.');
    }
  };

  const ch = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b flex flex-wrap justify-between items-center gap-2">
        <div>
          <h2 className="font-semibold text-slate-800">Reevaluación de proveedores</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Puntaje = habido + entrega efectiva + precio mercado. Resultado: &gt;21 APTO, &gt;15 APTO
            CON RESTRICCIONES, si no NO APTO.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          disabled={listaProveedores.length === 0}
          className="inline-flex items-center gap-1 rounded-lg bg-teal-600 text-white text-sm px-3 py-1.5 disabled:opacity-50"
        >
          <PlusIcon className="w-4 h-4" />
          Nueva reevaluación
        </button>
      </div>

      {listaProveedores.length === 0 && (
        <p className="px-5 py-3 text-sm text-amber-700 bg-amber-50 border-b border-amber-100">
          Primero registre proveedores en la lista para poder reevaluarlos.
        </p>
      )}

      {cargando ? (
        <p className="p-8 text-sm text-slate-500 text-center">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="p-8 text-sm text-slate-500 text-center">Sin reevaluaciones registradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[1100px]">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-2 py-2 text-left font-semibold">Nombre del proveedor</th>
                <th className="px-2 py-2 text-left">Producto o servicio</th>
                <th className="px-2 py-2 text-left">Criterio selección</th>
                <th className="px-2 py-2 whitespace-nowrap">Última interacción</th>
                <th className="px-2 py-2 text-center">Conformidad</th>
                <th className="px-2 py-2 whitespace-nowrap">Fecha revaluación</th>
                <th className="px-2 py-2 text-center" title="10 o 0">
                  Habido
                </th>
                <th className="px-2 py-2 text-center" title="0 a 10">
                  Entrega efectiva
                </th>
                <th className="px-2 py-2 text-center" title="0 o 5">
                  Precio mercado
                </th>
                <th className="px-2 py-2 text-center font-bold">Puntaje</th>
                <th className="px-2 py-2 text-center">Resultado</th>
                <th className="px-2 py-2 whitespace-nowrap">Próxima reval.</th>
                <th className="px-2 py-2 text-center">Días rest.</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {filas.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-2 py-2 font-medium text-slate-800">{r.proveedor_nombre}</td>
                  <td className="px-2 py-2 max-w-[8rem] truncate" title={r.producto_servicio}>
                    {r.producto_servicio}
                  </td>
                  <td className="px-2 py-2 capitalize">
                    {(catalogos?.criterios_seleccion_reeval || []).find(
                      (c) => c.value === r.criterio_seleccion
                    )?.label || r.criterio_seleccion}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {r.fecha_ultima_interaccion ? formatoFechaDMY(r.fecha_ultima_interaccion) : '—'}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded font-medium ${
                        r.conformidad === 'si' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {r.conformidad === 'si' ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {formatoFechaDMY(r.fecha_revaluacion)}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">{r.puntaje_habido}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{r.puntaje_entrega_efectiva}</td>
                  <td className="px-2 py-2 text-center tabular-nums">{r.puntaje_precio_mercado}</td>
                  <td className="px-2 py-2 text-center font-bold tabular-nums">{r.puntaje}</td>
                  <td className="px-2 py-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold leading-tight ${badgeResultado(
                        r.resultado
                      )}`}
                    >
                      {r.resultado_label}
                    </span>
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {r.proxima_revaluacion ? formatoFechaDMY(r.proxima_revaluacion) : '—'}
                  </td>
                  <td className="px-2 py-2 text-center tabular-nums">
                    {r.tiempo_restante_dias != null ? r.tiempo_restante_dias : '—'}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="text-teal-700 hover:underline mr-1"
                      onClick={() => abrirEditar(r)}
                    >
                      <PencilSquareIcon className="w-4 h-4 inline" />
                    </button>
                    <button
                      type="button"
                      className="text-rose-600 hover:underline"
                      onClick={() => eliminar(r.id, r.proveedor_nombre)}
                    >
                      <TrashIcon className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 sm:p-6" role="dialog" aria-modal="true">
          <div className="flex min-h-full items-start justify-center sm:items-center py-2 sm:py-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[min(calc(100dvh-2rem),44rem)] flex flex-col shadow-xl border border-slate-200 overflow-hidden">
              <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-100">
                <h3 className="font-bold text-lg text-slate-800">
                  {modal === 'nuevo' ? 'Nueva reevaluación' : 'Editar reevaluación'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 shrink-0"
                  aria-label="Cerrar"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-600">Nombre del proveedor *</label>
                <select
                  className="w-full mt-1 rounded-lg border px-3 py-2"
                  value={form.proveedor_id}
                  onChange={(e) => onProveedorChange(e.target.value)}
                >
                  <option value="">— Seleccionar —</option>
                  {listaProveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.razon_social}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-slate-600">Producto o servicio *</label>
                <input
                  className="w-full mt-1 rounded-lg border px-3 py-2"
                  value={form.producto_servicio}
                  onChange={(e) => ch('producto_servicio', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Criterio de selección *</label>
                <select
                  className="w-full mt-1 rounded-lg border px-3 py-2"
                  value={form.criterio_seleccion}
                  onChange={(e) => ch('criterio_seleccion', e.target.value)}
                >
                  {(catalogos?.criterios_seleccion_reeval || []).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Conformidad *</label>
                <select
                  className="w-full mt-1 rounded-lg border px-3 py-2"
                  value={form.conformidad}
                  onChange={(e) => ch('conformidad', e.target.value)}
                >
                  {(catalogos?.conformidad_reeval || []).map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Fecha última interacción</label>
                <input
                  type="date"
                  className="w-full mt-1 rounded-lg border px-3 py-2"
                  value={form.fecha_ultima_interaccion}
                  onChange={(e) => ch('fecha_ultima_interaccion', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Fecha de revaluación *</label>
                <input
                  type="date"
                  className="w-full mt-1 rounded-lg border px-3 py-2"
                  value={form.fecha_revaluacion}
                  onChange={(e) => ch('fecha_revaluacion', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">¿Condición de habido? (10 o 0)</label>
                <select
                  className="w-full mt-1 rounded-lg border px-3 py-2"
                  value={form.puntaje_habido}
                  onChange={(e) => ch('puntaje_habido', Number(e.target.value))}
                >
                  <option value={10}>Sí — 10</option>
                  <option value={0}>No — 0</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">¿Entrega efectiva? (0 a 10)</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  className="w-full mt-1 rounded-lg border px-3 py-2"
                  value={form.puntaje_entrega_efectiva}
                  onChange={(e) => ch('puntaje_entrega_efectiva', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">¿Precio en mercado? (0 o 5)</label>
                <select
                  className="w-full mt-1 rounded-lg border px-3 py-2"
                  value={form.puntaje_precio_mercado}
                  onChange={(e) => ch('puntaje_precio_mercado', Number(e.target.value))}
                >
                  <option value={5}>Sí — 5</option>
                  <option value={0}>No — 0</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-600">Próxima revaluación</label>
                <input
                  type="date"
                  className="w-full mt-1 rounded-lg border px-3 py-2"
                  value={form.proxima_revaluacion}
                  onChange={(e) => ch('proxima_revaluacion', e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex flex-wrap justify-between gap-2">
              <div>
                <span className="text-xs text-slate-500">Puntaje calculado</span>
                <p className="text-2xl font-bold text-slate-800 tabular-nums">{preview.puntaje}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">Resultado</span>
                <p
                  className={`text-sm font-bold px-3 py-1 rounded-lg inline-block mt-1 ${badgeResultado(
                    preview.key
                  )}`}
                >
                  {preview.label}
                </p>
              </div>
            </div>
              </div>

              <div className="shrink-0 flex gap-2 px-5 py-4 border-t border-slate-100 bg-white">
              <button
                type="button"
                className="flex-1 rounded-xl border py-2.5 text-sm"
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardando}
                className="flex-1 rounded-xl bg-teal-600 text-white py-2.5 text-sm font-medium disabled:opacity-50"
                onClick={guardar}
              >
                {guardando ? 'Guardando…' : 'Guardar'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
