import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { notificacionService } from '../services/api';
import { formatearFechaServidor } from '../utils/dateUtils';

function resolverEnlace(enlace) {
  if (!enlace) return null;
  if (enlace.startsWith('/vacaciones/') || enlace.startsWith('/portal')) return enlace;
  if (enlace.startsWith('/solicitudes/')) return `/vacaciones${enlace}`;
  if (enlace.startsWith('/')) return enlace;
  return `/${enlace}`;
}

const tipoEstilo = {
  info: 'bg-sky-50 border-sky-100 text-sky-800',
  success: 'bg-emerald-50 border-emerald-100 text-emerald-800',
  error: 'bg-rose-50 border-rose-100 text-rose-800',
  warning: 'bg-amber-50 border-amber-100 text-amber-800'
};

const NotificacionesDropdown = ({ className = '' }) => {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const [lista, setLista] = useState([]);
  const [totalNoLeidas, setTotalNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);

  const cargarContador = useCallback(async () => {
    try {
      const { data } = await notificacionService.contarNoLeidas();
      setTotalNoLeidas(data?.data?.total || 0);
    } catch {
      /* silencioso */
    }
  }, []);

  const cargarLista = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await notificacionService.listar(false);
      setLista(data?.data || []);
    } catch {
      setLista([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarContador();
    const interval = setInterval(cargarContador, 60000);
    return () => clearInterval(interval);
  }, [cargarContador]);

  useEffect(() => {
    if (!abierto) return undefined;
    cargarLista();
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [abierto, cargarLista]);

  const abrir = () => setAbierto((v) => !v);

  const marcarTodas = async () => {
    try {
      await notificacionService.marcarTodasLeidas();
      setTotalNoLeidas(0);
      setLista((prev) => prev.map((n) => ({ ...n, leida: 1 })));
    } catch {
      /* ignore */
    }
  };

  const abrirNotificacion = async (n) => {
    if (!n.leida) {
      try {
        await notificacionService.marcarLeida(n.id);
        setTotalNoLeidas((c) => Math.max(0, c - 1));
        setLista((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, leida: 1 } : item))
        );
      } catch {
        /* ignore */
      }
    }
    const destino = resolverEnlace(n.enlace);
    setAbierto(false);
    if (destino) navigate(destino);
  };

  const eliminar = async (e, id) => {
    e.stopPropagation();
    try {
      await notificacionService.eliminar(id);
      setLista((prev) => prev.filter((n) => n.id !== id));
      cargarContador();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={abrir}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors text-sm text-slate-700"
        aria-haspopup="menu"
        aria-expanded={abierto}
        title="Notificaciones y eventos"
      >
        <span className="relative">
          <BellIcon className="w-4 h-4 text-teal-600" />
          {totalNoLeidas > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {totalNoLeidas > 9 ? '9+' : totalNoLeidas}
            </span>
          )}
        </span>
        <span className="font-medium">Notificaciones</span>
      </button>

      {abierto && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[min(70vh,420px)] flex flex-col rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div>
              <p className="text-sm font-semibold text-slate-800">Notificaciones</p>
              <p className="text-[11px] text-slate-500">
                {totalNoLeidas > 0
                  ? `${totalNoLeidas} sin leer`
                  : 'Estás al día'}
              </p>
            </div>
            {totalNoLeidas > 0 && (
              <button
                type="button"
                onClick={marcarTodas}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {cargando ? (
              <p className="p-6 text-sm text-slate-500 text-center">Cargando…</p>
            ) : lista.length === 0 ? (
              <p className="p-6 text-sm text-slate-500 text-center">
                No tienes notificaciones por ahora.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lista.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => abrirNotificacion(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                        !n.leida ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm truncate ${
                              n.leida ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'
                            }`}
                          >
                            {n.titulo}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.mensaje}</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatearFechaServidor(n.created_at, 'dd/MM/yyyy HH:mm')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => eliminar(e, n.id)}
                          className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Eliminar"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                      {!n.leida && (
                        <span
                          className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full border ${
                            tipoEstilo[n.tipo] || tipoEstilo.info
                          }`}
                        >
                          Nuevo
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificacionesDropdown;
