import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { solicitudService } from '../services/api';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  PlusIcon,
  FunnelIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const MisSolicitudes = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [eliminando, setEliminando] = useState(null);

  useEffect(() => {
    cargarSolicitudes();
  }, [filtroEstado]);

  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      const filtros = {};
      if (filtroEstado) filtros.estado = filtroEstado;
      const res = await solicitudService.listarMias(filtros);
      setSolicitudes(res.data.data);
    } catch (error) {
      toast.error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta solicitud? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setEliminando(id);
      await solicitudService.eliminar(id);
      toast.success('Solicitud eliminada correctamente');
      cargarSolicitudes();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al eliminar solicitud');
    } finally {
      setEliminando(null);
    }
  };

  const getEstadoColor = (estado) => {
    const colores = {
      borrador: 'bg-slate-100 text-slate-600 border-slate-200',
      pendiente_jefe: 'bg-amber-50 text-amber-700 border-amber-200',
      pendiente_contadora: 'bg-blue-50 text-blue-700 border-blue-200',
      aprobada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      rechazada: 'bg-rose-50 text-rose-700 border-rose-200',
      cancelada: 'bg-slate-50 text-slate-500 border-slate-200'
    };
    return colores[estado] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      borrador: 'Borrador',
      pendiente_jefe: 'Pendiente Jefe',
      pendiente_contadora: 'Pendiente Contadora',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
      cancelada: 'Cancelada'
    };
    return textos[estado] || estado;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mis Solicitudes</h1>
          <p className="text-slate-500 mt-1">Gestiona tus solicitudes de vacaciones</p>
        </div>
        <Link to="/nueva-solicitud">
          <Button icon={PlusIcon}>
            Nueva Solicitud
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <FunnelIcon className="w-5 h-5 text-slate-400" />
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="pendiente_jefe">Pendiente Jefe</option>
          <option value="pendiente_contadora">Pendiente Contadora</option>
          <option value="aprobada">Aprobada</option>
          <option value="rechazada">Rechazada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* Lista de solicitudes */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <DocumentTextIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No hay solicitudes</h2>
          <p className="text-slate-500 mb-4">
            {filtroEstado ? 'No hay solicitudes con ese estado' : 'Aún no has creado ninguna solicitud'}
          </p>
          <Link to="/nueva-solicitud">
            <Button icon={PlusIcon} size="sm">
              Crear Solicitud
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Fechas de Vacaciones
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Días
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {solicitudes.map((solicitud) => (
                  <tr key={solicitud.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">
                        {format(parseISO(solicitud.fecha_inicio_periodo), "yyyy", { locale: es })} - {format(parseISO(solicitud.fecha_fin_periodo), "yyyy", { locale: es })}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-700">
                        {format(parseISO(solicitud.fecha_inicio_vacaciones), "d 'de' MMM", { locale: es })} - {format(parseISO(solicitud.fecha_fin_vacaciones), "d 'de' MMM, yyyy", { locale: es })}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-lg font-semibold text-slate-700">
                        {solicitud.dias_solicitados}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getEstadoColor(solicitud.estado)}`}>
                        {getEstadoTexto(solicitud.estado)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/solicitudes/${solicitud.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                          Ver
                        </Link>
                        <button
                          onClick={() => handleEliminar(solicitud.id)}
                          disabled={eliminando === solicitud.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {eliminando === solicitud.id ? (
                            <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <TrashIcon className="w-4 h-4" />
                          )}
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisSolicitudes;


