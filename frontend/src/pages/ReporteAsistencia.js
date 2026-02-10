import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeftIcon,
  ChartBarSquareIcon,
  ShieldCheckIcon
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

      {/* Power BI Embed */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          {/* Info bar */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-rose-50/50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                <span className="font-medium">Usuario:</span> {usuario?.nombres} {usuario?.apellidos}
              </p>
              <p className="text-xs text-slate-400">
                Los datos se actualizan automáticamente desde Power BI
              </p>
            </div>
          </div>
          
          {/* iframe container */}
          <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
            <iframe
              title="Reporte de Asistencia - Power BI"
              src={powerBIUrl}
              frameBorder="0"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
              style={{ minHeight: '600px' }}
            />
          </div>
        </div>

        {/* Nota al pie */}
        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Nota:</span> Este reporte requiere autenticación con tu cuenta Microsoft corporativa. 
            Si no puedes ver los datos, asegúrate de haber iniciado sesión en tu cuenta de Microsoft.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReporteAsistencia;
