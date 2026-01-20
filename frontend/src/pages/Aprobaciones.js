import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { solicitudService } from '../services/api';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import {
  CheckBadgeIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const Aprobaciones = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      const res = await solicitudService.listarPendientes();
      setSolicitudes(res.data.data);
    } catch (error) {
      toast.error('Error al cargar solicitudes pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (id) => {
    try {
      setActionLoading(id);
      await solicitudService.aprobar(id);
      toast.success('Solicitud aprobada');
      cargarSolicitudes();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al aprobar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRechazar = async (id) => {
    const comentarios = prompt('Indica el motivo del rechazo:');
    if (!comentarios) return;
    
    try {
      setActionLoading(id);
      await solicitudService.rechazar(id, comentarios);
      toast.success('Solicitud rechazada');
      cargarSolicitudes();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al rechazar');
    } finally {
      setActionLoading(null);
    }
  };

  const getEstadoColor = (estado) => {
    if (estado === 'pendiente_jefe') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (estado === 'pendiente_contadora') return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getEstadoTexto = (estado) => {
    if (estado === 'pendiente_jefe') return 'Pendiente de Aprobación';
    if (estado === 'pendiente_contadora') return 'Pendiente de Aprobación';
    return estado;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CheckBadgeIcon className="w-7 h-7 text-teal-500" />
          Aprobaciones Pendientes
        </h1>
        <p className="text-slate-500 mt-1">
          Revisa y gestiona las solicitudes de vacaciones pendientes de aprobación
        </p>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <CheckBadgeIcon className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">¡Todo al día!</h2>
          <p className="text-slate-500">No hay solicitudes pendientes de aprobación</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {solicitudes.map((solicitud) => (
            <div
              key={solicitud.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                      {solicitud.nombres?.charAt(0)}{solicitud.apellidos?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">
                        {solicitud.nombres} {solicitud.apellidos}
                      </p>
                      <p className="text-sm text-slate-500">{solicitud.cargo}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-slate-500">Fechas</p>
                      <p className="text-sm font-medium text-slate-700">
                        {format(parseISO(solicitud.fecha_inicio_vacaciones), "d MMM", { locale: es })} - {format(parseISO(solicitud.fecha_fin_vacaciones), "d MMM", { locale: es })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Días</p>
                      <p className="text-sm font-medium text-slate-700">{solicitud.dias_solicitados}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Período</p>
                      <p className="text-sm font-medium text-slate-700">
                        {format(parseISO(solicitud.fecha_inicio_periodo), "yyyy", { locale: es })} - {format(parseISO(solicitud.fecha_fin_periodo), "yyyy", { locale: es })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Estado</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${getEstadoColor(solicitud.estado)}`}>
                        {getEstadoTexto(solicitud.estado)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/solicitudes/${solicitud.id}`}>
                    <Button variant="ghost" size="sm" icon={EyeIcon}>
                      Ver
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={XMarkIcon}
                    onClick={() => handleRechazar(solicitud.id)}
                    loading={actionLoading === solicitud.id}
                  >
                    Rechazar
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    icon={CheckIcon}
                    onClick={() => handleAprobar(solicitud.id)}
                    loading={actionLoading === solicitud.id}
                  >
                    Aprobar
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Aprobaciones;


