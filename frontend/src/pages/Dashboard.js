import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { periodoService, solicitudService } from '../services/api';
import { StatCard } from '../components/Card';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import {
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  DocumentTextIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const Dashboard = () => {
  const { usuario, puedeAprobar } = useAuth();
  const [resumen, setResumen] = useState({ total_ganados: 0, total_gozados: 0, total_pendientes: 0 });
  const [solicitudesRecientes, setSolicitudesRecientes] = useState([]);
  const [pendientesAprobacion, setPendientesAprobacion] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resumenRes, solicitudesRes] = await Promise.all([
        periodoService.miResumen(),
        solicitudService.listarMias()
      ]);

      setResumen(resumenRes.data.data);
      setSolicitudesRecientes(solicitudesRes.data.data.slice(0, 5));

      if (puedeAprobar()) {
        const pendientesRes = await solicitudService.listarPendientes();
        setPendientesAprobacion(pendientesRes.data.data);
      }
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    const colores = {
      borrador: 'bg-slate-100 text-slate-600',
      pendiente_jefe: 'bg-amber-100 text-amber-700',
      pendiente_contadora: 'bg-blue-100 text-blue-700',
      aprobada: 'bg-emerald-100 text-emerald-700',
      rechazada: 'bg-rose-100 text-rose-700',
      cancelada: 'bg-slate-100 text-slate-500'
    };
    return colores[estado] || 'bg-slate-100 text-slate-600';
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      borrador: 'Borrador',
      pendiente_jefe: 'Pendiente de Aprobación',
      pendiente_contadora: 'Pendiente de Aprobación',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada',
      cancelada: 'Cancelada'
    };
    return textos[estado] || estado;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            ¡Hola, {usuario?.nombres}! 👋
          </h1>
          <p className="text-slate-500 mt-1">
            Aquí tienes el resumen de tus vacaciones
          </p>
        </div>
        <Link to="/nueva-solicitud">
          <Button icon={PlusIcon}>
            Nueva Solicitud
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={CalendarDaysIcon}
          label="Días Ganados"
          value={resumen.total_ganados || 0}
          color="blue"
        />
        <StatCard
          icon={CheckCircleIcon}
          label="Días Gozados"
          value={resumen.total_gozados || 0}
          color="emerald"
        />
        <StatCard
          icon={ClockIcon}
          label="Días Pendientes"
          value={resumen.total_pendientes || 0}
          color="amber"
        />
      </div>

      {/* Grid de contenido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Solicitudes Recientes */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-teal-500" />
              Mis Solicitudes Recientes
            </h2>
            <Link to="/mis-solicitudes" className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
              Ver todas <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          
          {solicitudesRecientes.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No tienes solicitudes aún</p>
              <Link to="/nueva-solicitud" className="text-teal-600 text-sm font-medium hover:underline">
                Crear primera solicitud
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {solicitudesRecientes.map((solicitud) => (
                <Link
                  key={solicitud.id}
                  to={`/solicitudes/${solicitud.id}`}
                  className="block p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-700">
                        {format(new Date(solicitud.fecha_inicio_vacaciones), "d 'de' MMMM", { locale: es })} - {format(new Date(solicitud.fecha_fin_vacaciones), "d 'de' MMMM, yyyy", { locale: es })}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {solicitud.dias_solicitados} días
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(solicitud.estado)}`}>
                      {getEstadoTexto(solicitud.estado)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pendientes de Aprobación (solo para aprobadores) */}
        {puedeAprobar() && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5 text-amber-500" />
                Pendientes de Aprobación
                {pendientesAprobacion.length > 0 && (
                  <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {pendientesAprobacion.length}
                  </span>
                )}
              </h2>
              <Link to="/aprobaciones" className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                Ver todas <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {pendientesAprobacion.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No hay solicitudes pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendientesAprobacion.slice(0, 5).map((solicitud) => (
                  <Link
                    key={solicitud.id}
                    to={`/solicitudes/${solicitud.id}`}
                    className="block p-4 rounded-xl bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-700">
                          {solicitud.nombres} {solicitud.apellidos}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          {format(new Date(solicitud.fecha_inicio_vacaciones), "d MMM", { locale: es })} - {format(new Date(solicitud.fecha_fin_vacaciones), "d MMM", { locale: es })} • {solicitud.dias_solicitados} días
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(solicitud.estado)}`}>
                        {getEstadoTexto(solicitud.estado)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Si no es aprobador, mostrar acceso rápido */}
        {!puedeAprobar() && (
          <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-4">Acciones Rápidas</h2>
            <div className="space-y-3">
              <Link
                to="/nueva-solicitud"
                className="flex items-center gap-3 p-4 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
              >
                <PlusIcon className="w-6 h-6" />
                <div>
                  <p className="font-medium">Nueva Solicitud</p>
                  <p className="text-sm text-teal-100">Solicita tus vacaciones</p>
                </div>
              </Link>
              <Link
                to="/calendario"
                className="flex items-center gap-3 p-4 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
              >
                <CalendarDaysIcon className="w-6 h-6" />
                <div>
                  <p className="font-medium">Ver Calendario</p>
                  <p className="text-sm text-teal-100">Consulta las vacaciones del equipo</p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;


