import React, { useState, useEffect, useRef } from 'react';
import { boletaService, empleadoService } from '../services/api';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  TrashIcon,
  FunnelIcon,
  UserGroupIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatearFechaServidor } from '../utils/dateUtils';

const GestionBoletas = () => {
  const [boletas, setBoletas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [anios, setAnios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Filtros
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroFirmada, setFiltroFirmada] = useState('');
  
  // Modal de subida
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('individual'); // 'individual' o 'masivo'
  const [formData, setFormData] = useState({
    empleado_id: '',
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    archivo: null
  });
  const [archivos, setArchivos] = useState([]);
  
  const fileInputRef = useRef(null);
  const filesInputRef = useRef(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    cargarBoletas();
  }, [filtroAnio, filtroMes, filtroEmpleado, filtroFirmada]);

  const cargarDatos = async () => {
    try {
      const [empleadosRes, aniosRes] = await Promise.all([
        empleadoService.listar({ activo: true }),
        boletaService.obtenerAnios()
      ]);
      setEmpleados(empleadosRes.data.data);
      setAnios(aniosRes.data.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const cargarBoletas = async () => {
    try {
      setLoading(true);
      const filtros = {};
      if (filtroAnio) filtros.anio = filtroAnio;
      if (filtroMes) filtros.mes = filtroMes;
      if (filtroEmpleado) filtros.empleado_id = filtroEmpleado;
      if (filtroFirmada !== '') filtros.firmada = filtroFirmada;
      
      const res = await boletaService.listar(filtros);
      setBoletas(res.data.data);
    } catch (error) {
      toast.error('Error al cargar las boletas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubirIndividual = async () => {
    if (!formData.empleado_id || !formData.mes || !formData.anio || !formData.archivo) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    try {
      setUploading(true);
      const data = new FormData();
      data.append('empleado_id', formData.empleado_id);
      data.append('mes', formData.mes);
      data.append('anio', formData.anio);
      data.append('archivo', formData.archivo);

      await boletaService.subir(data);
      toast.success('Boleta subida correctamente');
      setShowModal(false);
      resetForm();
      cargarBoletas();
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al subir la boleta');
    } finally {
      setUploading(false);
    }
  };

  const handleSubirMasivo = async () => {
    if (!formData.mes || !formData.anio || archivos.length === 0) {
      toast.error('Selecciona mes, año y al menos un archivo');
      return;
    }

    try {
      setUploading(true);
      const data = new FormData();
      data.append('mes', formData.mes);
      data.append('anio', formData.anio);
      archivos.forEach(file => {
        data.append('archivos', file);
      });

      const res = await boletaService.subirMasivo(data);
      
      const { exitosos, errores } = res.data.data;
      
      if (exitosos.length > 0) {
        toast.success(`${exitosos.length} boletas subidas correctamente`);
      }
      if (errores.length > 0) {
        errores.forEach(e => toast.error(`${e.archivo}: ${e.error}`));
      }
      
      setShowModal(false);
      resetForm();
      cargarBoletas();
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error en la subida masiva');
    } finally {
      setUploading(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta boleta?')) return;
    
    try {
      await boletaService.eliminar(id);
      toast.success('Boleta eliminada');
      cargarBoletas();
    } catch (error) {
      toast.error('Error al eliminar la boleta');
    }
  };

  const handleDescargar = async (boleta) => {
    try {
      const res = await boletaService.descargar(boleta.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', boleta.archivo_nombre);
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
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      archivo: null
    });
    setArchivos([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (filesInputRef.current) filesInputRef.current.value = '';
  };

  const openModal = (mode) => {
    setModalMode(mode);
    setShowModal(true);
    resetForm();
  };

  const getNombreMes = (mes) => {
    const fecha = new Date(2024, mes - 1, 1);
    return format(fecha, 'MMMM', { locale: es });
  };

  const meses = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  const totalBoletas = boletas.length;
  const boletasFirmadas = boletas.filter(b => b.firmada).length;
  const boletasPendientes = boletas.filter(b => !b.firmada).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DocumentTextIcon className="w-7 h-7 text-violet-500" />
            Gestión de Boletas
          </h1>
          <p className="text-slate-500 mt-1">
            Administra las boletas de pago de los empleados
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={ArrowUpTrayIcon}
            onClick={() => openModal('masivo')}
          >
            Subida Masiva
          </Button>
          <Button
            icon={ArrowUpTrayIcon}
            onClick={() => openModal('individual')}
          >
            Subir Boleta
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center">
              <DocumentTextIcon className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalBoletas}</p>
              <p className="text-sm text-slate-500">Total Boletas</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{boletasFirmadas}</p>
              <p className="text-sm text-slate-500">Firmadas</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{boletasPendientes}</p>
              <p className="text-sm text-slate-500">Pendientes de Firma</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <FunnelIcon className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={filtroAnio}
            onChange={(e) => setFiltroAnio(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-sm"
          >
            <option value="">Todos los años</option>
            {[...Array(5)].map((_, i) => {
              const year = new Date().getFullYear() - i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
          
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-sm"
          >
            <option value="">Todos los meses</option>
            {meses.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          
          <select
            value={filtroEmpleado}
            onChange={(e) => setFiltroEmpleado(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-sm"
          >
            <option value="">Todos los empleados</option>
            {empleados.map(e => (
              <option key={e.id} value={e.id}>{e.apellidos}, {e.nombres}</option>
            ))}
          </select>
          
          <select
            value={filtroFirmada}
            onChange={(e) => setFiltroFirmada(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="true">Firmadas</option>
            <option value="false">Pendientes</option>
          </select>
        </div>
      </div>

      {/* Tabla de boletas */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full"></div>
        </div>
      ) : boletas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <DocumentTextIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No hay boletas</h2>
          <p className="text-slate-500">No se encontraron boletas con los filtros seleccionados</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Empleado</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Período</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Estado</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase">Fecha Subida</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {boletas.map((boleta) => (
                  <tr key={boleta.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-800">
                          {boleta.empleado_apellidos}, {boleta.empleado_nombres}
                        </p>
                        <p className="text-xs text-slate-500">{boleta.codigo_empleado}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700 capitalize">
                        {getNombreMes(boleta.mes)} {boleta.anio}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                        boleta.firmada 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {boleta.firmada ? (
                          <>
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            Firmada
                          </>
                        ) : (
                          <>
                            <ClockIcon className="w-3.5 h-3.5" />
                            Pendiente
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatearFechaServidor(boleta.fecha_subida)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDescargar(boleta)}
                          className="p-2 text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Descargar"
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEliminar(boleta.id)}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <TrashIcon className="w-5 h-5" />
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

      {/* Modal de Subida */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {modalMode === 'individual' ? 'Subir Boleta Individual' : 'Subida Masiva de Boletas'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setModalMode('individual')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    modalMode === 'individual' 
                      ? 'bg-white text-violet-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Individual
                </button>
                <button
                  onClick={() => setModalMode('masivo')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    modalMode === 'masivo' 
                      ? 'bg-white text-violet-600 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Masivo
                </button>
              </div>

              {modalMode === 'individual' ? (
                <>
                  {/* Empleado */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Empleado *
                    </label>
                    <select
                      value={formData.empleado_id}
                      onChange={(e) => setFormData({ ...formData, empleado_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                    >
                      <option value="">Seleccionar empleado</option>
                      {empleados.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.apellidos}, {e.nombres} ({e.codigo_empleado})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Mes y Año */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Mes *
                      </label>
                      <select
                        value={formData.mes}
                        onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                      >
                        {meses.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Año *
                      </label>
                      <select
                        value={formData.anio}
                        onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                      >
                        {[...Array(5)].map((_, i) => {
                          const year = new Date().getFullYear() - i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Archivo */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Archivo PDF *
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setFormData({ ...formData, archivo: e.target.files[0] })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-50 file:text-violet-700 file:font-medium hover:file:bg-violet-100"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Mes y Año para masivo */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Mes *
                      </label>
                      <select
                        value={formData.mes}
                        onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                      >
                        {meses.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Año *
                      </label>
                      <select
                        value={formData.anio}
                        onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
                      >
                        {[...Array(5)].map((_, i) => {
                          const year = new Date().getFullYear() - i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Archivos múltiples */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Archivos PDF *
                    </label>
                    <input
                      ref={filesInputRef}
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={(e) => setArchivos(Array.from(e.target.files))}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-violet-50 file:text-violet-700 file:font-medium hover:file:bg-violet-100"
                    />
                    {archivos.length > 0 && (
                      <p className="mt-2 text-sm text-slate-500">
                        {archivos.length} archivo(s) seleccionado(s)
                      </p>
                    )}
                  </div>

                  {/* Instrucciones */}
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">Formato de nombre de archivo:</span><br />
                      El sistema detecta automáticamente el DNI del nombre del archivo.<br />
                      <br />
                      <span className="font-medium">Formato planilla:</span><br />
                      <code className="bg-amber-100 px-1 rounded">RUC_YYYYMM_MM_DNI_codigo.pdf</code><br />
                      Ejemplo: <code className="bg-amber-100 px-1 rounded">20524271002_202601_01_09374480_r08.pdf</code><br />
                      <br />
                      <span className="text-xs text-amber-600">* Si usa este formato, el mes y año se detectan automáticamente del nombre.</span>
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={modalMode === 'individual' ? handleSubirIndividual : handleSubirMasivo}
                loading={uploading}
                icon={ArrowUpTrayIcon}
              >
                {modalMode === 'individual' ? 'Subir Boleta' : 'Subir Boletas'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionBoletas;
