import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  SparklesIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { asistenteIaService } from '../services/api';

/**
 * Burbuja flotante con chat al asistente IA.
 * - Solo se renderiza para usuarios con rol "admin" autenticados.
 * - Mantiene el historial en `localStorage` para sobrevivir refreshes.
 * - Envía cada mensaje al endpoint /api/asistente-ia/mensaje con el historial previo.
 */

const STORAGE_KEY = 'asistenteIa.historial';
const MAX_HISTORIAL_LOCAL = 40; // pares user/model

function renderTexto(texto) {
  /* Render simple de markdown ligero: **negritas**, saltos de línea y listas.
   * No usamos una lib externa para no inflar el bundle. */
  if (!texto) return null;
  const lineas = String(texto).split('\n');
  return lineas.map((linea, i) => {
    const partes = linea.split(/(\*\*[^*]+\*\*)/g).map((p, j) => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return (
          <strong key={j} className="font-semibold">
            {p.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={j}>{p}</React.Fragment>;
    });
    return (
      <React.Fragment key={i}>
        {partes}
        {i < lineas.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

const SUGERENCIAS = [
  '¿Cuántos días le quedan a Rocío Picón?',
  'Lista los permisos pendientes',
  'Muéstrame los períodos de vacaciones de Nicolás Valdivia',
  'Resumen de permisos médicos de este mes'
];

export default function AsistenteIaBubble() {
  const { esAdmin, isAuthenticated, usuario } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [texto, setTexto] = useState('');
  const [historial, setHistorial] = useState([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistorial(parsed.slice(-MAX_HISTORIAL_LOCAL * 2));
      }
    } catch (_) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historial.slice(-MAX_HISTORIAL_LOCAL * 2)));
    } catch (_) {
      /* ignore quota errors */
    }
  }, [historial]);

  useEffect(() => {
    if (abierto && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [abierto, historial, enviando]);

  useEffect(() => {
    if (abierto && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [abierto]);

  const enviar = useCallback(
    async (mensajeOverride) => {
      const mensaje = (mensajeOverride ?? texto).trim();
      if (!mensaje || enviando) return;

      setTexto('');
      const historialPrevio = historial;
      /* Optimismo: mostramos el mensaje del usuario al instante, y un placeholder
       * "pensando..." que reemplazaremos cuando llegue la respuesta. */
      setHistorial((prev) => [...prev, { role: 'user', parts: [{ text: mensaje }] }]);
      setEnviando(true);

      try {
        const res = await asistenteIaService.enviarMensaje(mensaje, historialPrevio);
        const nuevoHistorial = res.data?.data?.historial;
        if (Array.isArray(nuevoHistorial) && nuevoHistorial.length) {
          setHistorial(nuevoHistorial);
        } else if (res.data?.data?.respuesta) {
          setHistorial((prev) => [
            ...prev,
            { role: 'model', parts: [{ text: res.data.data.respuesta }] }
          ]);
        }
      } catch (err) {
        const msg = err.response?.data?.mensaje || 'No pude enviar el mensaje. Intentá de nuevo.';
        toast.error(msg);
        setHistorial((prev) => [
          ...prev,
          {
            role: 'model',
            parts: [{ text: `_${msg}_` }]
          }
        ]);
      } finally {
        setEnviando(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    },
    [texto, enviando, historial]
  );

  const limpiarConversacion = () => {
    if (!window.confirm('¿Borrar toda la conversación? Esta acción no se puede deshacer.')) return;
    setHistorial([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
  };

  if (!isAuthenticated || !esAdmin()) return null;

  return (
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir asistente IA"
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-2 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 px-4 py-3 text-white shadow-lg shadow-teal-500/30 hover:scale-105 hover:shadow-xl transition-all"
        >
          <SparklesIcon className="w-6 h-6" />
          <span className="hidden md:inline font-medium text-sm pr-1">Asistente IA</span>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
          </span>
        </button>
      )}

      {abierto && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(620px,calc(100vh-3rem))] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm leading-tight truncate">Asistente Prayaga</div>
                <div className="text-[11px] opacity-80 leading-tight">
                  Solo consultas · admin
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {historial.length > 0 && (
                <button
                  type="button"
                  onClick={limpiarConversacion}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Borrar conversación"
                  title="Borrar conversación"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Cerrar"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50 space-y-3">
            {historial.length === 0 && (
              <div className="text-center py-6">
                <div className="inline-flex w-14 h-14 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 items-center justify-center mb-3">
                  <SparklesIcon className="w-7 h-7 text-teal-600" />
                </div>
                <h3 className="text-slate-800 font-semibold text-sm mb-1">
                  ¡Hola{usuario?.nombres ? `, ${usuario.nombres.split(' ')[0]}` : ''}!
                </h3>
                <p className="text-slate-500 text-xs mb-4 px-4">
                  Puedo ayudarte a consultar vacaciones, permisos y datos de empleados.
                  Pediré confirmación antes de cualquier cambio futuro.
                </p>
                <div className="space-y-2 px-2">
                  {SUGERENCIAS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => enviar(s)}
                      disabled={enviando}
                      className="block w-full text-left text-xs text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 hover:border-teal-400 hover:bg-teal-50 transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {historial.map((m, i) => {
              const esUsuario = m.role === 'user';
              const contenido = m.parts?.[0]?.text || '';
              return (
                <div
                  key={i}
                  className={`flex ${esUsuario ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      esUsuario
                        ? 'bg-teal-600 text-white rounded-br-sm'
                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {renderTexto(contenido)}
                  </div>
                </div>
              );
            })}

            {enviando && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3.5 py-2 shadow-sm flex items-center gap-2 text-slate-500 text-sm">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Pensando...</span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
            className="p-3 border-t border-slate-200 bg-white"
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                placeholder="Escribí tu consulta..."
                rows={1}
                disabled={enviando}
                className="flex-1 resize-none rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 max-h-32 overflow-y-auto disabled:bg-slate-50"
                style={{ minHeight: 38 }}
              />
              <button
                type="submit"
                disabled={enviando || !texto.trim()}
                aria-label="Enviar"
                className="rounded-full w-10 h-10 flex items-center justify-center bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              Las respuestas pueden no ser perfectas. Verificá información sensible.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
