import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { controlProyectosService } from '../services/api';

const AdminLocadoresBolsaHoras = () => {
  const [cargando, setCargando] = useState(true);
  const [filas, setFilas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [guardandoId, setGuardandoId] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await controlProyectosService.listarLocadoresBolsaHoras();
      setFilas(data.data || []);
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'No se pudo cargar la lista.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return filas;
    return filas.filter((r) => {
      const nombre = `${r.nombres || ''} ${r.apellidos || ''}`.toLowerCase();
      const mail = (r.email || '').toLowerCase();
      return nombre.includes(q) || mail.includes(q);
    });
  }, [filas, busqueda]);

  const toggleLocador = async (row) => {
    const nuevo = !Number(row.requiere_aprobacion_horas);
    setGuardandoId(row.id);
    try {
      const { data } = await controlProyectosService.actualizarLocadorBolsaHoras(row.id, nuevo);
      if (data.success) {
        setFilas((prev) => prev.map((f) => (f.id === row.id ? data.data : f)));
        toast.success(nuevo ? 'Marcado como locador.' : 'Ya no es locador.');
      } else {
        toast.error(data.mensaje || 'No se pudo guardar.');
      }
    } catch (e) {
      toast.error(e.response?.data?.mensaje || 'Error al guardar.');
    } finally {
      setGuardandoId(null);
    }
  };

  const totalLocadores = filas.filter((f) => Number(f.requiere_aprobacion_horas) === 1).length;

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        to="/control-proyectos"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 mb-8 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver a Bolsa de Horas
      </Link>

      <div className="rounded-3xl bg-white border border-slate-100 shadow-lg p-8 md:p-10">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Locadores — aprobación de horas</h1>
        <p className="text-sm text-slate-600 mb-2">
          Marca quién es <strong>locador</strong>: sus actividades nuevas (con aprobador activo en «Requerido por»)
          quedan <strong>pendientes</strong> hasta que el responsable apruebe por correo o desde la app.
        </p>
        <p className="text-xs text-slate-500 mb-6">
          También puedes gestionarlo en{' '}
          <Link to="/admin-portal/usuarios" className="text-indigo-600 hover:underline">
            Administración de usuarios
          </Link>{' '}
          → pestaña Cuenta. Locadores activos: <strong>{totalLocadores}</strong>
        </p>

        <div className="relative mb-4 max-w-md">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Buscar por nombre o correo…"
            className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {cargando ? (
          <p className="text-slate-500">Cargando…</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Persona</th>
                  <th className="px-4 py-3 font-medium text-center w-40">Es locador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((r) => {
                  const activo = Number(r.requiere_aprobacion_horas) === 1;
                  const busy = guardandoId === r.id;
                  return (
                    <tr key={r.id} className="text-slate-700">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {[r.nombres, r.apellidos].filter(Boolean).join(' ')}
                        </div>
                        <div className="text-xs text-slate-500">{r.email}</div>
                        {Number(r.es_consultor_cp) === 1 && (
                          <div className="text-[10px] text-indigo-600 mt-0.5">Consultor en proyectos</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={activo}
                            disabled={busy}
                            onChange={() => toggleLocador(r)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                          />
                          <span className="text-xs text-slate-600">{activo ? 'Sí' : 'No'}</span>
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtradas.length === 0 && (
              <p className="p-6 text-center text-slate-500 text-sm">Sin resultados.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLocadoresBolsaHoras;
