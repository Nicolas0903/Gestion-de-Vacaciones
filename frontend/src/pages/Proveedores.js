import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { proveedoresService } from '../services/api';
import { formatoFechaDMY } from '../utils/dateUtils';

const CRITERIOS = [
  { puntaje: 'puntaje_experiencia', obs: 'obs_experiencia', label: 'Experiencia en el mercado' },
  { puntaje: 'puntaje_precio', obs: 'obs_precio', label: 'Precio' },
  { puntaje: 'puntaje_iso', obs: 'obs_iso', label: 'Certificación ISO 9001' },
  { puntaje: 'puntaje_valor_agregado', obs: 'obs_valor_agregado', label: 'Valor agregado (0-10)' }
];

const candidatoVacio = () => ({
  razon_social: '',
  direccion: '',
  cumplimiento_legal: 'na',
  puntaje_experiencia: 20,
  puntaje_precio: 20,
  puntaje_iso: 10,
  puntaje_valor_agregado: 5,
  obs_experiencia: '',
  obs_precio: '',
  obs_iso: '',
  obs_valor_agregado: ''
});

const proveedorVacio = () => ({
  razon_social: '',
  tipo_proveedor: 'otros',
  tipo_proveedor_otro: '',
  website: '',
  fecha_registro: new Date().toISOString().slice(0, 10),
  area_solicitante: 'operaciones',
  area_otro: '',
  producto_servicio: '',
  contacto_prayaga: '',
  nombre_contacto_proveedor: '',
  datos_proveedor: ''
});

function puntajeTotal(c) {
  return (
    Number(c.puntaje_experiencia || 0) +
    Number(c.puntaje_precio || 0) +
    Number(c.puntaje_iso || 0) +
    Number(c.puntaje_valor_agregado || 0)
  );
}

function GraficoResultados({ candidatos }) {
  const max = Math.max(80, ...candidatos.map((c) => c.puntaje_total || puntajeTotal(c)), 1);
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        Resultados de selección
      </p>
      {candidatos.map((c) => {
        const pts = c.puntaje_total ?? puntajeTotal(c);
        return (
          <div key={c.id || c.razon_social} className="flex items-center gap-3">
            <span className="text-xs text-slate-700 w-36 truncate" title={c.razon_social}>
              {c.razon_social || '—'}
            </span>
            <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-300 to-orange-400 rounded-lg transition-all"
                style={{ width: `${Math.min(100, (pts / max) * 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-800 w-10 text-right tabular-nums">{pts}</span>
          </div>
        );
      })}
    </div>
  );
}

const Proveedores = () => {
  const [tab, setTab] = useState('lista');
  const [catalogos, setCatalogos] = useState(null);
  const [lista, setLista] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [modalLista, setModalLista] = useState(null);
  const [formProv, setFormProv] = useState(proveedorVacio());

  const [vistaEval, setVistaEval] = useState(null);
  const [formEval, setFormEval] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    oc_asociada: 'no',
    detalle: '',
    candidatos: [candidatoVacio(), candidatoVacio()]
  });
  const [detalleEval, setDetalleEval] = useState(null);
  const [modalGanador, setModalGanador] = useState(null);
  const [formGanador, setFormGanador] = useState(proveedorVacio());
  const [guardando, setGuardando] = useState(false);

  const cargarCatalogos = useCallback(async () => {
    try {
      const { data } = await proveedoresService.catalogos();
      setCatalogos(data.data);
    } catch {
      toast.error('No se cargaron catálogos.');
    }
  }, []);

  const cargarLista = useCallback(async () => {
    try {
      const { data } = await proveedoresService.listar();
      setLista(data.data || []);
    } catch {
      toast.error('Error al cargar proveedores.');
    }
  }, []);

  const cargarEvaluaciones = useCallback(async () => {
    try {
      const { data } = await proveedoresService.listarEvaluaciones();
      setEvaluaciones(data.data || []);
    } catch {
      toast.error('Error al cargar evaluaciones.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      setCargando(true);
      await cargarCatalogos();
      await Promise.all([cargarLista(), cargarEvaluaciones()]);
      setCargando(false);
    })();
  }, [cargarCatalogos, cargarLista, cargarEvaluaciones]);

  const abrirNuevoProveedor = () => {
    setFormProv(proveedorVacio());
    setModalLista('nuevo');
  };

  const abrirEditarProveedor = (p) => {
    setFormProv({
      razon_social: p.razon_social || '',
      tipo_proveedor: p.tipo_proveedor || 'otros',
      tipo_proveedor_otro: p.tipo_proveedor_otro || '',
      website: p.website || '',
      fecha_registro: String(p.fecha_registro).slice(0, 10),
      area_solicitante: p.area_solicitante || 'operaciones',
      area_otro: p.area_otro || '',
      producto_servicio: p.producto_servicio || '',
      contacto_prayaga: p.contacto_prayaga || '',
      nombre_contacto_proveedor: p.nombre_contacto_proveedor || '',
      datos_proveedor: p.datos_proveedor || ''
    });
    setModalLista(p.id);
  };

  const guardarProveedor = async () => {
    setGuardando(true);
    try {
      if (modalLista === 'nuevo') {
        await proveedoresService.crear(formProv);
        toast.success('Proveedor registrado.');
      } else {
        await proveedoresService.actualizar(modalLista, formProv);
        toast.success('Proveedor actualizado.');
      }
      setModalLista(null);
      await cargarLista();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarProveedor = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar "${nombre}" de la lista?`)) return;
    try {
      await proveedoresService.eliminar(id);
      toast.success('Proveedor eliminado.');
      cargarLista();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo eliminar.');
    }
  };

  const nuevaEvaluacion = () => {
    setFormEval({
      fecha: new Date().toISOString().slice(0, 10),
      oc_asociada: 'no',
      detalle: '',
      candidatos: [candidatoVacio(), candidatoVacio()]
    });
    setVistaEval('form');
    setDetalleEval(null);
  };

  const verEvaluacion = async (id) => {
    try {
      const { data } = await proveedoresService.obtenerEvaluacion(id);
      setDetalleEval(data.data);
      setVistaEval('detalle');
    } catch {
      toast.error('No se pudo cargar la evaluación.');
    }
  };

  const editarEvaluacion = async (id) => {
    try {
      const { data } = await proveedoresService.obtenerEvaluacion(id);
      const ev = data.data.evaluacion;
      setFormEval({
        fecha: String(ev.fecha).slice(0, 10),
        oc_asociada: ev.oc_asociada,
        detalle: ev.detalle,
        candidatos: data.data.candidatos.map((c) => ({
          razon_social: c.razon_social,
          direccion: c.direccion || '',
          cumplimiento_legal: c.cumplimiento_legal,
          puntaje_experiencia: c.puntaje_experiencia,
          puntaje_precio: c.puntaje_precio,
          puntaje_iso: c.puntaje_iso,
          puntaje_valor_agregado: c.puntaje_valor_agregado,
          obs_experiencia: c.obs_experiencia || '',
          obs_precio: c.obs_precio || '',
          obs_iso: c.obs_iso || '',
          obs_valor_agregado: c.obs_valor_agregado || ''
        }))
      });
      setVistaEval({ mode: 'edit', id });
      setDetalleEval(null);
    } catch {
      toast.error('No se pudo cargar para editar.');
    }
  };

  const guardarEvaluacion = async () => {
    setGuardando(true);
    try {
      if (vistaEval?.mode === 'edit') {
        await proveedoresService.actualizarEvaluacion(vistaEval.id, formEval);
        toast.success('Evaluación actualizada.');
        await verEvaluacion(vistaEval.id);
      } else {
        const { data } = await proveedoresService.crearEvaluacion(formEval);
        toast.success('Evaluación guardada.');
        setDetalleEval(data.data);
        setVistaEval('detalle');
      }
      cargarEvaluaciones();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar evaluación.');
    } finally {
      setGuardando(false);
    }
  };

  const abrirRegistrarGanador = (candidato) => {
    setFormGanador({
      ...proveedorVacio(),
      razon_social: candidato.razon_social,
      fecha_registro: new Date().toISOString().slice(0, 10)
    });
    setModalGanador(candidato);
  };

  const confirmarRegistrarGanador = async () => {
    if (!detalleEval?.evaluacion?.id || !modalGanador) return;
    setGuardando(true);
    try {
      await proveedoresService.registrarGanador(detalleEval.evaluacion.id, {
        candidato_id: modalGanador.id,
        ...formGanador
      });
      toast.success('Ganador registrado en la lista de proveedores.');
      setModalGanador(null);
      await verEvaluacion(detalleEval.evaluacion.id);
      cargarLista();
      cargarEvaluaciones();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al registrar.');
    } finally {
      setGuardando(false);
    }
  };

  const previewCandidatos = useMemo(
    () =>
      formEval.candidatos.map((c, i) => ({
        ...c,
        id: `prev-${i}`,
        puntaje_total: puntajeTotal(c)
      })),
    [formEval.candidatos]
  );

  const renderCandidatoBlock = (cand, idx, editable = true) => (
    <div
      key={idx}
      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-800">Proveedor evaluado #{idx + 1}</h4>
        {editable && formEval.candidatos.length > 1 && (
          <button
            type="button"
            className="text-xs text-rose-600 hover:underline"
            onClick={() =>
              setFormEval((f) => ({
                ...f,
                candidatos: f.candidatos.filter((_, i) => i !== idx)
              }))
            }
          >
            Quitar
          </button>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-600">Razón social</label>
          <input
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={cand.razon_social}
            disabled={!editable}
            onChange={(e) => {
              const v = e.target.value;
              setFormEval((f) => ({
                ...f,
                candidatos: f.candidatos.map((c, i) => (i === idx ? { ...c, razon_social: v } : c))
              }));
            }}
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Dirección</label>
          <input
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={cand.direccion}
            disabled={!editable}
            onChange={(e) => {
              const v = e.target.value;
              setFormEval((f) => ({
                ...f,
                candidatos: f.candidatos.map((c, i) => (i === idx ? { ...c, direccion: v } : c))
              }));
            }}
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Cumplimiento legal</label>
          <select
            className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={cand.cumplimiento_legal}
            disabled={!editable}
            onChange={(e) => {
              const v = e.target.value;
              setFormEval((f) => ({
                ...f,
                candidatos: f.candidatos.map((c, i) =>
                  i === idx ? { ...c, cumplimiento_legal: v } : c
                )
              }));
            }}
          >
            {(catalogos?.cumplimiento_legal || []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <p className="text-sm font-semibold text-teal-800">
            Total: {puntajeTotal(cand)} pts
          </p>
        </div>
      </div>
      <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden bg-white">
        <thead className="bg-slate-100 text-slate-600 text-xs">
          <tr>
            <th className="text-left px-3 py-2">Criterio</th>
            <th className="text-center px-2 py-2 w-24">Puntos</th>
            <th className="text-left px-3 py-2">Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {CRITERIOS.map((cr) => (
            <tr key={cr.puntaje} className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-700">{cr.label}</td>
              <td className="px-2 py-2 text-center">
                {cr.puntaje === 'puntaje_valor_agregado' ? (
                  <input
                    type="number"
                    min={0}
                    max={10}
                    className="w-16 rounded border border-slate-200 px-2 py-1 text-center text-sm"
                    value={cand[cr.puntaje]}
                    disabled={!editable}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormEval((f) => ({
                        ...f,
                        candidatos: f.candidatos.map((c, i) =>
                          i === idx ? { ...c, [cr.puntaje]: v } : c
                        )
                      }));
                    }}
                  />
                ) : (
                  <select
                    className="rounded border border-slate-200 px-2 py-1 text-sm"
                    value={cand[cr.puntaje]}
                    disabled={!editable}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setFormEval((f) => ({
                        ...f,
                        candidatos: f.candidatos.map((c, i) =>
                          i === idx ? { ...c, [cr.puntaje]: v } : c
                        )
                      }));
                    }}
                  >
                    {(catalogos?.puntaje_criterio_opciones || [10, 20, 30]).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                )}
              </td>
              <td className="px-3 py-2">
                <input
                  className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                  value={cand[cr.obs]}
                  disabled={!editable}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormEval((f) => ({
                      ...f,
                      candidatos: f.candidatos.map((c, i) =>
                        i === idx ? { ...c, [cr.obs]: v } : c
                      )
                    }));
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 pb-12">
      <Link
        to="/portal"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-teal-600 mb-6"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al portal
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-700 flex items-center justify-center shadow-lg">
          <BuildingStorefrontIcon className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestión de Proveedores</h1>
          <p className="text-sm text-slate-500">
            Evalúe candidatos y registre en la lista solo al ganador del proceso de selección.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => {
            setTab('lista');
            setVistaEval(null);
          }}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${
            tab === 'lista' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Lista de proveedores
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('evaluaciones');
            setVistaEval(null);
          }}
          className={`px-4 py-2 rounded-xl text-sm font-medium ${
            tab === 'evaluaciones' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Evaluación / Selección
        </button>
      </div>

      {cargando ? (
        <p className="text-slate-500 text-sm">Cargando…</p>
      ) : tab === 'lista' ? (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Proveedores afiliados</h2>
            <button
              type="button"
              onClick={abrirNuevoProveedor}
              className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
            >
              <PlusIcon className="w-4 h-4" />
              Alta manual
            </button>
          </div>
          <p className="px-5 py-2 text-xs text-slate-500 border-b border-slate-50">
            Los proveedores también pueden ingresar desde una evaluación cerrada (solo el ganador).
          </p>
          {lista.length === 0 ? (
            <p className="p-8 text-sm text-slate-500 text-center">No hay proveedores registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-left">
                  <tr>
                    <th className="px-4 py-2">Razón social</th>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Área</th>
                    <th className="px-4 py-2">Producto/Servicio</th>
                    <th className="px-4 py-2">Registro</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium">{p.razon_social}</td>
                      <td className="px-4 py-2">{p.tipo_label}</td>
                      <td className="px-4 py-2">{p.area_label}</td>
                      <td className="px-4 py-2 max-w-xs truncate">{p.producto_servicio}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {formatoFechaDMY(p.fecha_registro)}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="text-teal-700 hover:underline mr-2"
                          onClick={() => abrirEditarProveedor(p)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-rose-600 hover:underline"
                          onClick={() => eliminarProveedor(p.id, p.razon_social)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : vistaEval === 'form' || vistaEval?.mode === 'edit' ? (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border border-slate-100 p-5 space-y-4">
            <h2 className="font-semibold text-slate-800">
              {vistaEval?.mode === 'edit' ? 'Editar evaluación' : 'Nueva evaluación de proveedores'}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-600">Fecha</label>
                <input
                  type="date"
                  className="w-full mt-1 rounded-lg border px-3 py-2 text-sm"
                  value={formEval.fecha}
                  onChange={(e) => setFormEval((f) => ({ ...f, fecha: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">O.C. asociada</label>
                <select
                  className="w-full mt-1 rounded-lg border px-3 py-2 text-sm"
                  value={formEval.oc_asociada}
                  onChange={(e) => setFormEval((f) => ({ ...f, oc_asociada: e.target.value }))}
                >
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600">Detalle</label>
              <textarea
                className="w-full mt-1 rounded-lg border px-3 py-2 text-sm"
                rows={2}
                value={formEval.detalle}
                onChange={(e) => setFormEval((f) => ({ ...f, detalle: e.target.value }))}
              />
            </div>
          </div>

          {formEval.candidatos.map((c, i) => renderCandidatoBlock(c, i, true))}

          <button
            type="button"
            className="text-sm font-medium text-teal-700 hover:underline"
            onClick={() =>
              setFormEval((f) => ({ ...f, candidatos: [...f.candidatos, candidatoVacio()] }))
            }
          >
            + Agregar otro proveedor a evaluar
          </button>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <GraficoResultados candidatos={[...previewCandidatos].sort((a, b) => b.puntaje_total - a.puntaje_total)} />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <button
                type="button"
                onClick={() => setVistaEval(null)}
                className="rounded-xl border px-4 py-2.5 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={guardarEvaluacion}
                className="rounded-xl bg-teal-600 text-white px-4 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                {guardando ? 'Guardando…' : 'Guardar evaluación'}
              </button>
            </div>
          </div>
        </div>
      ) : vistaEval === 'detalle' && detalleEval ? (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white border p-5">
            <div className="flex flex-wrap justify-between gap-2 mb-4">
              <div>
                <h2 className="font-semibold text-slate-800">Evaluación #{detalleEval.evaluacion.id}</h2>
                <p className="text-sm text-slate-500">
                  {formatoFechaDMY(detalleEval.evaluacion.fecha)} · O.C.{' '}
                  {detalleEval.evaluacion.oc_asociada === 'si' ? 'Sí' : 'No'}
                </p>
                <p className="text-sm text-slate-700 mt-1">{detalleEval.evaluacion.detalle}</p>
              </div>
              {!detalleEval.evaluacion.proveedor_registrado_id && (
                <button
                  type="button"
                  className="text-sm text-teal-700 hover:underline"
                  onClick={() => editarEvaluacion(detalleEval.evaluacion.id)}
                >
                  Editar evaluación
                </button>
              )}
            </div>
            {detalleEval.evaluacion.proveedor_registrado_id ? (
              <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                Ganador registrado en lista:{' '}
                <strong>{detalleEval.proveedor_registrado?.razon_social}</strong>
              </p>
            ) : (
              <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                Pendiente: complete los datos del ganador y regístrelo en la lista de proveedores.
              </p>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border bg-white p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-600 border-b">
                    <th className="text-left py-2">Proveedor</th>
                    <th className="text-right py-2">Puntos</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {detalleEval.candidatos.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50">
                      <td className="py-2">
                        {c.razon_social}
                        {detalleEval.ganador?.id === c.id && (
                          <span className="ml-2 text-xs text-amber-700 font-medium">★ Ganador</span>
                        )}
                      </td>
                      <td className="py-2 text-right font-bold tabular-nums">{c.puntaje_total}</td>
                      <td className="py-2 text-right">
                        {!detalleEval.evaluacion.proveedor_registrado_id && (
                          <button
                            type="button"
                            className="text-xs text-teal-700 font-medium hover:underline inline-flex items-center gap-1"
                            onClick={() => abrirRegistrarGanador(c)}
                          >
                            <TrophyIcon className="w-3.5 h-3.5" />
                            Registrar en lista
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <GraficoResultados candidatos={detalleEval.candidatos} />
            </div>
          </div>

          <button
            type="button"
            className="text-sm text-slate-600 hover:underline"
            onClick={() => {
              setVistaEval(null);
              setDetalleEval(null);
            }}
          >
            ← Volver al listado de evaluaciones
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b flex justify-between items-center">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardDocumentListIcon className="w-5 h-5 text-teal-600" />
              Evaluaciones
            </h2>
            <button
              type="button"
              onClick={nuevaEvaluacion}
              className="inline-flex items-center gap-1 rounded-lg bg-teal-600 text-white text-sm px-3 py-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              Nueva evaluación
            </button>
          </div>
          {evaluaciones.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">Sin evaluaciones aún.</p>
          ) : (
            <ul className="divide-y">
              {evaluaciones.map((e) => (
                <li key={e.id} className="px-5 py-3 flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-slate-800">
                      {formatoFechaDMY(e.fecha)} — {e.detalle?.slice(0, 60)}
                      {e.detalle?.length > 60 ? '…' : ''}
                    </p>
                    <p className="text-xs text-slate-500">
                      Ganador: {e.ganador_nombre || '—'} ·{' '}
                      {e.proveedor_registrado_id ? (
                        <span className="text-emerald-600">En lista</span>
                      ) : (
                        <span className="text-amber-600">Pendiente registro</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-teal-700 font-medium hover:underline"
                    onClick={() => verEvaluacion(e.id)}
                  >
                    Ver detalle
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {modalLista && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="font-bold text-lg">
              {modalLista === 'nuevo' ? 'Nuevo proveedor' : 'Editar proveedor'}
            </h3>
            <FormProveedor
              form={formProv}
              setForm={setFormProv}
              catalogos={catalogos}
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                className="flex-1 rounded-xl border py-2 text-sm"
                onClick={() => setModalLista(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardando}
                className="flex-1 rounded-xl bg-teal-600 text-white py-2 text-sm disabled:opacity-50"
                onClick={guardarProveedor}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalGanador && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h3 className="font-bold text-lg">Registrar ganador en lista</h3>
            <p className="text-sm text-slate-600">
              <strong>{modalGanador.razon_social}</strong> — {modalGanador.puntaje_total} puntos.
              Complete los datos para la lista de proveedores.
            </p>
            <FormProveedor form={formGanador} setForm={setFormGanador} catalogos={catalogos} />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border py-2 text-sm"
                onClick={() => setModalGanador(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardando}
                className="flex-1 rounded-xl bg-teal-600 text-white py-2 text-sm"
                onClick={confirmarRegistrarGanador}
              >
                Registrar en lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function FormProveedor({ form, setForm, catalogos }) {
  const ch = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="text-xs text-slate-600">Razón social *</label>
        <input
          className="w-full mt-1 rounded-lg border px-3 py-2"
          value={form.razon_social}
          onChange={(e) => ch('razon_social', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-600">Tipo *</label>
          <select
            className="w-full mt-1 rounded-lg border px-3 py-2"
            value={form.tipo_proveedor}
            onChange={(e) => ch('tipo_proveedor', e.target.value)}
          >
            {(catalogos?.tipos_proveedor || []).map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {form.tipo_proveedor === 'otros' && (
          <div>
            <label className="text-xs text-slate-600">Especifique tipo</label>
            <input
              className="w-full mt-1 rounded-lg border px-3 py-2"
              value={form.tipo_proveedor_otro}
              onChange={(e) => ch('tipo_proveedor_otro', e.target.value)}
            />
          </div>
        )}
      </div>
      <div>
        <label className="text-xs text-slate-600">Website</label>
        <input
          className="w-full mt-1 rounded-lg border px-3 py-2"
          value={form.website}
          onChange={(e) => ch('website', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-600">Fecha registro *</label>
          <input
            type="date"
            className="w-full mt-1 rounded-lg border px-3 py-2"
            value={form.fecha_registro}
            onChange={(e) => ch('fecha_registro', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-600">Área solicitante *</label>
          <select
            className="w-full mt-1 rounded-lg border px-3 py-2"
            value={form.area_solicitante}
            onChange={(e) => ch('area_solicitante', e.target.value)}
          >
            {(catalogos?.areas_solicitante || []).map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {form.area_solicitante === 'otros' && (
        <div>
          <label className="text-xs text-slate-600">Especifique área</label>
          <input
            className="w-full mt-1 rounded-lg border px-3 py-2"
            value={form.area_otro}
            onChange={(e) => ch('area_otro', e.target.value)}
          />
        </div>
      )}
      <div>
        <label className="text-xs text-slate-600">Producto / Servicio *</label>
        <input
          className="w-full mt-1 rounded-lg border px-3 py-2"
          value={form.producto_servicio}
          onChange={(e) => ch('producto_servicio', e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-slate-600">Contacto Prayaga *</label>
        <input
          className="w-full mt-1 rounded-lg border px-3 py-2"
          value={form.contacto_prayaga}
          onChange={(e) => ch('contacto_prayaga', e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-slate-600">Nombre contacto proveedor</label>
        <input
          className="w-full mt-1 rounded-lg border px-3 py-2"
          value={form.nombre_contacto_proveedor}
          onChange={(e) => ch('nombre_contacto_proveedor', e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs text-slate-600">Datos proveedor (correo, teléfono, etc.)</label>
        <textarea
          className="w-full mt-1 rounded-lg border px-3 py-2"
          rows={2}
          value={form.datos_proveedor}
          onChange={(e) => ch('datos_proveedor', e.target.value)}
        />
      </div>
    </div>
  );
}

export default Proveedores;
