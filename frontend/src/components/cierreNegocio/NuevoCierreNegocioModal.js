import React, { useEffect, useState } from 'react';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import ModalPortal from '../ModalPortal';
import { cierresNegocioService } from '../../services/api';
import { formatoMontoRendicion, MONEDAS_RENDICION } from '../../utils/monedaRendicion';

const MODO_COTIZACION = 'cotizacion';
const MODO_MANUAL = 'manual';

const formManualVacio = () => ({
  cliente_nombre: '',
  proyecto: '',
  cotizacion_codigo: '',
  codigo: '',
  moneda: 'PEN',
  forma_pago: 'Crédito 30 días',
  orden_compra: '',
  ruc: '',
  fecha_inicio: '',
  fecha_fin: ''
});

const NuevoCierreNegocioModal = ({ open, onClose, onCreado }) => {
  const [modo, setModo] = useState(MODO_COTIZACION);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [selId, setSelId] = useState('');
  const [formManual, setFormManual] = useState(formManualVacio);
  const [loading, setLoading] = useState(false);
  const [cargandoLista, setCargandoLista] = useState(false);

  useEffect(() => {
    if (!open) return;
    setModo(MODO_COTIZACION);
    setSelId('');
    setFormManual(formManualVacio());
    setCargandoLista(true);
    cierresNegocioService
      .cotizacionesDisponibles()
      .then(({ data }) => setCotizaciones(data.data || []))
      .catch(() => setCotizaciones([]))
      .finally(() => setCargandoLista(false));
  }, [open]);

  const seleccionada = cotizaciones.find((c) => String(c.id) === String(selId));
  const patchManual = (patch) => setFormManual((f) => ({ ...f, ...patch }));

  const puedeCrear =
    modo === MODO_COTIZACION ? Boolean(selId) : Boolean(formManual.cliente_nombre.trim());

  const crear = async () => {
    if (!puedeCrear) return;
    setLoading(true);
    try {
      const body =
        modo === MODO_COTIZACION
          ? {
              cotizacion_id: Number(selId),
              version_num: seleccionada?.version_actual || undefined
            }
          : {
              cliente_nombre: formManual.cliente_nombre.trim(),
              proyecto: formManual.proyecto.trim() || undefined,
              cotizacion_codigo: formManual.cotizacion_codigo.trim() || undefined,
              codigo: formManual.codigo.trim() || undefined,
              moneda: formManual.moneda,
              forma_pago: formManual.forma_pago.trim() || undefined,
              orden_compra: formManual.orden_compra.trim() || undefined,
              ruc: formManual.ruc.trim() || undefined,
              fecha_inicio: formManual.fecha_inicio || undefined,
              fecha_fin: formManual.fecha_fin || undefined
            };

      const { data } = await cierresNegocioService.crear(body);
      onCreado?.(data.data);
      onClose();
    } catch (e) {
      window.alert(e.response?.data?.mensaje || 'No se pudo crear el cierre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalPortal
      open={open}
      onClose={onClose}
      title="Nuevo cierre de negocio"
      subtitle={
        modo === MODO_COTIZACION
          ? 'Importa datos desde una cotización del portal'
          : 'Registro histórico sin cotización en el sistema'
      }
      maxWidth="max-w-xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={crear}
            disabled={!puedeCrear || loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <DocumentPlusIcon className="w-5 h-5" />
            {loading ? 'Creando…' : modo === MODO_MANUAL ? 'Crear cierre histórico' : 'Crear cierre inicial'}
          </button>
        </div>
      }
    >
      <div className="flex rounded-xl border border-slate-200 p-1 mb-5 bg-slate-50">
        <button
          type="button"
          onClick={() => setModo(MODO_COTIZACION)}
          className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
            modo === MODO_COTIZACION
              ? 'bg-white shadow-sm font-medium text-teal-800'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Desde cotización
        </button>
        <button
          type="button"
          onClick={() => setModo(MODO_MANUAL)}
          className={`flex-1 px-3 py-2 text-sm rounded-lg transition-colors ${
            modo === MODO_MANUAL
              ? 'bg-white shadow-sm font-medium text-teal-800'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Histórico / manual
        </button>
      </div>

      {modo === MODO_COTIZACION ? (
        <>
          <p className="text-sm text-slate-600 mb-4">
            Se importará facturación y costos desde la versión publicada de la cotización. El snapshot
            queda congelado como baseline para comparar variaciones.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cotización</label>
            {cargandoLista ? (
              <p className="text-sm text-slate-400">Cargando cotizaciones…</p>
            ) : cotizaciones.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                No hay cotizaciones en el portal. Usa la pestaña <strong>Histórico / manual</strong> para
                subir cierres pasados.
              </p>
            ) : (
              <select
                value={selId}
                onChange={(e) => setSelId(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">Selecciona una cotización…</option>
                {cotizaciones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} — {c.proyecto} ({c.cliente}) · v{c.version_actual || 1}
                  </option>
                ))}
              </select>
            )}
          </div>

          {seleccionada && (
            <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 text-sm space-y-1 mt-4">
              <p>
                <span className="text-slate-500">Cliente:</span>{' '}
                <strong>{seleccionada.cliente}</strong>
              </p>
              <p>
                <span className="text-slate-500">Proyecto:</span>{' '}
                <strong>{seleccionada.proyecto}</strong>
              </p>
              <p>
                <span className="text-slate-500">Versión actual:</span> v{seleccionada.version_actual || 1}
              </p>
              {seleccionada.monto_propuesta != null && (
                <p>
                  <span className="text-slate-500">Monto propuesta:</span>{' '}
                  <strong>{formatoMontoRendicion(seleccionada.monto_propuesta)}</strong>
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600 mb-4">
            Para cierres anteriores al portal o sin cotización digital. Al crear, irás directo a{' '}
            <strong>Editar datos</strong> para cargar facturación, costos y el resto del reporte.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formManual.cliente_nombre}
                onChange={(e) => patchManual({ cliente_nombre: e.target.value })}
                placeholder="Ej. CIA ELECTRICA EL PLATANAL"
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto</label>
              <input
                type="text"
                value={formManual.proyecto}
                onChange={(e) => patchManual({ proyecto: e.target.value })}
                placeholder="Nombre del proyecto o servicio"
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cód. cotización (ref.)</label>
              <input
                type="text"
                value={formManual.cotizacion_codigo}
                onChange={(e) => patchManual({ cotizacion_codigo: e.target.value })}
                placeholder="Ej. PRY.2025-7002-0006"
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cód. cierre (opcional)</label>
              <input
                type="text"
                value={formManual.codigo}
                onChange={(e) => patchManual({ codigo: e.target.value })}
                placeholder="Auto CN-2026-001 si vacío"
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
              <select
                value={formManual.moneda}
                onChange={(e) => patchManual({ moneda: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
              >
                {MONEDAS_RENDICION.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Forma de pago</label>
              <input
                type="text"
                value={formManual.forma_pago}
                onChange={(e) => patchManual({ forma_pago: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Orden de compra</label>
              <input
                type="text"
                value={formManual.orden_compra}
                onChange={(e) => patchManual({ orden_compra: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">RUC</label>
              <input
                type="text"
                value={formManual.ruc}
                onChange={(e) => patchManual({ ruc: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha inicio</label>
              <input
                type="date"
                value={formManual.fecha_inicio}
                onChange={(e) => patchManual({ fecha_inicio: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha fin</label>
              <input
                type="date"
                value={formManual.fecha_fin}
                onChange={(e) => patchManual({ fecha_fin: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
              />
            </div>
          </div>
        </>
      )}
    </ModalPortal>
  );
};

export default NuevoCierreNegocioModal;
