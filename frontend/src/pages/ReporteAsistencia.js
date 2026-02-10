import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeftIcon,
  ChartBarSquareIcon,
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

const ReporteAsistencia = () => {
  const navigate = useNavigate();
  const { usuario, puedeVerReporteAsistencia } = useAuth();

  // URL del reporte de Power BI
  const powerBIUrl = 'https://app.powerbi.com/reportEmbed?reportId=b05dab2b-3e01-4e09-94ff-63796af1aa2b&autoAuth=true&ctid=db42454d-1d22-45ba-8900-4003f36ed2de';

  // Verificar acceso
  if (!puedeVerReporteAsistencia()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-rose-50/30">
        <div className="text-center p-8">
          <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-6">
            <ShieldCheckIcon className="w-10 h-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Restringido</h2>
          <p className="text-slate-500 mb-6">No tienes permisos para ver este reporte.</p>
          <button
            onClick={() => navigate('/portal')}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
          >
            Volver al Portal
          </button>
        </div>
      </div>
    );
  }

  const handleAbrirReporte = () => {
    window.open(powerBIUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/portal')}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
                  <ChartBarSquareIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Reporte de Asistencia</h1>
                  <p className="text-xs text-slate-500">Power BI Dashboard</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200">
              <ShieldCheckIcon className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-medium text-rose-600">Acceso Restringido</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          {/* Ilustración */}
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-12 text-center">
            <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <ChartBarSquareIcon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Reporte de Asistencia</h2>
            <p className="text-rose-100">Dashboard de Power BI</p>
          </div>

          {/* Información */}
          <div className="p-8">
            <div className="text-center mb-8">
              <p className="text-slate-600 mb-2">
                <span className="font-medium">Usuario:</span> {usuario?.nombres} {usuario?.apellidos}
              </p>
              <p className="text-sm text-slate-400">
                ({usuario?.email})
              </p>
            </div>

            {/* Botón principal */}
            <button
              onClick={handleAbrirReporte}
              className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-rose-500/30 transition-all duration-300 hover:-translate-y-1"
            >
              <span>Abrir Reporte en Power BI</span>
              <ArrowTopRightOnSquareIcon className="w-6 h-6" />
            </button>

            {/* Nota */}
            <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Nota:</span> El reporte se abrirá en una nueva pestaña. 
                Deberás iniciar sesión con tu cuenta Microsoft corporativa (@prayaga.biz) para ver los datos.
              </p>
            </div>

            {/* Pasos */}
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-slate-700">Pasos para acceder:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                <li>Haz clic en el botón "Abrir Reporte en Power BI"</li>
                <li>Inicia sesión con tu cuenta Microsoft corporativa</li>
                <li>El reporte se cargará automáticamente</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReporteAsistencia;
