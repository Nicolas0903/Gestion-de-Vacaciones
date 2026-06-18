import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { reembolsoService } from '../services/api';
import { REEMBOLSOS_MAX_UPLOAD_MB, REEMBOLSOS_MAX_FILE_BYTES } from '../config/reembolsosUpload';
import { AyudaUbicacionFactura } from './AyudaFacturaReembolso';

function buildFormFromReembolso(r) {
  return {
    fecha_solicitud_usuario: r.fecha_solicitud_usuario?.slice(0, 10) || '',
    concepto: r.concepto || '',
    monto: String(r.monto ?? '0'),
    metodo_reembolso: r.metodo_reembolso || 'yape',
    celular: r.celular || '',
    nombre_en_metodo: r.nombre_en_metodo || '',
    numero_cuenta: r.numero_cuenta || '',
    ruc_proveedor: String(r.ruc_proveedor || '').trim(),
    numero_documento: String(r.numero_documento || '').trim()
  };
}

/**
 * Modal admin para editar una solicitud de reintegro (mismo formulario que Gestión de reintegros).
 * @param {{ reembolsoId: number|null, onClose: () => void, onSaved?: () => void }} props
 */
const ReembolsoAdminEditModal = ({ reembolsoId, onClose, onSaved }) => {
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [reembolso, setReembolso] = useState(null);
  const [formEdit, setFormEdit] = useState(null);
  const [archivoReemplazo, setArchivoReemplazo] = useState(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!reembolsoId) {
      setReembolso(null);
      setFormEdit(null);
      setArchivoReemplazo(null);
      return;
    }
    let cancelado = false;
    setCargando(true);
    setReembolso(null);
    setFormEdit(null);
    setArchivoReemplazo(null);
    reembolsoService
      .obtener(reembolsoId)
      .then(({ data }) => {
        if (cancelado) return;
        const row = data?.data;
        if (!row) {
          toast.error('Solicitud no encontrada.');
          onCloseRef.current();
          return;
        }
        setReembolso(row);
        setFormEdit(buildFormFromReembolso(row));
      })
      .catch((err) => {
        if (cancelado) return;
        toast.error(err.response?.data?.mensaje || 'No se pudo cargar la solicitud.');
        onCloseRef.current();
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [reembolsoId]);

  if (!reembolsoId) return null;

  const convertirAReciboInterno = async () => {
    if (!reembolso || !formEdit) return;
    if (!formEdit.fecha_solicitud_usuario || !formEdit.concepto.trim()) {
      toast.error('Fecha y concepto son obligatorios.');
      return;
    }
    if (
      !window.confirm(
        `¿Convertir ${reembolso.codigo_ticket} de factura a recibo interno Prayaga?\n\nSe conservarán concepto, fecha y monto. Se eliminará el comprobante adjunto (RUC, N° documento) y se generará un PDF de recibo interno.`
      )
    ) {
      return;
    }
    setProcesando(true);
    try {
      await reembolsoService.convertirAReciboInterno(reembolso.id, {
        fecha_solicitud_usuario: formEdit.fecha_solicitud_usuario,
        concepto: formEdit.concepto.trim(),
        monto: formEdit.monto || '0'
      });
      toast.success('Convertido a recibo interno. Se generó el PDF de Prayaga.');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo convertir.');
    } finally {
      setProcesando(false);
    }
  };

  const guardar = async () => {
    if (!reembolso || !formEdit) return;
    if (!formEdit.fecha_solicitud_usuario || !formEdit.concepto.trim()) {
      toast.error('Fecha y concepto son obligatorios.');
      return;
    }
    if (reembolso.tiene_comprobante && !String(formEdit.ruc_proveedor).trim()) {
      toast.error('Indique el RUC del emisor.');
      return;
    }
    if (reembolso.tiene_comprobante && !String(formEdit.numero_documento).trim()) {
      toast.error('Indique el número de documento (factura).');
      return;
    }
    if (archivoReemplazo && archivoReemplazo.size > REEMBOLSOS_MAX_FILE_BYTES) {
      toast.error(
        `Supera los ${REEMBOLSOS_MAX_UPLOAD_MB} MB permitidos (${(archivoReemplazo.size / (1024 * 1024)).toFixed(1)} MB). Comprímalo e inténtelo de nuevo.`
      );
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
      fd.append('ruc_proveedor', String(formEdit.ruc_proveedor || '').trim());
      fd.append('numero_documento', String(formEdit.numero_documento || '').trim());
      if (archivoReemplazo) {
        fd.append('comprobante', archivoReemplazo);
      }
      await reembolsoService.actualizarAdmin(reembolso.id, fd);
      toast.success('Solicitud actualizada.');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo guardar.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reembolso-admin-edit-titulo"
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="reembolso-admin-edit-titulo" className="font-bold text-slate-800 mb-1">
          Editar solicitud (admin)
        </h3>
        {cargando ? (
          <p className="text-sm text-slate-500 py-8 text-center">Cargando solicitud…</p>
        ) : reembolso && formEdit ? (
          <>
            <p className="text-xs text-slate-500 mb-4 font-mono">{reembolso.codigo_ticket}</p>
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
              {reembolso.tiene_comprobante && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3">
                  <p className="text-xs text-amber-900 mb-2">
                    Esta solicitud fue registrada con factura. Puedes convertirla a{' '}
                    <strong className="font-medium">recibo interno Prayaga</strong> conservando concepto, fecha y
                    monto.
                  </p>
                  <button
                    type="button"
                    disabled={procesando}
                    onClick={convertirAReciboInterno}
                    className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Cambiar a recibo interno
                  </button>
                </div>
              )}
              {reembolso.tiene_comprobante && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 mb-1">
                        <span className="inline-flex items-center gap-1">
                          RUC *
                          <AyudaUbicacionFactura />
                        </span>
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                        value={formEdit.ruc_proveedor}
                        onChange={(e) => setFormEdit({ ...formEdit, ruc_proveedor: e.target.value })}
                        placeholder="Emisor"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">
                        <span className="inline-flex items-center gap-1">
                          N° documento *
                          <AyudaUbicacionFactura />
                        </span>
                      </label>
                      <input
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
                        value={formEdit.numero_documento}
                        onChange={(e) => setFormEdit({ ...formEdit, numero_documento: e.target.value })}
                        placeholder="Factura"
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
                    <p className="text-[11px] text-slate-500 mt-1">Máx. {REEMBOLSOS_MAX_UPLOAD_MB} MB.</p>
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
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={procesando}
                className="px-4 py-2 rounded-xl text-sm bg-sky-600 text-white disabled:opacity-50"
                onClick={guardar}
              >
                Guardar
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ReembolsoAdminEditModal;
