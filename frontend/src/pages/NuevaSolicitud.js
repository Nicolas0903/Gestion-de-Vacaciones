import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { periodoService, solicitudService } from '../services/api';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import { CalendarDaysIcon, PaperAirplaneIcon, DocumentIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseFechaSegura } from '../utils/dateUtils';
import { calcularDiasVacaciones } from '../utils/calcularDiasVacaciones';

const NuevaSolicitud = () => {
  const navigate = useNavigate();
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    periodo_id: '',
    fecha_inicio_vacaciones: '',
    fecha_fin_vacaciones: '',
    fecha_efectiva_salida: '',
    fecha_efectiva_regreso: '',
    observaciones: ''
  });

  const [calculoDias, setCalculoDias] = useState({
    diasTotales: 0,
    diasLaborales: 0,
    diasFinDeSemana: 0,
    detalle: []
  });
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(null);

  useEffect(() => {
    cargarPeriodos();
  }, []);

  useEffect(() => {
    if (formData.fecha_inicio_vacaciones && formData.fecha_fin_vacaciones) {
      const inicio = parseFechaSegura(formData.fecha_inicio_vacaciones);
      const fin = parseFechaSegura(formData.fecha_fin_vacaciones);
      
      // Usar la nueva función de cálculo con política de empresa
      const resultado = calcularDiasVacaciones(formData.fecha_inicio_vacaciones, formData.fecha_fin_vacaciones);
      setCalculoDias(resultado);

      // Auto-completar fechas efectivas
      if (!formData.fecha_efectiva_salida) {
        setFormData(prev => ({ ...prev, fecha_efectiva_salida: formData.fecha_inicio_vacaciones }));
      }
      if (!formData.fecha_efectiva_regreso) {
        setFormData(prev => ({ ...prev, fecha_efectiva_regreso: format(addDays(fin, 1), 'yyyy-MM-dd') }));
      }
    } else {
      setCalculoDias({ diasTotales: 0, diasLaborales: 0, diasFinDeSemana: 0, detalle: [] });
    }
  }, [formData.fecha_inicio_vacaciones, formData.fecha_fin_vacaciones]);

  useEffect(() => {
    if (formData.periodo_id) {
      const periodo = periodos.find(p => p.id === parseInt(formData.periodo_id));
      setPeriodoSeleccionado(periodo);
    }
  }, [formData.periodo_id, periodos]);

  const cargarPeriodos = async () => {
    try {
      const res = await periodoService.misPendientes();
      setPeriodos(res.data.data);
      if (res.data.data.length > 0) {
        setFormData(prev => ({ ...prev, periodo_id: res.data.data[0].id.toString() }));
      }
    } catch (error) {
      toast.error('Error al cargar períodos');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validarFormulario = () => {
    if (!formData.periodo_id) {
      toast.error('Selecciona un período');
      return false;
    }
    if (!formData.fecha_inicio_vacaciones || !formData.fecha_fin_vacaciones) {
      toast.error('Las fechas de vacaciones son requeridas');
      return false;
    }
    if (calculoDias.diasTotales <= 0) {
      toast.error('Las fechas son inválidas');
      return false;
    }
    if (periodoSeleccionado && calculoDias.diasTotales > periodoSeleccionado.dias_pendientes) {
      toast.error(`Solo tienes ${periodoSeleccionado.dias_pendientes} días disponibles en este período`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (enviar = false) => {
    if (!validarFormulario()) return;

    try {
      setSubmitting(true);
      const res = await solicitudService.crear({
        ...formData,
        periodo_id: parseInt(formData.periodo_id),
        dias_solicitados: calculoDias.diasTotales // Enviar los días calculados
      });

      if (enviar) {
        await solicitudService.enviar(res.data.data.id);
        toast.success('Solicitud enviada correctamente');
      } else {
        toast.success('Solicitud guardada como borrador');
      }

      navigate('/vacaciones/mis-solicitudes');
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al crear solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (periodos.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDaysIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">No tienes días disponibles</h2>
        <p className="text-slate-500">No tienes períodos de vacaciones con días pendientes.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Nueva Solicitud de Vacaciones</h1>
        <p className="text-slate-500 mt-1">Completa el formulario para solicitar tus vacaciones</p>
      </div>

      {/* Aviso de política */}
      <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex gap-3">
        <InformationCircleIcon className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-blue-800 font-medium">Política de cálculo de días</p>
          <p className="text-sm text-blue-600 mt-1">
            Si tus vacaciones incluyen un viernes y continúan el lunes siguiente, 
            el sábado y domingo se contarán como días de vacaciones.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <form className="space-y-6">
          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Período de Vacaciones
            </label>
            <select
              name="periodo_id"
              value={formData.periodo_id}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
            >
              {periodos.map(periodo => (
                <option key={periodo.id} value={periodo.id}>
                  {format(parseFechaSegura(periodo.fecha_inicio_periodo), "d MMM yyyy", { locale: es })} - {format(parseFechaSegura(periodo.fecha_fin_periodo), "d MMM yyyy", { locale: es })} ({periodo.dias_pendientes} días disponibles)
                </option>
              ))}
            </select>
            {periodoSeleccionado && (
              <p className="mt-2 text-sm text-teal-600">
                Tienes <strong>{periodoSeleccionado.dias_pendientes} días</strong> disponibles en este período
              </p>
            )}
          </div>

          {/* Fechas de vacaciones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha de Inicio
              </label>
              <input
                type="date"
                name="fecha_inicio_vacaciones"
                value={formData.fecha_inicio_vacaciones}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha de Fin
              </label>
              <input
                type="date"
                name="fecha_fin_vacaciones"
                value={formData.fecha_fin_vacaciones}
                onChange={handleChange}
                min={formData.fecha_inicio_vacaciones}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Días calculados - Detallado */}
          {calculoDias.diasTotales > 0 && (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
              <div className="flex items-center justify-between mb-3">
                <p className="text-teal-700 font-medium">
                  Total de días a descontar:
                </p>
                <span className="text-3xl font-bold text-teal-700">{calculoDias.diasTotales}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-teal-200">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-slate-700">{calculoDias.diasLaborales}</p>
                  <p className="text-xs text-slate-500">Días laborales (L-V)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-amber-600">{calculoDias.diasFinDeSemana}</p>
                  <p className="text-xs text-slate-500">Fines de semana incluidos</p>
                </div>
              </div>

              {calculoDias.diasFinDeSemana > 0 && (
                <p className="mt-3 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                  ⚠️ Se incluyen {calculoDias.diasFinDeSemana} día(s) de fin de semana porque las vacaciones abarcan de viernes a lunes.
                </p>
              )}
            </div>
          )}

          {/* Fechas efectivas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha Efectiva de Salida
              </label>
              <input
                type="date"
                name="fecha_efectiva_salida"
                value={formData.fecha_efectiva_salida}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fecha Efectiva de Regreso
              </label>
              <input
                type="date"
                name="fecha_efectiva_regreso"
                value={formData.fecha_efectiva_regreso}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Observaciones
            </label>
            <textarea
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              rows={4}
              placeholder="Agrega cualquier observación relevante..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              icon={DocumentIcon}
              onClick={() => handleSubmit(false)}
              loading={submitting}
              className="flex-1"
            >
              Guardar Borrador
            </Button>
            <Button
              type="button"
              icon={PaperAirplaneIcon}
              onClick={() => handleSubmit(true)}
              loading={submitting}
              className="flex-1"
            >
              Enviar Solicitud
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevaSolicitud;
