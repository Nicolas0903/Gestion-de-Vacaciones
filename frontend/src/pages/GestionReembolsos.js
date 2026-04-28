import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { reembolsoService } from '../services/api';

const metodoLabel = (m) =>
  ({ yape: 'Yape', plin: 'Plin', transferencia: 'Transferencia' }[m] || m);

function descargarBlob(blob, nombre) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  window.URL.revokeObjectURL(url);
}

const GestionReembolsos = () => {
  const [tab, setTab] = useState('pendientes');
  const [pendientes, setPendientes] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rechazoId, setRechazoId] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [p, t] = await Promise.all([
        reembolsoService.pendientes(),
        reembolsoService.todos()
      ]);
      setPendientes(p.data.data || []);
      setTodos(t.data.data || []);
    } catch {
      toast.error('No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const aprobar = async (id) => {
    setProcesando(true);
    try {
      await reembolsoService.aprobar(id, '');
      toast.success('Solicitud aprobada.');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al aprobar.');
    } finally {
      setProcesando(false);
    }
  };

  const confirmarRechazo = async () => {
    if (!rechazoId || !motivoRechazo.trim()) {
      toast.error('Indique el motivo.');
      return;
    }
    setProcesando(true);
    try {
      await reembolsoService.rechazar(rechazoId, motivoRechazo.trim());
      toast.success('Solicitud rechazada.');
      setRechazoId(null);
      setMotivoRechazo('');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al rechazar.');
    } finally {
      setProcesando(false);
    }
  };

  const bajarRecibo = async (id, codigo) => {
    try {
      const res = await reembolsoService.descargarRecibo(id);
      descargarBlob(res.data, `recibo-${codigo}.pdf`);
    } catch {
      toast.error('Sin recibo o error al descargar.');
    }
  };

  const bajarComprobante = async (id, codigo) => {
    try {
      const res = await reembolsoService.descargarComprobante(id);
      descargarBlob(res.data, `comprobante-${codigo}`);
    } catch {
      toast.error('Sin comprobante o error al descargar.');
    }
  };

  const filas = tab === 'pendientes' ? pendientes : todos;

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        to="/portal"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600 mb-8 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al portal
      </Link>

      <div className="rounded-3xl bg-white border border-slate-100 shadow-lg p-8 md:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0">
            <Cog6ToothIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Gestión de reembolsos</h1>
            <p className="text-sm text-slate-500">Aprobación centralizada</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setTab('pendientes')}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tab === 'pendientes'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pendientes ({pendientes.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('todos')}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tab === 'todos'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Cargando…</p>
        ) : filas.length === 0 ? (
          <p className="text-slate-500 text-sm">No hay registros en esta vista.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Ticket</th>
                  <th className="px-4 py-3 font-medium">Solicitante</th>
                  <th className="px-4 py-3 font-medium">Concepto</th>
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filas.map((r) => (
                  <tr key={r.id} className="text-slate-700">
                    <td className="px-4 py-3 font-mono text-xs">{r.codigo_ticket}</td>
                    <td className="px-4 py-3">
                      {r.empleado_nombres} {r.empleado_apellidos}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate" title={r.concepto}>
                      {r.concepto}
                    </td>
                    <td className="px-4 py-3">{metodoLabel(r.metodo_reembolso)}</td>
                    <td className="px-4 py-3 capitalize">{r.estado}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {!r.tiene_comprobante && (
                          <button
                            type="button"
                            className="text-sky-600 text-xs font-medium hover:underline"
                            onClick={() => bajarRecibo(r.id, r.codigo_ticket)}
                          >
                            PDF
                          </button>
                        )}
                        {r.tiene_comprobante && (
                          <button
                            type="button"
                            className="text-sky-600 text-xs font-medium hover:underline"
                            onClick={() => bajarComprobante(r.id, r.codigo_ticket)}
                          >
                            Comp.
                          </button>
                        )}
                        {r.estado === 'pendiente' && tab === 'pendientes' && (
                          <>
                            <button
                              type="button"
                              disabled={procesando}
                              className="text-emerald-600 text-xs font-medium hover:underline disabled:opacity-50"
                              onClick={() => aprobar(r.id)}
                            >
                              Aprobar
                            </button>
                            <button
                              type="button"
                              disabled={procesando}
                              className="text-rose-600 text-xs font-medium hover:underline disabled:opacity-50"
                              onClick={() => setRechazoId(r.id)}
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {rechazoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-800 mb-2">Motivo del rechazo</h3>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-4"
              rows={4}
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Obligatorio"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm bg-slate-100 text-slate-700"
                onClick={() => {
                  setRechazoId(null);
                  setMotivoRechazo('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesando}
                className="px-4 py-2 rounded-xl text-sm bg-rose-600 text-white disabled:opacity-50"
                onClick={confirmarRechazo}
              >
                Confirmar rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionReembolsos;
