import React, { useState, useEffect } from 'react';
import { periodoService } from '../services/api';
import toast from 'react-hot-toast';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const VacacionesGanadas = () => {
  const [periodos, setPeriodos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Obtener todos los períodos
      const resPeriodos = await periodoService.misPeriodos();
      setPeriodos(resPeriodos.data.data);

      // Obtener resumen
      const resResumen = await periodoService.miResumen();
      setResumen(resResumen.data.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar las vacaciones ganadas');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'gozadas':
        return 'text-green-600 bg-green-50';
      case 'parcial':
        return 'text-yellow-600 bg-yellow-50';
      case 'pendiente':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'gozadas':
        return 'Gozadas';
      case 'parcial':
        return 'Parcial';
      case 'pendiente':
        return 'Pendiente';
      default:
        return estado;
    }
  };

  // Calcular días entre fecha inicio y fecha fin del período
  const calcularDiasPeriodo = (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) return '-';
    try {
      const inicio = parseISO(fechaInicio);
      const fin = parseISO(fechaFin);
      return differenceInDays(fin, inicio);
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CalendarDaysIcon className="w-7 h-7 text-teal-500" />
          Vacaciones Ganadas
        </h1>
        <p className="text-slate-500 mt-1">Todos tus períodos de vacaciones acumulados</p>
      </div>

      {/* KPIs */}
      {resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Ganados</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{resumen.total_ganados || 0}</p>
                <p className="text-xs text-blue-500 mt-1">{periodos.length} períodos</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                <CalendarDaysIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Gozados</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{resumen.total_gozados || 0}</p>
                <p className="text-xs text-green-500 mt-1">Vacaciones tomadas</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Días Pendientes</p>
                <p className="text-3xl font-bold text-purple-700 mt-1">{resumen.total_pendientes || 0}</p>
                <p className="text-xs text-purple-500 mt-1">Disponibles para usar</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabla de Períodos */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Motivo</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Fecha Inicio</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Fecha Final</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Días</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Tiempo Trabajado</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Vacaciones</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periodos.map((periodo, index) => {
                  const estadoColor = getEstadoColor(periodo.estado);
                  
                  return (
                    <tr key={periodo.id} className={`hover:bg-slate-50 transition-colors ${
                      periodo.estado === 'gozadas' ? 'bg-green-50/30' : 
                      periodo.estado === 'pendiente' ? 'bg-blue-50/20' : ''
                    }`}>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${estadoColor}`}>
                          {getEstadoTexto(periodo.estado)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600">
                        {periodo.fecha_inicio_periodo 
                          ? format(parseISO(periodo.fecha_inicio_periodo), "dd/MM/yyyy", { locale: es })
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600">
                        {periodo.fecha_fin_periodo 
                          ? format(parseISO(periodo.fecha_fin_periodo), "dd/MM/yyyy", { locale: es })
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-slate-700">
                          {calcularDiasPeriodo(periodo.fecha_inicio_periodo, periodo.fecha_fin_periodo)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600">
                        {periodo.tiempo_trabajado || '12 meses'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-teal-600">
                          {periodo.dias_correspondientes || 30}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">
                          {periodo.observaciones || `Periodo ${index + 1}`}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td className="px-6 py-4" colSpan="5"></td>
                  <td className="px-6 py-4 text-center text-lg text-slate-800">
                    {periodos.reduce((sum, p) => sum + (p.dias_correspondientes || 30), 0)}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {periodos.length === 0 && (
            <div className="text-center py-12">
              <CalendarDaysIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No tienes períodos de vacaciones registrados</p>
            </div>
          )}
        </div>
      )}

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          <strong>Nota:</strong> Esta tabla muestra todos los períodos de vacaciones que has ganado a lo largo de tu tiempo en la empresa. 
          Los días mostrados son los que te corresponden por ley (generalmente 30 días por año trabajado).
        </p>
      </div>
    </div>
  );
};

export default VacacionesGanadas;
