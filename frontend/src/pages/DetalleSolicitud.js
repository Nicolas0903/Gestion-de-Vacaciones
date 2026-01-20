import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { solicitudService, pdfService } from '../services/api';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  PaperAirplaneIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const DetalleSolicitud = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, puedeAprobar } = useAuth();
  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comentarioRechazo, setComentarioRechazo] = useState('');
  const [showRechazoModal, setShowRechazoModal] = useState(false);

  useEffect(() => {
    cargarSolicitud();
  }, [id]);

  const cargarSolicitud = async () => {
    try {
      const res = await solicitudService.obtener(id);
      setSolicitud(res.data.data);
    } catch (error) {
      toast.error('Error al cargar solicitud');
      navigate('/mis-solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleEnviar = async () => {
    try {
      setActionLoading(true);
      await solicitudService.enviar(id);
      toast.success('Solicitud enviada');
      cargarSolicitud();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al enviar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAprobar = async () => {
    try {
      setActionLoading(true);
      await solicitudService.aprobar(id);
      toast.success('Solicitud aprobada');
      cargarSolicitud();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al aprobar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRechazar = async () => {
    if (!comentarioRechazo.trim()) {
      toast.error('Debes indicar el motivo del rechazo');
      return;
    }
    try {
      setActionLoading(true);
      await solicitudService.rechazar(id, comentarioRechazo);
      toast.success('Solicitud rechazada');
      setShowRechazoModal(false);
      cargarSolicitud();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al rechazar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!window.confirm('¿Estás seguro de cancelar esta solicitud?')) return;
    try {
      setActionLoading(true);
      await solicitudService.cancelar(id);
      toast.success('Solicitud cancelada');
      cargarSolicitud();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al cancelar');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDescargarPDF = async () => {
    try {
      const res = await pdfService.descargarSolicitud(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `solicitud-vacaciones-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF descargado');
    } catch (error) {
      toast.error('Error al descargar PDF');
    }
  };

  const getEstadoInfo = (estado) => {
    const info = {
      borrador: { color: 'bg-slate-100 text-slate-600', texto: 'Borrador' },
      pendiente_jefe: { color: 'bg-amber-100 text-amber-700', texto: 'Pendiente de Aprobación' },
      pendiente_contadora: { color: 'bg-amber-100 text-amber-700', texto: 'Pendiente de Aprobación' },
      aprobada: { color: 'bg-emerald-100 text-emerald-700', texto: 'Aprobada' },
      rechazada: { color: 'bg-rose-100 text-rose-700', texto: 'Rechazada' },
      cancelada: { color: 'bg-slate-100 text-slate-500', texto: 'Cancelada' }
    };
    return info[estado] || { color: 'bg-slate-100 text-slate-600', texto: estado };
  };

  const puedeModificar = solicitud?.empleado_id === usuario?.id && solicitud?.estado === 'borrador';
  const puedeAprobarEsta = puedeAprobar() && 
    (solicitud?.estado === 'pendiente_jefe' || solicitud?.estado === 'pendiente_contadora');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!solicitud) return null;

  const estadoInfo = getEstadoInfo(solicitud.estado);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Volver
        </button>
        <Button
          variant="outline"
          icon={DocumentArrowDownIcon}
          onClick={handleDescargarPDF}
          size="sm"
        >
          Descargar PDF
        </Button>
      </div>

      {/* Estado */}
      <div className={`p-4 rounded-xl ${estadoInfo.color}`}>
        <p className="font-medium">{estadoInfo.texto}</p>
      </div>

      {/* Info del empleado */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-teal-500" />
          Datos del Empleado
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-500">Código</p>
            <p className="font-medium text-slate-800">{solicitud.codigo_empleado}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Nombre</p>
            <p className="font-medium text-slate-800">{solicitud.nombres} {solicitud.apellidos}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">DNI</p>
            <p className="font-medium text-slate-800">{solicitud.dni}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Cargo</p>
            <p className="font-medium text-slate-800">{solicitud.cargo}</p>
          </div>
        </div>
      </div>

      {/* Info de vacaciones */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-teal-500" />
          Información de Vacaciones
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Período</p>
              <p className="font-medium text-slate-800">
                {format(parseISO(solicitud.fecha_inicio_periodo), "d MMM yyyy", { locale: es })} - {format(parseISO(solicitud.fecha_fin_periodo), "d MMM yyyy", { locale: es })}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Días de Vacaciones</p>
              <p className="font-medium text-slate-800">
                {format(parseISO(solicitud.fecha_inicio_vacaciones), "d 'de' MMMM", { locale: es })} al {format(parseISO(solicitud.fecha_fin_vacaciones), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Días Solicitados</p>
              <p className="text-3xl font-bold text-teal-600">{solicitud.dias_solicitados}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500">Fecha Efectiva de Salida</p>
              <p className="font-medium text-slate-800">
                {format(parseISO(solicitud.fecha_efectiva_salida || solicitud.fecha_inicio_vacaciones), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Fecha Efectiva de Regreso</p>
              <p className="font-medium text-slate-800">
                {format(parseISO(solicitud.fecha_efectiva_regreso || solicitud.fecha_fin_vacaciones), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
            {solicitud.observaciones && (
              <div>
                <p className="text-sm text-slate-500">Observaciones</p>
                <p className="font-medium text-slate-800">{solicitud.observaciones}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historial de aprobaciones */}
      {solicitud.aprobaciones && solicitud.aprobaciones.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Historial de Aprobaciones</h2>
          <div className="space-y-4">
            {solicitud.aprobaciones.map((aprobacion, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  aprobacion.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-600' :
                  aprobacion.estado === 'rechazado' ? 'bg-rose-100 text-rose-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {aprobacion.estado === 'aprobado' ? <CheckIcon className="w-5 h-5" /> :
                   aprobacion.estado === 'rechazado' ? <XMarkIcon className="w-5 h-5" /> :
                   <ClockIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">
                    {aprobacion.aprobador_nombres} {aprobacion.aprobador_apellidos}
                  </p>
                  <p className="text-sm text-slate-500">{aprobacion.aprobador_cargo}</p>
                  {aprobacion.comentarios && (
                    <p className="mt-2 text-sm text-slate-600 bg-white p-2 rounded-lg">
                      "{aprobacion.comentarios}"
                    </p>
                  )}
                  {aprobacion.fecha_accion && (
                    <p className="text-xs text-slate-400 mt-2">
                      {format(parseISO(aprobacion.fecha_accion), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3 justify-end">
        {puedeModificar && (
          <>
            <Button
              variant="danger"
              onClick={handleCancelar}
              loading={actionLoading}
            >
              Cancelar Solicitud
            </Button>
            <Button
              icon={PaperAirplaneIcon}
              onClick={handleEnviar}
              loading={actionLoading}
            >
              Enviar Solicitud
            </Button>
          </>
        )}
        
        {puedeAprobarEsta && (
          <>
            <Button
              variant="danger"
              icon={XMarkIcon}
              onClick={() => setShowRechazoModal(true)}
              loading={actionLoading}
            >
              Rechazar
            </Button>
            <Button
              variant="success"
              icon={CheckIcon}
              onClick={handleAprobar}
              loading={actionLoading}
            >
              Aprobar
            </Button>
          </>
        )}
      </div>

      {/* Modal de rechazo */}
      {showRechazoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-fadeIn">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Rechazar Solicitud</h3>
            <textarea
              value={comentarioRechazo}
              onChange={(e) => setComentarioRechazo(e.target.value)}
              placeholder="Indica el motivo del rechazo..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none"
            />
            <div className="flex gap-3 mt-4">
              <Button
                variant="secondary"
                onClick={() => setShowRechazoModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleRechazar}
                loading={actionLoading}
                className="flex-1"
              >
                Rechazar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetalleSolicitud;


