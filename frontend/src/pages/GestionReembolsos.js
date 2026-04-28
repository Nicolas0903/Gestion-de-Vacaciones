import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, Cog6ToothIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { reembolsoService } from '../services/api';

const metodoLabel = (m) =>
  ({ yape: 'Yape', plin: 'Plin', transferencia: 'Transferencia' }[m] || m);

const formatoMonto = (m) => {
  const n = Number(m);
  if (Number.isNaN(n)) return '—';
  return `S/ ${n.toFixed(2)}`;
};

const estadoBadge = (e) => {
  const map = {
    pendiente: 'bg-amber-100 text-amber-800',
    aprobado: 'bg-emerald-100 text-emerald-800',
    rechazado: 'bg-rose-100 text-rose-800',
    observado: 'bg-sky-100 text-sky-900'
  };
  return map[e] || 'bg-slate-100 text-slate-700';
};

const estadoLabel = (e) =>
  ({
    pendiente: 'Pendiente',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    observado: 'Observado'
  }[e] || e);

function descargarBlob(blob, nombre) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  window.URL.revokeObjectURL(url);
}

const GestionReembolsos = () => {
  const { esAdmin } = useAuth();
  const [tab, setTab] = useState('pendientes');
  const [pendientes, setPendientes] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rechazoId, setRechazoId] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [aprobarId, setAprobarId] = useState(null);
  const [comentarioAprobar, setComentarioAprobar] = useState('');
  const [observarId, setObservarId] = useState(null);
  const [comentarioObservar, setComentarioObservar] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [editar, setEditar] = useState(null);
  const [formEdit, setFormEdit] = useState(null);
  const [archivoReemplazo, setArchivoReemplazo] = useState(null);

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

  useEffect(() => {
    if (!editar) {
      setFormEdit(null);
      setArchivoReemplazo(null);
      return;
    }
    setFormEdit({
      fecha_solicitud_usuario: editar.fecha_solicitud_usuario?.slice(0, 10) || '',
      concepto: editar.concepto || '',
      monto: String(editar.monto ?? '0'),
      metodo_reembolso: editar.metodo_reembolso || 'yape',
      celular: editar.celular || '',
      nombre_en_metodo: editar.nombre_en_metodo || '',
      numero_cuenta: editar.numero_cuenta || '',
      ruc_numero_documento: String(editar.ruc_proveedor || editar.numero_documento || '').trim()
    });
    setArchivoReemplazo(null);
  }, [editar]);

  const puedeResolver = (r) => r.estado === 'pendiente' || r.estado === 'observado';

  const confirmarAprobar = async () => {
    if (!aprobarId) return;
    setProcesando(true);
    try {
      await reembolsoService.aprobar(aprobarId, comentarioAprobar.trim());
      toast.success('Solicitud aprobada.');
      setAprobarId(null);
      setComentarioAprobar('');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al aprobar.');
    } finally {
      setProcesando(false);
    }
  };

  const confirmarObservar = async () => {
    if (!observarId || !comentarioObservar.trim()) {
      toast.error('Indique las observaciones.');
      return;
    }
    setProcesando(true);
    try {
      await reembolsoService.observar(observarId, comentarioObservar.trim());
      toast.success('Registrado como observado.');
      setObservarId(null);
      setComentarioObservar('');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al registrar.');
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

  const eliminarRegistro = async (id, codigo) => {
    if (!window.confirm(`¿Eliminar definitivamente la solicitud ${codigo}? Esta acción no se puede deshacer.`)) {
      return;
    }
    setProcesando(true);
    try {
      await reembolsoService.eliminar(id);
      toast.success('Registro eliminado.');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo eliminar.');
    } finally {
      setProcesando(false);
    }
  };

  const bajarRecibo = async (id, codigo) => {
    try {
      const res = await reembolsoService.descargarRecibo(id);
      descargarBlob(res.data, `${codigo}.pdf`);
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

  const guardarEdicionAdmin = async () => {
    if (!editar || !formEdit) return;
    if (!formEdit.fecha_solicitud_usuario || !formEdit.concepto.trim()) {
      toast.error('Fecha y concepto son obligatorios.');
      return;
    }
    if (editar.tiene_comprobante && !String(formEdit.ruc_numero_documento).trim()) {
      toast.error('Indique RUC y N° de documento (mismo valor).');
      return;
    }
    setProcesando(true);
    try {
      const fd = new FormData();
      fd.append('fecha_solicitud_usuario', formEdit.fecha_solicitud_usuario);
      fd.append('concepto', formEdit.concepto.trim());
      fd.append('monto', formEdit.monto || '0');
      fd.append('metodo_reembolso', formEdit.metodo_reembolso);
      fd.append('celular', formEdit.celular.trim());
      fd.append('nombre_en_metodo', formEdit.nombre_en_metodo.trim());
      if (formEdit.metodo_reembolso === 'transferencia') {
        fd.append('numero_cuenta', formEdit.numero_cuenta.trim());
      }
      fd.append('ruc_numero_documento', String(formEdit.ruc_numero_documento || '').trim());
      if (archivoReemplazo) {
        fd.append('comprobante', archivoReemplazo);
      }
      await reembolsoService.actualizarAdmin(editar.id, fd);
      toast.success('Solicitud actualizada.');
      setEditar(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo guardar.');
    } finally {
      setProcesando(false);
    }
  };

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
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Gestión de solicitudes de reintegro</h1>
            <p className="text-sm text-slate-500">Revisión y resolución</p>
            {esAdmin() && (
              <p className="text-xs text-slate-500 mt-2 max-w-xl">
                Como administrador puedes <strong className="font-medium text-slate-700">eliminar</strong> cualquier
                solicitud desde la columna de acciones (se borran también los archivos adjuntos o el PDF generado).
              </p>
            )}
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
                  <th className="px-4 py-3 font-medium whitespace-nowrap">Monto</th>
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Observaciones</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                  {esAdmin() && <th className="px-4 py-3 font-medium w-36">Admin</th>}
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
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-800">
                      {formatoMonto(r.monto)}
                    </td>
                    <td className="px-4 py-3">{metodoLabel(r.metodo_reembolso)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${estadoBadge(r.estado)}`}>
                        {estadoLabel(r.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] text-xs text-slate-600 align-top" title={r.comentarios_resolucion || ''}>
                      {r.comentarios_resolucion ? (
                        <span className="line-clamp-3">{r.comentarios_resolucion}</span>
                      ) : (
                        '—'
                      )}
                      <details className="mt-2 text-xs">
                        <summary className="cursor-pointer text-sky-600 font-medium select-none">Ver ficha</summary>
                        <div className="mt-2 space-y-1 text-slate-600 border border-slate-100 rounded-lg p-2 bg-slate-50/90 max-w-xs">
                          <p>
                            <span className="text-slate-500">Fecha gasto:</span> {r.fecha_solicitud_usuario || '—'}
                          </p>
                          <p>
                            <span className="text-slate-500">DNI:</span> <span className="font-mono">{r.dni}</span>
                          </p>
                          <p>
                            <span className="text-slate-500">Comprobante:</span>{' '}
                            {r.tiene_comprobante ? 'Sí' : 'No (recibo)'}
                          </p>
                          {r.tiene_comprobante && (
                            <>
                              <p>
                                <span className="text-slate-500">RUC / N° doc.:</span>{' '}
                                <span className="font-mono break-all">
                                  {String(r.ruc_proveedor || r.numero_documento || '').trim() || '—'}
                                </span>
                              </p>
                              <p className="break-all">
                                <span className="text-slate-500">Archivo:</span> {r.archivo_comprobante_nombre || '—'}
                              </p>
                            </>
                          )}
                          <p>
                            <span className="text-slate-500">Celular:</span>{' '}
                            <span className="font-mono">{r.celular || '—'}</span>
                          </p>
                          <p>
                            <span className="text-slate-500">Nombre método:</span> {r.nombre_en_metodo || '—'}
                          </p>
                          {r.metodo_reembolso === 'transferencia' && (
                            <p className="break-all whitespace-pre-wrap">
                              <span className="text-slate-500">Cuenta/CCI:</span> {r.numero_cuenta || '—'}
                            </p>
                          )}
                        </div>
                      </details>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 items-center">
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
                        {puedeResolver(r) && (tab === 'pendientes' || tab === 'todos') && (
                          <>
                            <button
                              type="button"
                              disabled={procesando}
                              className="text-emerald-600 text-xs font-medium hover:underline disabled:opacity-50"
                              onClick={() => {
                                setAprobarId(r.id);
                                setComentarioAprobar('');
                              }}
                            >
                              Aprobar
                            </button>
                            {r.estado === 'pendiente' && (
                              <button
                                type="button"
                                disabled={procesando}
                                className="text-indigo-600 text-xs font-medium hover:underline disabled:opacity-50"
                                onClick={() => {
                                  setObservarId(r.id);
                                  setComentarioObservar('');
                                }}
                              >
                                Observar
                              </button>
                            )}
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
                    {esAdmin() && (
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            disabled={procesando}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-900 hover:bg-sky-100 disabled:opacity-50"
                            title="Editar datos de la solicitud"
                            onClick={() => setEditar(r)}
                          >
                            <PencilSquareIcon className="w-3.5 h-3.5 shrink-0" />
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={procesando}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                            title="Eliminar solicitud y archivos (solo administrador)"
                            onClick={() => eliminarRegistro(r.id, r.codigo_ticket)}
                          >
                            <TrashIcon className="w-3.5 h-3.5 shrink-0" />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {aprobarId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-800 mb-2">Aprobar solicitud</h3>
            <p className="text-sm text-slate-600 mb-3">Opcional: observaciones para el colaborador.</p>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-4"
              rows={3}
              value={comentarioAprobar}
              onChange={(e) => setComentarioAprobar(e.target.value)}
              placeholder="Observaciones (opcional)"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm bg-slate-100 text-slate-700"
                onClick={() => {
                  setAprobarId(null);
                  setComentarioAprobar('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesando}
                className="px-4 py-2 rounded-xl text-sm bg-emerald-600 text-white disabled:opacity-50"
                onClick={confirmarAprobar}
              >
                Confirmar aprobación
              </button>
            </div>
          </div>
        </div>
      )}

      {observarId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-800 mb-2">Marcar como observado</h3>
            <p className="text-sm text-slate-600 mb-3">Indique observaciones para el solicitante (obligatorio).</p>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-4"
              rows={4}
              value={comentarioObservar}
              onChange={(e) => setComentarioObservar(e.target.value)}
              placeholder="Observaciones"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm bg-slate-100 text-slate-700"
                onClick={() => {
                  setObservarId(null);
                  setComentarioObservar('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesando}
                className="px-4 py-2 rounded-xl text-sm bg-indigo-600 text-white disabled:opacity-50"
                onClick={confirmarObservar}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {editar && formEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8">
            <h3 className="font-bold text-slate-800 mb-1">Editar solicitud (admin)</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">{editar.codigo_ticket}</p>
            <div className="space-y-3 text-sm max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-slate-600 mb-1">Fecha del gasto *</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={formEdit.fecha_solicitud_usuario}
                  onChange={(e) => setFormEdit({ ...formEdit, fecha_solicitud_usuario: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Concepto *</label>
                <textarea
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={formEdit.concepto}
                  onChange={(e) => setFormEdit({ ...formEdit, concepto: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">Monto (S/) *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={formEdit.monto}
                  onChange={(e) => setFormEdit({ ...formEdit, monto: e.target.value })}
                />
              </div>
              {editar.tiene_comprobante && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 mb-1">RUC *</label>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                        value={formEdit.ruc_numero_documento}
                        onChange={(e) =>
                          setFormEdit({ ...formEdit, ruc_numero_documento: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">N° documento *</label>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                        value={formEdit.ruc_numero_documento}
                        onChange={(e) =>
                          setFormEdit({ ...formEdit, ruc_numero_documento: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Reemplazar comprobante (opcional)</label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx"
                      className="text-xs w-full"
                      onChange={(e) => setArchivoReemplazo(e.target.files?.[0] || null)}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-slate-600 mb-1">Método *</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={formEdit.metodo_reembolso}
                  onChange={(e) => setFormEdit({ ...formEdit, metodo_reembolso: e.target.value })}
                >
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1">
                  Celular{formEdit.metodo_reembolso === 'transferencia' ? ' (opc.)' : ' *'}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={formEdit.celular}
                  onChange={(e) => setFormEdit({ ...formEdit, celular: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">
                  Nombre en método{formEdit.metodo_reembolso === 'transferencia' ? ' (opc.)' : ' *'}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={formEdit.nombre_en_metodo}
                  onChange={(e) => setFormEdit({ ...formEdit, nombre_en_metodo: e.target.value })}
                />
              </div>
              {formEdit.metodo_reembolso === 'transferencia' && (
                <div>
                  <label className="block text-slate-600 mb-1">Cuenta / CCI</label>
                  <textarea
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                    value={formEdit.numero_cuenta}
                    onChange={(e) => setFormEdit({ ...formEdit, numero_cuenta: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-sm bg-slate-100 text-slate-700"
                onClick={() => setEditar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesando}
                className="px-4 py-2 rounded-xl text-sm bg-sky-600 text-white disabled:opacity-50"
                onClick={guardarEdicionAdmin}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

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
