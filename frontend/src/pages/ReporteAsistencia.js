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

  // URL del reporte de Power BI (Publicar en Web - público)
  const powerBIUrl = 'https://app.powerbi.com/view?r=eyJrIjoiN2E5ZDMxZmMtMThhZS00Yzc4LWI2NGMtNGRhMTBjM2Y5OTYyIiwidCI6ImRiNDI0NTRkLTFkMjItNDViYS04OTAwLTQwMDNmMzZlZDJkZSJ9&embedImagePlaceholder=true';

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

  const handleAbrirNuevaPestana = () => {
    window.open(powerBIUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30 flex flex-col">
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
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleAbrirNuevaPestana}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                Abrir en nueva pestaña
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200">
                <ShieldCheckIcon className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-medium text-rose-600">Acceso Restringido</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Power BI Embed */}
      <div className="flex-1 p-4">
        <div className="h-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          <iframe
            title="Reporte de Asistencia - Power BI"
            src={powerBIUrl}
            frameBorder="0"
            allowFullScreen
            className="w-full h-full"
            style={{ minHeight: 'calc(100vh - 120px)' }}
          />
        </div>
      </div>
    </div>
  );
};

export default ReporteAsistencia;
