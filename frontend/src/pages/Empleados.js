import React, { useState, useEffect } from 'react';
import { empleadoService, periodoService } from '../services/api';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import {
  UsersIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  XMarkIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { format, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const Empleados = () => {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState(null);
  const [showVacacionesModal, setShowVacacionesModal] = useState(false);
  const [empleadoVacaciones, setEmpleadoVacaciones] = useState(null);
  const [periodosVacaciones, setPeriodosVacaciones] = useState([]);
  const [loadingVacaciones, setLoadingVacaciones] = useState(false);
  const [formData, setFormData] = useState({
    codigo_empleado: '',
    nombres: '',
    apellidos: '',
    dni: '',
    email: '',
    password: '',
    cargo: '',
    fecha_ingreso: '',
    rol_id: '4',
    jefe_id: ''
  });

  const roles = [
    { id: 1, nombre: 'admin', label: 'Administrador' },
    { id: 2, nombre: 'contadora', label: 'Contadora' },
    { id: 3, nombre: 'jefe_operaciones', label: 'Jefe de Operaciones' },
    { id: 4, nombre: 'empleado', label: 'Empleado' },
    { id: 5, nombre: 'practicante', label: 'Practicante' }
  ];

  useEffect(() => {
    cargarEmpleados();
  }, [busqueda]);

  const cargarEmpleados = async () => {
    try {
      setLoading(true);
      const res = await empleadoService.listar({ busqueda, activo: true });
      setEmpleados(res.data.data);
    } catch (error) {
      toast.error('Error al cargar empleados');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editando) {
        await empleadoService.actualizar(editando.id, formData);
        toast.success('Empleado actualizado');
      } else {
        await empleadoService.crear(formData);
        toast.success('Empleado creado');
      }
      setShowModal(false);
      setEditando(null);
      resetForm();
      cargarEmpleados();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al guardar');
    }
  };

  const handleEditar = (empleado) => {
    setEditando(empleado);
    setFormData({
      codigo_empleado: empleado.codigo_empleado,
      nombres: empleado.nombres,
      apellidos: empleado.apellidos,
      dni: empleado.dni,
      email: empleado.email,
      password: '',
      cargo: empleado.cargo || '',
      fecha_ingreso: empleado.fecha_ingreso?.split('T')[0] || '',
      rol_id: empleado.rol_id?.toString() || '4',
      jefe_id: empleado.jefe_id?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDesactivar = async (id) => {
    if (!window.confirm('¿Estás seguro de desactivar este empleado?')) return;
    
    try {
      await empleadoService.desactivar(id);
      toast.success('Empleado desactivado');
      cargarEmpleados();
    } catch (error) {
      toast.error('Error al desactivar');
    }
  };

  const resetForm = () => {
    setFormData({
      codigo_empleado: '',
      nombres: '',
      apellidos: '',
      dni: '',
      email: '',
      password: '',
      cargo: '',
      fecha_ingreso: '',
      rol_id: '4',
      jefe_id: ''
    });
  };

  const jefes = empleados.filter(e => e.rol_nombre === 'jefe_operaciones' || e.rol_nombre === 'admin');

  const handleVerVacaciones = async (empleado) => {
    setEmpleadoVacaciones(empleado);
    setShowVacacionesModal(true);
    setLoadingVacaciones(true);
    
    try {
      const res = await periodoService.porEmpleado(empleado.id);
      setPeriodosVacaciones(res.data.data || []);
    } catch (error) {
      toast.error('Error al cargar vacaciones');
      setPeriodosVacaciones([]);
    } finally {
      setLoadingVacaciones(false);
    }
  };

  const calcularTotales = () => {
    const totalGanados = periodosVacaciones.reduce((sum, p) => sum + (p.dias_correspondientes || 0), 0);
    const totalGozados = periodosVacaciones.reduce((sum, p) => sum + (p.dias_gozados || 0), 0);
    const totalPendientes = totalGanados - totalGozados;
    return { totalGanados, totalGozados, totalPendientes };
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-teal-500" />
            Gestión de Empleados
          </h1>
          <p className="text-slate-500 mt-1">Administra los empleados del sistema</p>
        </div>
        <Button 
          icon={PlusIcon}
          onClick={() => { resetForm(); setEditando(null); setShowModal(true); }}
        >
          Nuevo Empleado
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, DNI o código..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
        />
      </div>

      {/* Lista */}
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">DNI</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Cargo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Rol</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Fecha Ingreso</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empleados.map((empleado) => (
                  <tr key={empleado.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                          {empleado.nombres?.charAt(0)}{empleado.apellidos?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{empleado.nombres} {empleado.apellidos}</p>
                          <p className="text-sm text-slate-500">{empleado.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{empleado.dni}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{empleado.cargo}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                        {empleado.rol_nombre?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {empleado.fecha_ingreso && format(parseISO(empleado.fecha_ingreso), "d MMM yyyy", { locale: es })}
                    </td>
<td className="px-6 py-4">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => handleVerVacaciones(empleado)}
                                          className="p-2 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                          title="Ver vacaciones"
                                        >
                                          <CalendarDaysIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                          onClick={() => handleEditar(empleado)}
                                          className="p-2 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                                          title="Editar empleado"
                                        >
                                          <PencilIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                          onClick={() => handleDesactivar(empleado.id)}
                                          className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                          title="Desactivar empleado"
                                        >
                                          <XMarkIcon className="w-5 h-5" />
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg my-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">
                {editando ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h3>
              <button
                onClick={() => { setShowModal(false); setEditando(null); }}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
                  <input
                    type="text"
                    name="codigo_empleado"
                    value={formData.codigo_empleado}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
                  <input
                    type="text"
                    name="dni"
                    value={formData.dni}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombres</label>
                  <input
                    type="text"
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Apellidos</label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                />
              </div>

              {!editando && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!editando}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                  <input
                    type="text"
                    name="cargo"
                    value={formData.cargo}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Ingreso</label>
                  <input
                    type="date"
                    name="fecha_ingreso"
                    value={formData.fecha_ingreso}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                  <select
                    name="rol_id"
                    value={formData.rol_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  >
                    {roles.map(rol => (
                      <option key={rol.id} value={rol.id}>{rol.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jefe Directo</label>
                  <select
                    name="jefe_id"
                    value={formData.jefe_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                  >
                    <option value="">Sin jefe asignado</option>
                    {jefes.map(jefe => (
                      <option key={jefe.id} value={jefe.id}>{jefe.nombres} {jefe.apellidos}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowModal(false); setEditando(null); }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editando ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vacaciones del Empleado */}
      {showVacacionesModal && empleadoVacaciones && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-4xl my-8 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-semibold">
                  {empleadoVacaciones.nombres?.charAt(0)}{empleadoVacaciones.apellidos?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    Vacaciones de {empleadoVacaciones.nombres} {empleadoVacaciones.apellidos}
                  </h3>
                  <p className="text-sm text-slate-500">{empleadoVacaciones.cargo} • {empleadoVacaciones.email}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowVacacionesModal(false); setEmpleadoVacaciones(null); setPeriodosVacaciones([]); }}
                className="p-2 rounded-lg hover:bg-slate-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {loadingVacaciones ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                {/* Resumen */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-xl border border-teal-100">
                    <p className="text-sm text-teal-600 font-medium">Total Ganados</p>
                    <p className="text-2xl font-bold text-teal-700">{calcularTotales().totalGanados}</p>
                    <p className="text-xs text-teal-500">{periodosVacaciones.length} períodos</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-100">
                    <p className="text-sm text-purple-600 font-medium">Total Gozados</p>
                    <p className="text-2xl font-bold text-purple-700">{calcularTotales().totalGozados}</p>
                    <p className="text-xs text-purple-500">Vacaciones tomadas</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl border border-emerald-100">
                    <p className="text-sm text-emerald-600 font-medium">Días Pendientes</p>
                    <p className="text-2xl font-bold text-emerald-700">{calcularTotales().totalPendientes}</p>
                    <p className="text-xs text-emerald-500">Disponibles para usar</p>
                  </div>
                </div>

                {/* Tabla de períodos */}
                {periodosVacaciones.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CalendarDaysIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No hay períodos de vacaciones registrados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Motivo</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha Inicio</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha Final</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Días Período</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Vacaciones</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Gozados</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Pendientes</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {periodosVacaciones.map((periodo) => (
                          <tr key={periodo.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                periodo.estado === 'completado' ? 'bg-green-100 text-green-700' :
                                periodo.estado === 'parcial' ? 'bg-amber-100 text-amber-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {periodo.estado === 'completado' ? 'Completado' :
                                 periodo.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {periodo.fecha_inicio_periodo && format(parseISO(periodo.fecha_inicio_periodo), "dd/MM/yyyy", { locale: es })}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {periodo.fecha_fin_periodo && format(parseISO(periodo.fecha_fin_periodo), "dd/MM/yyyy", { locale: es })}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-700">{calcularDiasPeriodo(periodo.fecha_inicio_periodo, periodo.fecha_fin_periodo)}</td>
                            <td className="px-4 py-3 text-center font-semibold text-teal-600">{periodo.dias_correspondientes}</td>
                            <td className="px-4 py-3 text-center font-semibold text-purple-600">{periodo.dias_gozados}</td>
                            <td className="px-4 py-3 text-center font-semibold text-emerald-600">{periodo.dias_pendientes}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{periodo.observaciones || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-semibold">
                          <td colSpan="3" className="px-4 py-3 text-right text-sm text-slate-600">TOTALES:</td>
                          <td className="px-4 py-3 text-center text-slate-500">-</td>
                          <td className="px-4 py-3 text-center text-teal-600">{calcularTotales().totalGanados}</td>
                          <td className="px-4 py-3 text-center text-purple-600">{calcularTotales().totalGozados}</td>
                          <td className="px-4 py-3 text-center text-emerald-600">{calcularTotales().totalPendientes}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => { setShowVacacionesModal(false); setEmpleadoVacaciones(null); setPeriodosVacaciones([]); }}
                  >
                    Cerrar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Empleados;


