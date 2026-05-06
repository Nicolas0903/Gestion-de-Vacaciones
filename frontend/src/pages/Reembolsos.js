import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BanknotesIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { reembolsoService } from '../services/api';
import { formatoFechaDMY, formatoFechaHoraDMY } from '../utils/dateUtils';

const metodoLabel = (m) =>
  ({ yape: 'Yape', plin: 'Plin', transferencia: 'Transferencia' }[m] || m);

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

const Reembolsos = () => {
  const { usuario } = useAuth();
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [fechaSolicitud, setFechaSolicitud] = useState('');
  const [concepto, setConcepto] = useState('');
  const [tieneComprobante, setTieneComprobante] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [monto, setMonto] = useState('0');
  const [metodo, setMetodo] = useState('yape');
  const [celular, setCelular] = useState('');
  const [nombreEnMetodo, setNombreEnMetodo] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [rucProveedor, setRucProveedor] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);

  const nombreCompleto = `${usuario?.nombres || ''} ${usuario?.apellidos || ''}`.trim();
  const dni = usuario?.dni || '—';

  const resetFormularioReintegro = () => {
    setFechaSolicitud('');
    setConcepto('');
    setTieneComprobante(false);
    setArchivo(null);
    setMonto('0');
    setMetodo('yape');
    setCelular('');
    setNombreEnMetodo('');
    setNumeroCuenta('');
    setRucProveedor('');
    setNumeroDocumento('');
    setFileInputKey((k) => k + 1);
  };

  const cargarLista = async () => {
    setLoading(true);
    try {
      const { data } = await reembolsoService.misSolicitudes();
      setLista(data.data || []);
    } catch {
      toast.error('No se pudieron cargar tus solicitudes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarLista();
  }, []);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (!fechaSolicitud || !concepto.trim()) {
      toast.error('Complete la fecha y el concepto.');
      return;
    }
    if (metodo !== 'transferencia' && !celular.trim()) {
      toast.error('Indique el celular asociado a Yape o Plin.');
      return;
    }
    if (metodo !== 'transferencia' && !nombreEnMetodo.trim()) {
      toast.error('Indique el nombre que debe figurar en Yape o Plin.');
      return;
    }
    if (tieneComprobante && !String(rucProveedor).trim()) {
      toast.error('Indique el RUC del emisor según el comprobante.');
      return;
    }
    if (tieneComprobante && !String(numeroDocumento).trim()) {
      toast.error('Indique el número de documento (factura).');
      return;
    }
    if (tieneComprobante && !archivo) {
      toast.error('Adjunte el comprobante.');
      return;
    }
    const montoNum = parseFloat(String(monto).replace(',', '.')) || 0;
    if (tieneComprobante && (Number.isNaN(montoNum) || montoNum <= 0)) {
      toast.error('Indique el monto del gasto según el comprobante.');
      return;
    }

    const fd = new FormData();
    fd.append('fecha_solicitud_usuario', fechaSolicitud);
    fd.append('concepto', concepto.trim());
    fd.append('tiene_comprobante', tieneComprobante ? 'true' : 'false');
    fd.append('monto', monto || '0');
    fd.append('metodo_reembolso', metodo);
    fd.append('celular', celular.trim());
    fd.append('nombre_en_metodo', nombreEnMetodo.trim());
    if (metodo === 'transferencia') {
      fd.append('numero_cuenta', numeroCuenta.trim());
    }
    if (tieneComprobante) {
      fd.append('ruc_proveedor', String(rucProveedor).trim());
      fd.append('numero_documento', String(numeroDocumento).trim());
    }
    if (tieneComprobante && archivo) {
      fd.append('comprobante', archivo);
    }

    setEnviando(true);
    try {
      await reembolsoService.crear(fd);
      toast.success('Solicitud registrada. Se notificó al aprobador.');
      resetFormularioReintegro();
      cargarLista();
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo enviar la solicitud.';
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  };

  const bajarRecibo = async (id, codigo) => {
    try {
      const res = await reembolsoService.descargarRecibo(id);
      descargarBlob(res.data, `${codigo}.pdf`);
    } catch {
      toast.error('No hay recibo generado o no se pudo descargar.');
    }
  };

  const bajarComprobante = async (id, codigo) => {
    try {
      const res = await reembolsoService.descargarComprobante(id);
      descargarBlob(res.data, `comprobante-${codigo}`);
    } catch {
      toast.error('No se pudo descargar el comprobante.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        to="/portal"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-sky-600 mb-8 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al portal
      </Link>

      <div className="rounded-3xl bg-white border border-slate-100 shadow-lg p-8 md:p-10 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 mb-6">
          <BanknotesIcon className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Solicitud de reintegro</h1>
        <p className="text-slate-600 mb-6 text-sm">
          Los datos de nombre y DNI se toman de tu cuenta. El ID de ticket y la fecha de registro se generan al enviar.
        </p>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo</label>
              <input
                type="text"
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700"
                value={nombreCompleto}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
              <input
                type="text"
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700"
                value={dni}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha del recibo / gasto *</label>
            <input
              type="date"
              required
              className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2.5"
              value={fechaSolicitud}
              onChange={(e) => setFechaSolicitud(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Concepto *</label>
            <textarea
              required
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
              placeholder="Describe el gasto o motivo"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">¿Tienes comprobante de pago (factura)? *</span>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="comp"
                  checked={!tieneComprobante}
                  onChange={() => {
                    setTieneComprobante(false);
                    setArchivo(null);
                    setRucProveedor('');
                    setNumeroDocumento('');
                  }}
                />
                No — generar recibo Prayaga
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="comp"
                  checked={tieneComprobante}
                  onChange={() => setTieneComprobante(true)}
                />
                Sí — adjunto archivo
              </label>
            </div>
            {!tieneComprobante && (
              <p className="text-xs text-slate-500 mt-2">
                Se generará un PDF tipo recibo (visible en el correo al aprobador y descargable aquí).
              </p>
            )}
          </div>

          {tieneComprobante && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">RUC *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm"
                    value={rucProveedor}
                    onChange={(e) => setRucProveedor(e.target.value)}
                    placeholder="RUC del emisor en la factura"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">N° de documento *</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    placeholder="Serie y número de la factura"
                    autoComplete="off"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adjuntar comprobante *</label>
                <input
                  key={fileInputKey}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx"
                  className="text-sm text-slate-600"
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monto (S/) {tieneComprobante ? '*' : ''}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2.5"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-1.5">
              {tieneComprobante
                ? 'Importe del gasto según el comprobante (obligatorio si adjuntas factura o voucher).'
                : 'Importe que figurará en el recibo Prayaga generado.'}
            </p>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Método de reembolso</h2>
            {metodo === 'transferencia' && (
              <p className="text-xs text-slate-500 mb-3">
                Si eliges <strong className="font-medium text-slate-600">transferencia</strong>, celular y nombre son{' '}
                <strong className="font-medium text-slate-600">opcionales</strong>. En Yape o Plin sí se pide celular y
                nombre.
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Método *</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                >
                  <option value="yape">Yape</option>
                  <option value="plin">Plin</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Celular
                  {metodo === 'transferencia' ? (
                    <span className="font-normal text-slate-500"> (opcional si es transferencia)</span>
                  ) : (
                    ' *'
                  )}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  placeholder={
                    metodo === 'transferencia'
                      ? 'Opcional'
                      : 'Número asociado a Yape o Plin'
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre que debe figurar
                  {metodo === 'transferencia' ? (
                    <span className="font-normal text-slate-500"> (opcional si es transferencia)</span>
                  ) : (
                    ' *'
                  )}
                </label>
                <input
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5"
                  value={nombreEnMetodo}
                  onChange={(e) => setNombreEnMetodo(e.target.value)}
                />
              </div>
              {metodo === 'transferencia' && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de cuenta o CCI</label>
                  <textarea
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm"
                    value={numeroCuenta}
                    onChange={(e) => setNumeroCuenta(e.target.value)}
                    placeholder="Cuenta bancaria o CCI"
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-medium px-8 py-3 shadow-lg shadow-sky-500/25 disabled:opacity-50"
          >
            {enviando ? 'Enviando…' : 'Enviar solicitud'}
          </button>
        </form>
      </div>

      <div className="rounded-3xl bg-white border border-slate-100 shadow-lg p-8 md:p-10">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Mis solicitudes de reintegro</h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Cargando…</p>
        ) : lista.length === 0 ? (
          <p className="text-slate-500 text-sm">Aún no hay solicitudes.</p>
        ) : (
          <ul className="space-y-3">
            {lista.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800">{r.codigo_ticket}</p>
                  <p className="text-xs text-slate-500">
                    Registro: {r.fecha_registro_ticket ? formatoFechaHoraDMY(r.fecha_registro_ticket) : '—'}
                  </p>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{r.concepto}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Fecha gasto: {formatoFechaDMY(r.fecha_solicitud_usuario)} · Monto: S/{' '}
                    {Number(r.monto || 0).toFixed(2)} · {metodoLabel(r.metodo_reembolso)}
                  </p>
                  <details className="mt-2 text-xs text-slate-600">
                    <summary className="cursor-pointer text-sky-600 font-medium select-none">Ver todos los datos</summary>
                    <dl className="mt-2 grid gap-1.5 sm:grid-cols-2 border border-slate-100 rounded-xl p-3 bg-slate-50/80">
                      <dt className="text-slate-500">Nombre (cuenta)</dt>
                      <dd className="text-slate-800">{r.nombre_completo || '—'}</dd>
                      <dt className="text-slate-500">DNI</dt>
                      <dd className="font-mono">{r.dni || '—'}</dd>
                      <dt className="text-slate-500">Comprobante</dt>
                      <dd>{r.tiene_comprobante ? 'Sí (archivo adjunto)' : 'No (recibo Prayaga)'}</dd>
                      {r.tiene_comprobante && (
                        <>
                          <dt className="text-slate-500">RUC</dt>
                          <dd className="font-mono break-all">{String(r.ruc_proveedor || '').trim() || '—'}</dd>
                          <dt className="text-slate-500">N° documento</dt>
                          <dd className="font-mono break-all">{String(r.numero_documento || '').trim() || '—'}</dd>
                          <dt className="text-slate-500">Archivo</dt>
                          <dd className="break-all">{r.archivo_comprobante_nombre || '—'}</dd>
                        </>
                      )}
                      <dt className="text-slate-500">Celular</dt>
                      <dd className="font-mono">{r.celular || '—'}</dd>
                      <dt className="text-slate-500">Nombre en método</dt>
                      <dd>{r.nombre_en_metodo || '—'}</dd>
                      {r.metodo_reembolso === 'transferencia' && (
                        <>
                          <dt className="text-slate-500">Cuenta / CCI</dt>
                          <dd className="break-all whitespace-pre-wrap">{r.numero_cuenta || '—'}</dd>
                        </>
                      )}
                    </dl>
                  </details>
                  {r.comentarios_resolucion &&
                    ['aprobado', 'rechazado', 'observado'].includes(r.estado) && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100">
                        <span className="font-medium text-slate-700">Observaciones: </span>
                        {r.comentarios_resolucion}
                      </p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${estadoBadge(r.estado)}`}>
                    {estadoLabel(r.estado)}
                  </span>
                  {!r.tiene_comprobante && (
                    <button
                      type="button"
                      onClick={() => bajarRecibo(r.id, r.codigo_ticket)}
                      className="text-xs font-medium text-sky-600 hover:underline"
                    >
                      PDF recibo
                    </button>
                  )}
                  {r.tiene_comprobante && (
                    <button
                      type="button"
                      onClick={() => bajarComprobante(r.id, r.codigo_ticket)}
                      className="text-xs font-medium text-sky-600 hover:underline"
                    >
                      Comprobante
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Reembolsos;
