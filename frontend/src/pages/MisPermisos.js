import React, { useState, useEffect, useRef } from 'react';
import { permisoService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import {
  ClipboardDocumentCheckIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  CalendarDaysIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const MisPermisos = () => {
  const { usuario } = useAuth();
  const [permisos, setPermisos] = useState([]);
  const [resumen, setResumen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  
  // Formulario
  const [formData, setFormData] = useState({
    tipo: 'descanso_medico',
    fecha_inicio: '',
    fecha_fin: '',
    motivo: '',
    observaciones: '',
    documento: null
  });
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, [filtroTipo, filtroEstado]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const filtros = {};
      if (filtroTipo) filtros.tipo = filtroTipo;
      if (filtroEstado) filtros.estado = filtroEstado;
      
      const [permisosRes, resumenRes] = await Promise.all([
        permisoService.misPermisos(filtros),
        permisoService.miResumen()
      ]);
      
      setPermisos(permisosRes.data.data);
      setResumen(resumenRes.data.data);
    } catch (error) {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = async () => {
    if (!formData.tipo || !formData.fecha_inicio || !formData.fecha_fin || !formData.motivo) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    if (formData.tipo === 'descanso_medico' && !formData.documento) {
      toast.error('El documento médico es obligatorio para descansos médicos');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('tipo', formData.tipo);
      data.append('fecha_inicio', formData.fecha_inicio);
      data.append('fecha_fin', formData.fecha_fin);
      data.append('motivo', formData.motivo);
      if (formData.observaciones) data.append('observaciones', formData.observaciones);
      if (formData.documento) data.append('documento', formData.documento);

      await permisoService.crear(data);
      toast.success(formData.tipo === 'descanso_medico' 
        ? 'Descanso médico registrado correctamente' 
        : 'Solicitud de permiso creada correctamente');
      setShowModal(false);
      resetForm();
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al crear el registro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro?')) return;
    
    try {
      await permisoService.eliminar(id);
      toast.success('Registro eliminado');
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al eliminar');
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
      toast.error('Error al descargar el documento');
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: 'descanso_medico',
      fecha_inicio: '',
      fecha_fin: '',
      motivo: '',
      observaciones: '',
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

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'aprobado':
        return <CheckCircleIcon className="w-4 h-4 text-emerald-500" />;
      case 'rechazado':
        return <XCircleIcon className="w-4 h-4 text-rose-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-amber-500" />;
    }
  };

  const getEstadoLabel = (estado) => {
    const estados = {
      'pendiente': 'Pendiente',
      'aprobado': 'Aprobado',
      'rechazado': 'Rechazado'
    };
    return estados[estado] || estado;
  };

  const getEstadoColor = (estado) => {
    const colores = {
      'pendiente': 'bg-amber-100 text-amber-700',
      'aprobado': 'bg-emerald-100 text-emerald-700',
      'rechazado': 'bg-rose-100 text-rose-700'
    };
    return colores[estado] || 'bg-slate-100 text-slate-700';
  };

  // Calcular totales del resumen
  const totalDescansos = resumen.find(r => r.tipo === 'descanso_medico')?.dias_aprobados || 0;
  const totalPermisos = resumen.filter(r => r.tipo !== 'descanso_medico')
    .reduce((acc, r) => acc + (r.dias_aprobados || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-7 h-7 text-amber-500" />
            Mis Permisos y Descansos
          </h1>
          <p className="text-slate-500 mt-1">
            Registra tus descansos médicos y solicita permisos
          </p>
        </div>
        <Button icon={PlusIcon} onClick={() => setShowModal(true)}>
          Nuevo Registro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
              <DocumentTextIcon className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalDescansos}</p>
              <p className="text-sm text-slate-500">Días Descanso Médico</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <CalendarDaysIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalPermisos}</p>
              <p className="text-sm text-slate-500">Días Permisos</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
                {permisos.filter(p => p.estado === 'pendiente').length}
              </p>
              <p className="text-sm text-slate-500">Pendientes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <FunnelIcon className="w-5 h-5 text-slate-400" />
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm"
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
          className="px-4 py-2 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="rechazado">Rechazado</option>
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
        </div>
      ) : permisos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <ClipboardDocumentCheckIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No hay registros</h2>
          <p className="text-slate-500 mb-4">Aún no has registrado permisos ni descansos</p>
          <Button icon={PlusIcon} onClick={() => setShowModal(true)}>
            Crear primer registro
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {permisos.map((permiso) => (
            <div
              key={permiso.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getTipoColor(permiso.tipo)}`}>
                      {getTipoLabel(permiso.tipo)}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${getEstadoColor(permiso.estado)}`}>
                      {getEstadoIcon(permiso.estado)}
                      {getEstadoLabel(permiso.estado)}
                    </span>
                  </div>
                  
                  <p className="text-slate-800 font-medium mb-1">{permiso.motivo}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <CalendarDaysIcon className="w-4 h-4" />
                      {format(parseISO(permiso.fecha_inicio), 'dd/MM/yyyy')} - {format(parseISO(permiso.fecha_fin), 'dd/MM/yyyy')}
                    </span>
                    <span className="font-medium text-amber-600">
                      {permiso.dias_totales} día(s)
                    </span>
                  </div>
                  
                  {permiso.observaciones && (
                    <p className="text-sm text-slate-400 mt-2">{permiso.observaciones}</p>
                  )}
                  
                  {permiso.comentarios_aprobacion && (
                    <p className="text-sm text-slate-500 mt-2 italic">
                      "{permiso.comentarios_aprobacion}"
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {permiso.archivo_path && (
                    <button
                      onClick={() => handleDescargar(permiso)}
                      className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Descargar documento"
                    >
                      <DocumentArrowDownIcon className="w-5 h-5" />
                    </button>
                  )}
                  {permiso.estado === 'pendiente' && (
                    <button
                      onClick={() => handleEliminar(permiso.id)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-slate-800">
                Nuevo Registro
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Registro *
                </label>
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
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fecha Fin *
                  </label>
                  <input
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    min={formData.fecha_inicio}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Motivo *
                </label>
                <textarea
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  rows={3}
                  placeholder="Describa el motivo..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  rows={2}
                  placeholder="Información adicional..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none"
                />
              </div>

              {/* Documento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Documento {formData.tipo === 'descanso_medico' ? '*' : '(opcional)'}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setFormData({ ...formData, documento: e.target.files[0] })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-amber-50 file:text-amber-700 file:font-medium hover:file:bg-amber-100"
                />
                <p className="text-xs text-slate-400 mt-1">
                  PDF, imágenes o documentos Word (máx. 10MB)
                </p>
              </div>

              {formData.tipo === 'descanso_medico' && (
                <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                  <p className="text-sm text-rose-800">
                    <span className="font-semibold">Importante:</span> Para descansos médicos es obligatorio adjuntar el certificado o documento médico.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
              <Button
                variant="secondary"
                onClick={() => { setShowModal(false); resetForm(); }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCrear}
                loading={submitting}
                icon={PlusIcon}
              >
                Registrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MisPermisos;
