import React, { useState, useEffect, useRef } from 'react';
import { permisoService, empleadoService } from '../services/api';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import {
  ClipboardDocumentCheckIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseFechaSegura } from '../utils/dateUtils';

const GestionPermisos = () => {
  const [permisos, setPermisos] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Filtros
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  
  // Modal de creación
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    empleado_id: '',
    tipo: 'descanso_medico',
    fecha_inicio: '',
    fecha_fin: '',
    motivo: '',
    observaciones: '',
    estado: 'aprobado',
    documento: null
  });
  
  // Modal de rechazo
  const [showRechazoModal, setShowRechazoModal] = useState(false);
  const [permisoRechazar, setPermisoRechazar] = useState(null);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    cargarPermisos();
  }, [filtroEmpleado, filtroTipo, filtroEstado]);

  const cargarDatos = async () => {
    try {
      const [empleadosRes, pendientesRes] = await Promise.all([
        empleadoService.listar({ activo: true }),
        permisoService.listarPendientes()
      ]);
      setEmpleados(empleadosRes.data.data);
      setPendientes(pendientesRes.data.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const cargarPermisos = async () => {
    try {
      setLoading(true);
      const filtros = {};
      if (filtroEmpleado) filtros.empleado_id = filtroEmpleado;
      if (filtroTipo) filtros.tipo = filtroTipo;
      if (filtroEstado) filtros.estado = filtroEstado;
      
      const res = await permisoService.listar(filtros);
      setPermisos(res.data.data);
    } catch (error) {
      toast.error('Error al cargar los permisos');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (id) => {
    try {
      setActionLoading(id);
      await permisoService.aprobar(id);
      toast.success('Permiso aprobado');
      cargarDatos();
      cargarPermisos();
    } catch (error) {
      toast.error('Error al aprobar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRechazar = async () => {
    if (!comentarioRechazo.trim()) {
      toast.error('Debe indicar el motivo del rechazo');
      return;
    }
    
    try {
      setActionLoading(permisoRechazar.id);
      await permisoService.rechazar(permisoRechazar.id, comentarioRechazo);
      toast.success('Permiso rechazado');
      setShowRechazoModal(false);
      setPermisoRechazar(null);
      setComentarioRechazo('');
      cargarDatos();
      cargarPermisos();
    } catch (error) {
      toast.error('Error al rechazar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCrear = async () => {
    if (!formData.empleado_id || !formData.tipo || !formData.fecha_inicio || !formData.fecha_fin || !formData.motivo) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('empleado_id', formData.empleado_id);
      data.append('tipo', formData.tipo);
      data.append('fecha_inicio', formData.fecha_inicio);
      data.append('fecha_fin', formData.fecha_fin);
      data.append('motivo', formData.motivo);
      data.append('estado', formData.estado);
      if (formData.observaciones) data.append('observaciones', formData.observaciones);
      if (formData.documento) data.append('documento', formData.documento);

      await permisoService.crearDesdeAdmin(data);
      toast.success('Registro creado correctamente');
      setShowModal(false);
      resetForm();
      cargarDatos();
      cargarPermisos();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al crear el registro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDescargar = async (permiso) => {
    try {
      const res = await permisoService.descargarDocumento(permiso.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', permiso.archivo_nombre);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Error al descargar');
    }
  };

  const resetForm = () => {
    setFormData({
      empleado_id: '',
      tipo: 'descanso_medico',
      fecha_inicio: '',
      fecha_fin: '',
      motivo: '',
      observaciones: '',
      estado: 'aprobado',
      documento: null
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      'descanso_medico': 'Descanso Médico',
      'permiso_personal': 'Permiso Personal',
      'permiso_sin_goce': 'Permiso Sin Goce',
      'otro': 'Otro'
    };
    return tipos[tipo] || tipo;
  };

  const getTipoColor = (tipo) => {
    const colores = {
      'descanso_medico': 'bg-rose-100 text-rose-700',
      'permiso_personal': 'bg-blue-100 text-blue-700',
      'permiso_sin_goce': 'bg-amber-100 text-amber-700',
      'otro': 'bg-slate-100 text-slate-700'
    };
    return colores[tipo] || 'bg-slate-100 text-slate-700';
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'pendiente': 'bg-amber-100 text-amber-700',
      'aprobado': 'bg-emerald-100 text-emerald-700',
      'rechazado': 'bg-rose-100 text-rose-700'
    };
    return colores[estado] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-7 h-7 text-amber-500" />
            Gestión de Permisos y Descansos
          </h1>
          <p className="text-slate-500 mt-1">
            Administra los permisos y descansos de los empleados
          </p>
        </div>
        <Button icon={PlusIcon} onClick={() => setShowModal(true)}>
          Registrar
        </Button>
      </div>

      {/* Pendientes de aprobación */}
      {pendientes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <ClockIcon className="w-5 h-5" />
            Pendientes de Aprobación ({pendientes.length})
          </h3>
          <div className="space-y-3">
            {pendientes.map((permiso) => (
              <div key={permiso.id} className="bg-white rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-800">
                      {permiso.empleado_nombres} {permiso.empleado_apellidos}
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTipoColor(permiso.tipo)}`}>
                      {getTipoLabel(permiso.tipo)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{permiso.motivo}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(parseFechaSegura(permiso.fecha_inicio), 'dd/MM/yyyy')} - {format(parseFechaSegura(permiso.fecha_fin), 'dd/MM/yyyy')} ({permiso.dias_totales} días)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {permiso.archivo_path && (
                    <button
                      onClick={() => handleDescargar(permiso)}
                      className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                      title="Ver documento"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    icon={XMarkIcon}
                    onClick={() => { setPermisoRechazar(permiso); setShowRechazoModal(true); }}
                    loading={actionLoading === permiso.id}
                  >
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    icon={CheckIcon}
                    onClick={() => handleAprobar(permiso.id)}
                    loading={actionLoading === permiso.id}
                    className="!bg-emerald-500 hover:!bg-emerald-600"
                  >
                    Aprobar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={filtroEmpleado}
            onChange={(e) => setFiltroEmpleado(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm"
          >
            <option value="">Todos los empleados</option>
            {empleados.map(e => (
              <option key={e.id} value={e.id}>{e.apellidos}, {e.nombres}</option>
            ))}
          </select>
          
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm"
          >
            <option value="">Todos los tipos</option>
            <option value="descanso_medico">Descanso Médico</option>
            <option value="permiso_personal">Permiso Personal</option>
            <option value="permiso_sin_goce">Permiso Sin Goce</option>
            <option value="otro">Otro</option>
          </select>
          
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
        </div>
      ) : permisos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <ClipboardDocumentCheckIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No hay registros</h2>
          <p className="text-slate-500">No se encontraron permisos con los filtros seleccionados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Empleado</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Tipo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Período</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Días</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Estado</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Doc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permisos.map((permiso) => (
                  <tr key={permiso.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-800">
                          {permiso.empleado_apellidos}, {permiso.empleado_nombres}
                        </p>
                        <p className="text-xs text-slate-500">{permiso.empleado_cargo}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getTipoColor(permiso.tipo)}`}>
                        {getTipoLabel(permiso.tipo)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {format(parseFechaSegura(permiso.fecha_inicio), 'dd/MM/yyyy')} - {format(parseFechaSegura(permiso.fecha_fin), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-slate-700">
                      {permiso.dias_totales}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${getEstadoColor(permiso.estado)}`}>
                        {permiso.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {permiso.archivo_path ? (
                        <button
                          onClick={() => handleDescargar(permiso)}
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <DocumentArrowDownIcon className="w-5 h-5" />
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Creación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-800">Registrar Permiso/Descanso</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-2 hover:bg-slate-100 rounded-lg">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Empleado */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Empleado *</label>
                <select
                  value={formData.empleado_id}
                  onChange={(e) => setFormData({ ...formData, empleado_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                >
                  <option value="">Seleccionar empleado</option>
                  {empleados.map(e => (
                    <option key={e.id} value={e.id}>{e.apellidos}, {e.nombres}</option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo *</label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                >
                  <option value="descanso_medico">🏥 Descanso Médico</option>
                  <option value="permiso_personal">📋 Permiso Personal</option>
                  <option value="permiso_sin_goce">📄 Permiso Sin Goce</option>
                  <option value="otro">📝 Otro</option>
                </select>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha Inicio *</label>
                  <input
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fecha Fin *</label>
                  <input
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Motivo *</label>
                <textarea
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none"
                />
              </div>

              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobado">Aprobado directamente</option>
                </select>
              </div>

              {/* Documento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Documento (opcional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setFormData({ ...formData, documento: e.target.files[0] })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-700"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
              <Button variant="secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleCrear} loading={submitting} icon={PlusIcon}>Registrar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rechazo */}
      {showRechazoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Rechazar Solicitud</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Está rechazando la solicitud de <strong>{permisoRechazar?.empleado_nombres} {permisoRechazar?.empleado_apellidos}</strong>
              </p>
              <label className="block text-sm font-medium text-slate-700 mb-2">Motivo del rechazo *</label>
              <textarea
                value={comentarioRechazo}
                onChange={(e) => setComentarioRechazo(e.target.value)}
                rows={3}
                placeholder="Indique el motivo..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
              <Button variant="secondary" onClick={() => { setShowRechazoModal(false); setComentarioRechazo(''); }}>Cancelar</Button>
              <Button variant="danger" onClick={handleRechazar} loading={actionLoading === permisoRechazar?.id}>Rechazar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionPermisos;
