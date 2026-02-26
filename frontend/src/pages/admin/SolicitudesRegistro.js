import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  UserPlusIcon, 
  CheckIcon, 
  XMarkIcon, 
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
  IdentificationIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';

const SolicitudesRegistro = () => {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendiente');
  const [modalAprobar, setModalAprobar] = useState(null);
  const [modalRechazar, setModalRechazar] = useState(null);
  const [roles, setRoles] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [formAprobacion, setFormAprobacion] = useState({
    rol_id: 5,
    jefe_id: '',
    comentarios: ''
  });
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [filtro]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [solicitudesRes, rolesRes, empleadosRes] = await Promise.all([
        api.get(`/auth/solicitudes-registro${filtro === 'pendiente' ? '?estado=pendiente' : ''}`),
        api.get('/empleados/roles'),
        api.get('/empleados?activo=true')
      ]);
      setSolicitudes(solicitudesRes.data.data || []);
      setRoles(rolesRes.data.data || []);
      setEmpleados(empleadosRes.data.data || []);
    } catch (error) {
      toast.error('Error al cargar datos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async () => {
    if (!formAprobacion.rol_id) {
      toast.error('Por favor selecciona un rol');
      return;
    }

    setProcesando(true);
    try {
      await api.put(`/auth/solicitudes-registro/${modalAprobar.id}/aprobar`, formAprobacion);
      toast.success('Solicitud aprobada. Se ha enviado las credenciales por email.');
      setModalAprobar(null);
      setFormAprobacion({ rol_id: 5, jefe_id: '', comentarios: '' });
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al aprobar solicitud');
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async () => {
    if (!motivoRechazo.trim()) {
      toast.error('Por favor ingresa un motivo de rechazo');
      return;
    }

    setProcesando(true);
    try {
      await api.put(`/auth/solicitudes-registro/${modalRechazar.id}/rechazar`, { 
        comentarios: motivoRechazo 
      });
      toast.success('Solicitud rechazada');
      setModalRechazar(null);
      setMotivoRechazo('');
      cargarDatos();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al rechazar solicitud');
    } finally {
      setProcesando(false);
    }
  };

  const getEstadoBadge = (estado) => {
    const estilos = {
      pendiente: 'bg-yellow-100 text-yellow-800',
      aprobada: 'bg-green-100 text-green-800',
      rechazada: 'bg-red-100 text-red-800'
    };
    const textos = {
      pendiente: 'Pendiente',
      aprobada: 'Aprobada',
      rechazada: 'Rechazada'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${estilos[estado]}`}>
        {textos[estado]}
      </span>
    );
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserPlusIcon className="w-7 h-7 text-teal-600" />
            Solicitudes de Registro
          </h1>
          <p className="text-slate-500 mt-1">Gestiona las solicitudes de nuevos usuarios</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFiltro('pendiente')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtro === 'pendiente' 
                ? 'bg-teal-600 text-white' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFiltro('todas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filtro === 'todas' 
                ? 'bg-teal-600 text-white' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Lista de solicitudes */}
      {loading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-teal-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : solicitudes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <ClockIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No hay solicitudes {filtro === 'pendiente' ? 'pendientes' : ''}</h3>
          <p className="text-slate-500 mt-1">
            {filtro === 'pendiente' 
              ? 'Las nuevas solicitudes aparecerán aquí' 
              : 'No se han registrado solicitudes aún'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {solicitudes.map((solicitud) => (
            <div 
              key={solicitud.id} 
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col lg:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                      <span className="text-teal-700 font-semibold">
                        {solicitud.nombres.charAt(0)}{solicitud.apellidos.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {solicitud.nombres} {solicitud.apellidos}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Solicitado el {formatearFecha(solicitud.created_at)}
                      </p>
                    </div>
                    {getEstadoBadge(solicitud.estado)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <EnvelopeIcon className="w-4 h-4 text-slate-400" />
                      {solicitud.email}
                    </div>
                    {solicitud.dni && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <IdentificationIcon className="w-4 h-4 text-slate-400" />
                        DNI: {solicitud.dni}
                      </div>
                    )}
                    {solicitud.telefono && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <PhoneIcon className="w-4 h-4 text-slate-400" />
                        {solicitud.telefono}
                      </div>
                    )}
                    {solicitud.cargo_solicitado && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <BriefcaseIcon className="w-4 h-4 text-slate-400" />
                        {solicitud.cargo_solicitado}
                      </div>
                    )}
                  </div>

                  {solicitud.motivo && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
                      <strong>Motivo:</strong> {solicitud.motivo}
                    </div>
                  )}

                  {solicitud.comentarios_revision && (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${
                      solicitud.estado === 'aprobada' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      <strong>Comentarios:</strong> {solicitud.comentarios_revision}
                    </div>
                  )}
                </div>

                {solicitud.estado === 'pendiente' && (
                  <div className="flex lg:flex-col gap-2">
                    <button
                      onClick={() => setModalAprobar(solicitud)}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckIcon className="w-4 h-4" />
                      Aprobar
                    </button>
                    <button
                      onClick={() => setModalRechazar(solicitud)}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Aprobar */}
      {modalAprobar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Aprobar Solicitud
            </h2>
            <p className="text-slate-600 mb-4">
              Se creará una cuenta para <strong>{modalAprobar.nombres} {modalAprobar.apellidos}</strong> y se le enviarán las credenciales por email.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Rol *
                </label>
                <select
                  value={formAprobacion.rol_id}
                  onChange={(e) => setFormAprobacion(prev => ({ ...prev, rol_id: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                >
                  {roles.map(rol => (
                    <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Jefe Directo
                </label>
                <select
                  value={formAprobacion.jefe_id}
                  onChange={(e) => setFormAprobacion(prev => ({ ...prev, jefe_id: e.target.value }))}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                >
                  <option value="">Sin jefe asignado</option>
                  {empleados.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombres} {emp.apellidos} - {emp.cargo || emp.rol_nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Comentarios
                </label>
                <textarea
                  value={formAprobacion.comentarios}
                  onChange={(e) => setFormAprobacion(prev => ({ ...prev, comentarios: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-none"
                  placeholder="Comentarios opcionales..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModalAprobar(null)}
                disabled={procesando}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAprobar}
                disabled={procesando}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {procesando ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Aprobando...
                  </>
                ) : (
                  'Aprobar y Crear Cuenta'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Rechazar */}
      {modalRechazar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-fadeIn">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Rechazar Solicitud
            </h2>
            <p className="text-slate-600 mb-4">
              Se notificará a <strong>{modalRechazar.nombres} {modalRechazar.apellidos}</strong> que su solicitud fue rechazada.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Motivo del rechazo *
              </label>
              <textarea
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none resize-none"
                placeholder="Explica el motivo del rechazo..."
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setModalRechazar(null);
                  setMotivoRechazo('');
                }}
                disabled={procesando}
                className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleRechazar}
                disabled={procesando}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {procesando ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Rechazando...
                  </>
                ) : (
                  'Rechazar Solicitud'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolicitudesRegistro;
