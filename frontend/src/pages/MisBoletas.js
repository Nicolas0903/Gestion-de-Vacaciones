import React, { useState, useEffect } from 'react';
import { boletaService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const MisBoletas = () => {
  const { usuario } = useAuth();
  const [boletas, setBoletas] = useState([]);
  const [anios, setAnios] = useState([]);
  const [anioSeleccionado, setAnioSeleccionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [firmando, setFirmando] = useState(null);
  const [descargando, setDescargando] = useState(null);

  useEffect(() => {
    cargarAnios();
  }, []);

  useEffect(() => {
    cargarBoletas();
  }, [anioSeleccionado]);

  const cargarAnios = async () => {
    try {
      const res = await boletaService.misAnios();
      setAnios(res.data.data);
      // Seleccionar el año actual o el más reciente
      const anioActual = new Date().getFullYear();
      if (res.data.data.includes(anioActual)) {
        setAnioSeleccionado(anioActual);
      } else if (res.data.data.length > 0) {
        setAnioSeleccionado(res.data.data[0]);
      }
    } catch (error) {
      console.error('Error cargando años:', error);
    }
  };

  const cargarBoletas = async () => {
    try {
      setLoading(true);
      const res = await boletaService.misBoletas(anioSeleccionado || null);
      setBoletas(res.data.data);
    } catch (error) {
      toast.error('Error al cargar las boletas');
    } finally {
      setLoading(false);
    }
  };

  const handleFirmar = async (id) => {
    try {
      setFirmando(id);
      await boletaService.firmar(id);
      toast.success('Boleta firmada correctamente');
      cargarBoletas();
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al firmar la boleta');
    } finally {
      setFirmando(null);
    }
  };

  const handleDescargar = async (boleta) => {
    try {
      setDescargando(boleta.id);
      const res = await boletaService.descargar(boleta.id);
      
      // Crear URL y descargar
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', boleta.archivo_nombre || `boleta_${boleta.mes}_${boleta.anio}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Boleta descargada');
    } catch (error) {
      toast.error('Error al descargar la boleta');
    } finally {
      setDescargando(null);
    }
  };

  const getNombreMes = (mes) => {
    const fecha = new Date(2024, mes - 1, 1);
    return format(fecha, 'MMMM', { locale: es });
  };

  const boletasPendientes = boletas.filter(b => !b.firmada).length;
  const boletasFirmadas = boletas.filter(b => b.firmada).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <DocumentTextIcon className="w-7 h-7 text-violet-500" />
            Mis Boletas de Pago
          </h1>
          <p className="text-slate-500 mt-1">
            Visualiza y firma tus boletas de pago mensuales
          </p>
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
              <p className="text-2xl font-bold text-slate-800">{boletas.length}</p>
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

      {/* Filtro de año */}
      <div className="flex items-center gap-3">
        <FunnelIcon className="w-5 h-5 text-slate-400" />
        <select
          value={anioSeleccionado}
          onChange={(e) => setAnioSeleccionado(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all text-sm"
        >
          <option value="">Todos los años</option>
          {anios.map(anio => (
            <option key={anio} value={anio}>{anio}</option>
          ))}
        </select>
      </div>

      {/* Lista de boletas */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full"></div>
        </div>
      ) : boletas.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <DocumentTextIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">No hay boletas</h2>
          <p className="text-slate-500">
            {anioSeleccionado 
              ? `No tienes boletas registradas para el año ${anioSeleccionado}`
              : 'Aún no tienes boletas de pago registradas'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boletas.map((boleta) => (
            <div
              key={boleta.id}
              className={`bg-white rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md ${
                boleta.firmada ? 'border-emerald-200' : 'border-amber-200'
              }`}
            >
              {/* Header de la boleta */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    boleta.firmada ? 'bg-emerald-100' : 'bg-violet-100'
                  }`}>
                    <CalendarDaysIcon className={`w-6 h-6 ${
                      boleta.firmada ? 'text-emerald-600' : 'text-violet-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 capitalize">
                      {getNombreMes(boleta.mes)}
                    </h3>
                    <p className="text-sm text-slate-500">{boleta.anio}</p>
                  </div>
                </div>
                
                {/* Badge de estado */}
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  boleta.firmada 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {boleta.firmada ? 'Firmada' : 'Pendiente'}
                </span>
              </div>

              {/* Info adicional */}
              <div className="text-sm text-slate-500 mb-4">
                <p>Subida: {format(new Date(boleta.fecha_subida), 'dd/MM/yyyy HH:mm')}</p>
                {boleta.firmada && boleta.fecha_firma && (
                  <p className="text-emerald-600">
                    Firmada: {format(new Date(boleta.fecha_firma), 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={ArrowDownTrayIcon}
                  onClick={() => handleDescargar(boleta)}
                  loading={descargando === boleta.id}
                  className="flex-1"
                >
                  Descargar
                </Button>
                
                {!boleta.firmada && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={CheckCircleIcon}
                    onClick={() => handleFirmar(boleta.id)}
                    loading={firmando === boleta.id}
                    className="flex-1 !bg-gradient-to-r !from-emerald-500 !to-teal-500"
                  >
                    Firmar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Nota informativa */}
      {boletasPendientes > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Nota:</span> Tienes {boletasPendientes} boleta(s) pendiente(s) de firma. 
            Por favor, revisa y firma tus boletas para confirmar la recepción.
          </p>
        </div>
      )}
    </div>
  );
};

export default MisBoletas;
