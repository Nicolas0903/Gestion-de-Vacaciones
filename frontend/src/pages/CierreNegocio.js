import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline';
import { cierresNegocioService } from '../services/api';
import CierreNegocioReporteExcel from '../components/cierreNegocio/CierreNegocioReporteExcel';
import CierreNegocioActividades from '../components/cierreNegocio/CierreNegocioActividades';
import CierreNegocioCronograma from '../components/cierreNegocio/CierreNegocioCronograma';
import CierreNegocioHojasCosto from '../components/cierreNegocio/CierreNegocioHojasCosto';
import CierreNegocioEditor from '../components/cierreNegocio/CierreNegocioEditor';
import NuevoCierreNegocioModal from '../components/cierreNegocio/NuevoCierreNegocioModal';

const CierreNegocio = () => {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [vista, setVista] = useState('reporte'); // reporte | actividades | cronograma | hojas | editar
  const [guardando, setGuardando] = useState(false);

  const cargarLista = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await cierresNegocioService.listar();
      setLista(data.data || []);
    } catch {
      toast.error('No se pudo cargar cierres de negocio');
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarDetalle = useCallback(async (id) => {
    if (!id) {
      setDetalle(null);
      return;
    }
    try {
      const { data } = await cierresNegocioService.obtener(id);
      setDetalle(data.data);
    } catch {
      toast.error('No se pudo cargar el cierre');
      setSelId(null);
    }
  }, []);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  useEffect(() => {
    if (!selId) {
      setDetalle(null);
      return;
    }
    cargarDetalle(selId);
  }, [selId, cargarDetalle]);

  const onCreado = (nuevo) => {
    toast.success(`Cierre ${nuevo?.cierre?.codigo} creado`);
    cargarLista();
    if (nuevo?.cierre?.id) {
      setDetalle(nuevo);
      setSelId(nuevo.cierre.id);
      setVista('editar');
    }
  };

  const seleccionarCierre = (id) => {
    setSelId(id);
    setVista('reporte');
  };

  const guardar = async (payload) => {
    if (!selId) return;
    setGuardando(true);
    try {
      const { data } = await cierresNegocioService.actualizar(selId, payload);
      setDetalle(data.data);
      toast.success('Cierre guardado');
      cargarLista();
      setVista('reporte');
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!selId || !detalle?.cierre) return;
    const msg = `¿Eliminar el cierre ${detalle.cierre.codigo}?\n\nEsta acción no se puede deshacer.`;
    if (!window.confirm(msg)) return;
    setEliminando(true);
    try {
      await cierresNegocioService.eliminar(selId);
      toast.success('Cierre eliminado');
      setSelId(null);
      setDetalle(null);
      cargarLista();
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al eliminar');
    } finally {
      setEliminando(false);
    }
  };

  if (loading && !lista.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/20">
      <div className="max-w-[1500px] mx-auto px-4 py-6">
        <Link to="/portal" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-teal-600 mb-4">
          <ArrowLeftIcon className="w-4 h-4" /> Portal
        </Link>

        <div className="flex flex-wrap justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardDocumentCheckIcon className="w-7 h-7 text-teal-600" />
              Cierre de Negocio
            </h1>
            <p className="text-sm text-slate-500">
              Reporte inicial · Facturación · Costos y utilidad
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalNuevo(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
          >
            <PlusIcon className="w-5 h-5" /> Nuevo cierre
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-3">
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b font-medium text-slate-700">Cierres registrados</div>
              <div className="max-h-[75vh] overflow-y-auto divide-y">
                {lista.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => seleccionarCierre(c.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                      selId === c.id ? 'bg-teal-50 border-l-4 border-teal-500' : ''
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-800">{c.codigo}</div>
                    <div className="text-xs text-slate-500 truncate">{c.cotizacion_proyecto || c.cliente_nombre}</div>
                    <div className="text-xs text-slate-400 truncate">{c.cliente_nombre}</div>
                    <div className="flex gap-2 mt-1 text-xs flex-wrap">
                      {!c.cotizacion_id ? (
                        <span className="bg-amber-100 text-amber-800 px-2 rounded">Histórico</span>
                      ) : (
                        <span className="bg-slate-100 px-2 rounded">{c.cotizacion_codigo}</span>
                      )}
                      <span className="text-teal-700 capitalize">{c.status_cierre || 'inicial'}</span>
                    </div>
                  </button>
                ))}
                {!lista.length && (
                  <p className="px-4 py-8 text-sm text-center text-slate-400">Sin cierres aún</p>
                )}
              </div>
            </div>
          </aside>

          <main className="lg:col-span-9">
            {!selId ? (
              <div className="bg-white rounded-2xl border p-16 text-center">
                <ClipboardDocumentCheckIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-2">Selecciona un cierre o crea uno nuevo</p>
                <button
                  type="button"
                  onClick={() => setModalNuevo(true)}
                  className="text-sm text-teal-600 hover:underline"
                >
                  Crear cierre de negocio
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap rounded-xl border bg-white p-1 shadow-sm gap-0.5">
                    {[
                      { id: 'reporte', label: 'Cierre de negocio', icon: DocumentChartBarIcon },
                      { id: 'actividades', label: 'Actividades', icon: ClipboardDocumentCheckIcon },
                      { id: 'cronograma', label: 'Cronograma', icon: ClipboardDocumentCheckIcon },
                      { id: 'hojas', label: 'Hojas de costo', icon: ClipboardDocumentCheckIcon },
                      { id: 'editar', label: 'Editar', icon: PencilSquareIcon }
                    ].map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setVista(id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg ${
                          vista === id ? 'bg-teal-50 text-teal-800 font-medium' : 'text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" /> {label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={eliminar}
                    disabled={eliminando}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    <TrashIcon className="w-4 h-4" /> Eliminar
                  </button>
                </div>

                {!detalle ? (
                  <div className="bg-white rounded-2xl border p-12 text-center text-slate-500 text-sm">
                    Cargando cierre…
                  </div>
                ) : (
                  <>
                    {vista === 'reporte' && <CierreNegocioReporteExcel detalle={detalle} />}
                    {vista === 'actividades' && <CierreNegocioActividades detalle={detalle} />}
                    {vista === 'cronograma' && <CierreNegocioCronograma detalle={detalle} />}
                    {vista === 'hojas' && (
                      <CierreNegocioHojasCosto detalle={detalle} onGuardar={guardar} guardando={guardando} />
                    )}
                    {vista === 'editar' && (
                      <CierreNegocioEditor detalle={detalle} onGuardar={guardar} guardando={guardando} />
                    )}
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <NuevoCierreNegocioModal
        open={modalNuevo}
        onClose={() => setModalNuevo(false)}
        onCreado={onCreado}
      />
    </div>
  );
};

export default CierreNegocio;
