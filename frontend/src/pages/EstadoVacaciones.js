import React, { useState, useEffect } from 'react';
import { empleadoService, periodoService } from '../services/api';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseFechaSegura } from '../utils/dateUtils';

const EstadoVacaciones = () => {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Obtener lista de empleados activos
      const resEmpleados = await empleadoService.listar({ activo: true });
      const listaEmpleados = resEmpleados.data.data;

      // Para cada empleado, obtener su resumen de vacaciones
      const empleadosConVacaciones = await Promise.all(
        listaEmpleados.map(async (empleado) => {
          try {
            const resResumen = await periodoService.resumenEmpleado(empleado.id);
            const resumenData = resResumen.data.data;
            return {
              ...empleado,
              vacaciones: {
                total_disponible: resumenData.total_ganados || 0,
                total_usado: resumenData.total_gozados || 0,
                total_pendiente: resumenData.total_pendientes || 0
              }
            };
          } catch (error) {
            console.error(`Error obteniendo vacaciones de ${empleado.nombres}:`, error);
            return {
              ...empleado,
              vacaciones: {
                total_disponible: 0,
                total_usado: 0,
                total_pendiente: 0
              }
            };
          }
        })
      );

      setEmpleados(empleadosConVacaciones);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar la información');
    } finally {
      setLoading(false);
    }
  };

  const empleadosFiltrados = empleados.filter(emp => {
    if (!busqueda) return true;
    const searchLower = busqueda.toLowerCase();
    return (
      emp.nombres?.toLowerCase().includes(searchLower) ||
      emp.apellidos?.toLowerCase().includes(searchLower) ||
      emp.dni?.toLowerCase().includes(searchLower) ||
      emp.codigo_empleado?.toLowerCase().includes(searchLower) ||
      emp.cargo?.toLowerCase().includes(searchLower)
    );
  });

  const calcularDiasRestantes = (vacaciones) => {
    const disponible = vacaciones.total_disponible || 0;
    const usado = vacaciones.total_usado || 0;
    const pendiente = vacaciones.total_pendiente || 0;
    return disponible - usado - pendiente;
  };

  const getEstadoUtilizacion = (usado, disponible) => {
    if (disponible === 0) return { texto: 'Sin días', color: 'text-slate-600 bg-slate-50' };
    const porcentaje = (usado / disponible) * 100;
    if (porcentaje === 0) return { texto: 'Sin usar', color: 'text-orange-600 bg-orange-50' };
    if (porcentaje < 50) return { texto: 'Bajo uso', color: 'text-blue-600 bg-blue-50' };
    if (porcentaje < 80) return { texto: 'Uso moderado', color: 'text-green-600 bg-green-50' };
    return { texto: 'Alto uso', color: 'text-purple-600 bg-purple-50' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ChartBarIcon className="w-7 h-7 text-teal-500" />
            Estado de Vacaciones
          </h1>
          <p className="text-slate-500 mt-1">Resumen de vacaciones de todos los empleados</p>
        </div>
        <button
          onClick={cargarDatos}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, DNI, código o cargo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
        />
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Empleados</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">{empleadosFiltrados.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-600 font-medium">Promedio Días Disponibles</p>
              <p className="text-3xl font-bold text-amber-700 mt-1">
                {empleadosFiltrados.length > 0
                  ? Math.round(
                      empleadosFiltrados.reduce((sum, emp) => {
                        const disponible = Number(emp.vacaciones?.total_disponible) || 0;
                        const usado = Number(emp.vacaciones?.total_usado) || 0;
                        const pendiente = Number(emp.vacaciones?.total_pendiente) || 0;
                        return sum + (disponible - usado - pendiente);
                      }, 0) / empleadosFiltrados.length
                    )
                  : 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
              <CalendarDaysIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Sin Vacaciones Tomadas</p>
              <p className="text-3xl font-bold text-orange-700 mt-1">
                {empleadosFiltrados.filter(emp => {
                  const ganado = Number(emp.vacaciones?.total_disponible) || 0;
                  const usado = Number(emp.vacaciones?.total_usado) || 0;
                  return ganado > 0 && usado === 0;
                }).length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Empleado</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Cargo</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Fecha Ingreso</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">
                    <div className="flex items-center justify-center gap-1">
                      <CalendarDaysIcon className="w-4 h-4" />
                      Ganado
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircleIcon className="w-4 h-4" />
                      Gozado
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">
                    <div className="flex items-center justify-center gap-1">
                      <ClockIcon className="w-4 h-4" />
                      Pendiente
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">
                    <div className="flex items-center justify-center gap-1">
                      <XCircleIcon className="w-4 h-4" />
                      Restante
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Utilización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empleadosFiltrados.map((empleado) => {
                  const diasRestantes = calcularDiasRestantes(empleado.vacaciones);
                  const disponible = Number(empleado.vacaciones.total_disponible) || 0;
                  const usado = Number(empleado.vacaciones.total_usado) || 0;
                  const estado = getEstadoUtilizacion(usado, disponible);
                  
                  return (
                    <tr key={empleado.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                            {empleado.nombres?.charAt(0)}{empleado.apellidos?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{empleado.nombres} {empleado.apellidos}</p>
                            <p className="text-xs text-slate-500">{empleado.codigo_empleado} • {empleado.dni}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600">{empleado.cargo || '-'}</p>
                        <p className="text-xs text-slate-400 capitalize">{empleado.rol_nombre?.replace('_', ' ')}</p>
                      </td>
                      <td className="px-6 py-4 text-center text-sm text-slate-600">
                        {empleado.fecha_ingreso 
                          ? format(parseFechaSegura(empleado.fecha_ingreso), "dd/MM/yyyy", { locale: es })
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-slate-700">
                          {disponible}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-semibold text-green-600">
                          {usado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-semibold text-yellow-600">
                          {Number(empleado.vacaciones.total_pendiente) || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-lg font-bold ${diasRestantes > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                          {diasRestantes}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${estado.color}`}>
                          {estado.texto}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {empleadosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <ChartBarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No se encontraron empleados</p>
            </div>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <p className="text-sm font-semibold text-slate-700 mb-3">Leyenda:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="w-4 h-4 text-slate-500" />
            <span><strong>Ganado:</strong> Total de días acumulados</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            <span><strong>Gozado:</strong> Días ya tomados</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-yellow-500" />
            <span><strong>Pendiente:</strong> Días en solicitudes pendientes</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircleIcon className="w-4 h-4 text-blue-500" />
            <span><strong>Restante:</strong> Días disponibles para solicitar</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstadoVacaciones;

