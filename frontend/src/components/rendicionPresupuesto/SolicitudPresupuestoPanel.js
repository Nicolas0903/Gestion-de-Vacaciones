import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { rendicionPresupuestoService } from '../../services/api';
import { formatoFechaDMY } from '../../utils/dateUtils';
import { MONEDAS_RENDICION } from '../../utils/monedaRendicion';

const estadoBadge = (e) => {
  const map = {
    borrador: 'bg-slate-100 text-slate-700',
    pendiente: 'bg-amber-100 text-amber-800',
    aprobada: 'bg-emerald-100 text-emerald-800',
    rechazada: 'bg-rose-100 text-rose-800',
    cancelada: 'bg-slate-200 text-slate-600'
  };
  return map[e] || 'bg-slate-100';
};

const estadoLabel = (e) =>
  ({
    borrador: 'Borrador',
    pendiente: 'Pendiente (Magali)',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    cancelada: 'Cancelada'
  }[e] || e);

export default function SolicitudPresupuestoPanel({ areas, onAprobadaChange }) {
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editId, setEditId] = useState(null);

  const [area, setArea] = useState('');
  const [concepto, setConcepto] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState('PEN');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await rendicionPresupuestoService.solicitudesPresupuestoMias();
      setLista(data.data || []);
      onAprobadaChange?.();
    } catch {
      toast.error('No se pudieron cargar solicitudes de presupuesto.');
    } finally {
      setLoading(false);
    }
  }, [onAprobadaChange]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resetForm = () => {
    setEditId(null);
    setArea('');
    setConcepto('');
    setJustificacion('');
    setMonto('');
    setMoneda('PEN');
  };

  const cargarEnForm = (s) => {
    setEditId(s.id);
    setArea(s.area);
    setConcepto(s.concepto);
    setJustificacion(s.justificacion || '');
    setMonto(String(s.monto_solicitado));
    setMoneda(s.moneda || 'PEN');
  };

  const enviar = async (enviarAprobacion) => {
    if (!area || !concepto.trim()) {
      toast.error('Complete área y concepto.');
      return;
    }
    const montoNum = parseFloat(String(monto).replace(',', '.'));
    if (Number.isNaN(montoNum) || montoNum <= 0) {
      toast.error('Monto solicitado inválido.');
      return;
    }
    if (enviarAprobacion && !justificacion.trim()) {
      toast.error('La justificación es obligatoria al enviar a Magali.');
      return;
    }
    setGuardando(true);
    try {
      const body = {
        area,
        concepto: concepto.trim(),
        justificacion: justificacion.trim(),
        monto_solicitado: montoNum,
        moneda,
        enviar: enviarAprobacion
      };
      if (editId) {
        await rendicionPresupuestoService.actualizarSolicitudPresupuesto(editId, body);
      } else {
        await rendicionPresupuestoService.crearSolicitudPresupuesto(body);
      }
      toast.success(
        enviarAprobacion
          ? 'Enviado a aprobación de gerencia (Magali / equipo autorizado).'
          : 'Borrador guardado.'
      );
      resetForm();
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = async (id) => {
    if (!window.confirm('¿Cancelar esta solicitud de presupuesto?')) return;
    try {
      await rendicionPresupuestoService.cancelarSolicitudPresupuesto(id);
      toast.success('Cancelada.');
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'No se pudo cancelar.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-5 text-sm text-slate-700">
        <strong>Paso 1 — Solicitud de presupuesto.</strong> Magali (o el aprobador configurado) debe
        aprobar el monto antes de registrar gastos en <strong>Rendición de gastos</strong>.
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(true);
        }}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Área *</label>
            <select
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 bg-white"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
            >
              <option value="">Seleccione…</option>
              {areas.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto solicitado *</label>
            <div className="flex gap-2">
              <select
                className="rounded-xl border border-slate-200 px-2 py-2.5 bg-white"
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
              >
                {MONEDAS_RENDICION.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Concepto / proyecto *</label>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Justificación *</label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Detalle para aprobación de Magali"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={guardando}
            onClick={() => enviar(false)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            Guardar borrador
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
          >
            {guardando ? 'Enviando…' : 'Enviar a aprobación'}
          </button>
          {editId ? (
            <button type="button" onClick={resetForm} className="text-sm text-slate-500 hover:underline">
              Nueva solicitud
            </button>
          ) : null}
        </div>
      </form>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">Mis solicitudes de presupuesto</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Cargando…</p>
        ) : lista.length === 0 ? (
          <p className="text-slate-500 text-sm">Aún no tiene solicitudes.</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {lista.map((s) => (
              <li key={s.id} className="px-4 py-3 bg-white flex flex-wrap gap-3 justify-between items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-teal-700">{s.codigo}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${estadoBadge(s.estado)}`}>
                      {estadoLabel(s.estado)}
                    </span>
                  </div>
                  <p className="font-medium text-slate-800 mt-1">{s.concepto}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {s.area_label} · {s.monto_solicitado_formateado}
                    {s.estado === 'aprobada' && s.monto_aprobado_formateado
                      ? ` · Aprobado: ${s.monto_aprobado_formateado}`
                      : ''}
                    {s.monto_saldo != null && s.estado === 'aprobada'
                      ? ` · Saldo: ${s.monto_saldo}`
                      : ''}
                  </p>
                  <p className="text-xs text-slate-400">{formatoFechaDMY(s.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  {['borrador', 'pendiente'].includes(s.estado) && (
                    <>
                      <button
                        type="button"
                        className="text-xs text-teal-700 hover:underline"
                        onClick={() => cargarEnForm(s)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="text-xs text-rose-600 hover:underline"
                        onClick={() => cancelar(s.id)}
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
