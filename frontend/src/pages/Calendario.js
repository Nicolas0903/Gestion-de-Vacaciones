import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { solicitudService, periodoService } from '../services/api';
import toast from 'react-hot-toast';
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon, PaperAirplaneIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { calcularDiasVacaciones } from '../utils/calcularDiasVacaciones';
import Button from '../components/Button';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const messages = {
  allDay: 'Todo el día',
  previous: 'Anterior',
  next: 'Siguiente',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay vacaciones en este período.',
  showMore: total => `+ Ver ${total} más`,
};

const Calendario = () => {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Estado para nueva solicitud desde calendario
  const [showNuevaSolicitud, setShowNuevaSolicitud] = useState(false);
  const [periodos, setPeriodos] = useState([]);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    periodo_id: '',
    fecha_inicio_vacaciones: '',
    fecha_fin_vacaciones: '',
    observaciones: ''
  });
  const [calculoDias, setCalculoDias] = useState({
    diasTotales: 0,
    diasLaborales: 0,
    diasFinDeSemana: 0
  });

  const cargarEventos = useCallback(async (date) => {
    try {
      setLoading(true);
      const inicio = format(startOfMonth(subMonths(date, 1)), 'yyyy-MM-dd');
      const fin = format(endOfMonth(addMonths(date, 1)), 'yyyy-MM-dd');
      
      const res = await solicitudService.calendario(inicio, fin);
      
      const eventosFormateados = res.data.data.map(solicitud => ({
        id: solicitud.id,
        title: `${solicitud.nombres} ${solicitud.apellidos}`,
        start: new Date(solicitud.fecha_inicio_vacaciones),
        end: new Date(solicitud.fecha_fin_vacaciones + 'T23:59:59'),
        resource: solicitud,
        estado: solicitud.estado
      }));
      
      setEventos(eventosFormateados);
    } catch (error) {
      toast.error('Error al cargar calendario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarEventos(currentDate);
  }, [currentDate, cargarEventos]);

  // Calcular días cuando cambian las fechas
  useEffect(() => {
    if (formData.fecha_inicio_vacaciones && formData.fecha_fin_vacaciones) {
      const resultado = calcularDiasVacaciones(formData.fecha_inicio_vacaciones, formData.fecha_fin_vacaciones);
      setCalculoDias(resultado);
    } else {
      setCalculoDias({ diasTotales: 0, diasLaborales: 0, diasFinDeSemana: 0 });
    }
  }, [formData.fecha_inicio_vacaciones, formData.fecha_fin_vacaciones]);

  const handleNavigate = (date) => {
    setCurrentDate(date);
  };

  // Cargar períodos disponibles
  const cargarPeriodos = async () => {
    try {
      setLoadingPeriodos(true);
      const res = await periodoService.misPendientes();
      setPeriodos(res.data.data);
      if (res.data.data.length > 0) {
        setFormData(prev => ({ ...prev, periodo_id: res.data.data[0].id.toString() }));
      }
    } catch (error) {
      toast.error('Error al cargar períodos');
    } finally {
      setLoadingPeriodos(false);
    }
  };

  // Manejar selección de rango en el calendario
  const handleSelectSlot = ({ start, end }) => {
    // Ajustar la fecha de fin (react-big-calendar agrega un día extra)
    const fechaFin = addDays(end, -1);
    
    setFormData({
      periodo_id: periodos.length > 0 ? periodos[0].id.toString() : '',
      fecha_inicio_vacaciones: format(start, 'yyyy-MM-dd'),
      fecha_fin_vacaciones: format(fechaFin, 'yyyy-MM-dd'),
      observaciones: ''
    });
    setShowNuevaSolicitud(true);
    cargarPeriodos();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getPeriodoSeleccionado = () => {
    return periodos.find(p => p.id === parseInt(formData.periodo_id));
  };

  const handleSubmitSolicitud = async () => {
    const periodoSeleccionado = getPeriodoSeleccionado();
    
    if (!formData.periodo_id) {
      toast.error('Selecciona un período');
      return;
    }
    if (!formData.fecha_inicio_vacaciones || !formData.fecha_fin_vacaciones) {
      toast.error('Las fechas son requeridas');
      return;
    }
    if (calculoDias.diasTotales <= 0) {
      toast.error('Las fechas son inválidas');
      return;
    }
    if (periodoSeleccionado && calculoDias.diasTotales > periodoSeleccionado.dias_pendientes) {
      toast.error(`Solo tienes ${periodoSeleccionado.dias_pendientes} días disponibles`);
      return;
    }

    try {
      setSubmitting(true);
      
      // Calcular fechas efectivas
      const fechaFin = parseISO(formData.fecha_fin_vacaciones);
      const fechaEfectivaRegreso = format(addDays(fechaFin, 1), 'yyyy-MM-dd');
      
      const res = await solicitudService.crear({
        periodo_id: parseInt(formData.periodo_id),
        fecha_inicio_vacaciones: formData.fecha_inicio_vacaciones,
        fecha_fin_vacaciones: formData.fecha_fin_vacaciones,
        fecha_efectiva_salida: formData.fecha_inicio_vacaciones,
        fecha_efectiva_regreso: fechaEfectivaRegreso,
        observaciones: formData.observaciones,
        dias_solicitados: calculoDias.diasTotales
      });

      // Enviar la solicitud directamente
      await solicitudService.enviar(res.data.data.id);
      toast.success('¡Solicitud enviada correctamente!');
      
      setShowNuevaSolicitud(false);
      cargarEventos(currentDate); // Recargar eventos
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al crear solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#0d9488'; // teal default
    let borderColor = '#0f766e';

    if (event.estado === 'pendiente_jefe' || event.estado === 'pendiente_contadora') {
      backgroundColor = '#f59e0b';
      borderColor = '#d97706';
    } else if (event.estado === 'aprobada') {
      backgroundColor = '#10b981';
      borderColor = '#059669';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '8px',
        border: `2px solid ${borderColor}`,
        color: 'white',
        fontSize: '0.75rem',
        fontWeight: '500',
        padding: '2px 6px',
      },
    };
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
  };

  const getEstadoTexto = (estado) => {
    const textos = {
      pendiente_jefe: 'Pendiente de Aprobación',
      pendiente_contadora: 'Pendiente de Aprobación',
      aprobada: 'Aprobada'
    };
    return textos[estado] || estado;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarDaysIcon className="w-7 h-7 text-teal-500" />
            Calendario de Vacaciones
          </h1>
          <p className="text-slate-500 mt-1">
            Visualiza las vacaciones del equipo o selecciona un rango para crear una solicitud
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              periodo_id: '',
              fecha_inicio_vacaciones: '',
              fecha_fin_vacaciones: '',
              observaciones: ''
            });
            setShowNuevaSolicitud(true);
            cargarPeriodos();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Nueva Solicitud
        </button>
      </div>

      {/* Tip de selección */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
        <InformationCircleIcon className="w-5 h-5 text-teal-600 flex-shrink-0" />
        <p className="text-sm text-teal-700">
          <strong>Tip:</strong> Haz clic y arrastra en el calendario para seleccionar las fechas de tus vacaciones
        </p>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500"></div>
          <span className="text-sm text-slate-600">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500"></div>
          <span className="text-sm text-slate-600">Aprobada</span>
        </div>
      </div>

      {/* Calendario */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100" style={{ height: '600px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={eventos}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            messages={messages}
            culture="es"
            date={currentDate}
            onNavigate={handleNavigate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'agenda']}
            defaultView="month"
            selectable
            popup
            components={{
              toolbar: ({ label, onNavigate }) => (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigate('PREV')}
                      className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onNavigate('NEXT')}
                      className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onNavigate('TODAY')}
                      className="px-3 py-1 text-sm font-medium rounded-lg bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors"
                    >
                      Hoy
                    </button>
                  </div>
                  <h2 className="text-lg font-semibold text-slate-800 capitalize">{label}</h2>
                  <div></div>
                </div>
              ),
            }}
          />
        )}
      </div>

      {/* Modal de detalle */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-md animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold">
                {selectedEvent.nombres?.charAt(0)}{selectedEvent.apellidos?.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  {selectedEvent.nombres} {selectedEvent.apellidos}
                </h3>
                <p className="text-sm text-slate-500">{selectedEvent.cargo}</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Fechas:</span>
                <span className="text-sm font-medium text-slate-700">
                  {format(new Date(selectedEvent.fecha_inicio_vacaciones), "d MMM", { locale: es })} - {format(new Date(selectedEvent.fecha_fin_vacaciones), "d MMM yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Días:</span>
                <span className="text-sm font-medium text-slate-700">{selectedEvent.dias_solicitados}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500">Estado:</span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                  selectedEvent.estado === 'aprobada' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {getEstadoTexto(selectedEvent.estado)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedEvent(null)}
              className="w-full py-2 px-4 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Nueva Solicitud */}
      {showNuevaSolicitud && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowNuevaSolicitud(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-lg animate-fadeIn max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Nueva Solicitud</h3>
                <p className="text-sm text-slate-500 mt-1">Crea tu solicitud de vacaciones</p>
              </div>
              <button
                onClick={() => setShowNuevaSolicitud(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-5">
              {loadingPeriodos ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
                </div>
              ) : periodos.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDaysIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">No tienes días disponibles</p>
                  <p className="text-slate-400 text-sm mt-1">No tienes períodos con días pendientes</p>
                </div>
              ) : (
                <>
                  {/* Período */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Período de Vacaciones
                    </label>
                    <select
                      name="periodo_id"
                      value={formData.periodo_id}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    >
                      {periodos.map(periodo => (
                        <option key={periodo.id} value={periodo.id}>
                          {format(parseISO(periodo.fecha_inicio_periodo), "d MMM yyyy", { locale: es })} - {format(parseISO(periodo.fecha_fin_periodo), "d MMM yyyy", { locale: es })} ({periodo.dias_pendientes} días)
                        </option>
                      ))}
                    </select>
                    {getPeriodoSeleccionado() && (
                      <p className="mt-2 text-sm text-teal-600">
                        Tienes <strong>{getPeriodoSeleccionado().dias_pendientes} días</strong> disponibles
                      </p>
                    )}
                  </div>

                  {/* Fechas */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Fecha Inicio
                      </label>
                      <input
                        type="date"
                        name="fecha_inicio_vacaciones"
                        value={formData.fecha_inicio_vacaciones}
                        onChange={handleFormChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Fecha Fin
                      </label>
                      <input
                        type="date"
                        name="fecha_fin_vacaciones"
                        value={formData.fecha_fin_vacaciones}
                        onChange={handleFormChange}
                        min={formData.fecha_inicio_vacaciones}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Días calculados */}
                  {calculoDias.diasTotales > 0 && (
                    <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-teal-700 font-medium">Total días a descontar:</p>
                        <span className="text-2xl font-bold text-teal-700">{calculoDias.diasTotales}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-teal-200">
                        <div className="text-center">
                          <p className="text-lg font-semibold text-slate-700">{calculoDias.diasLaborales}</p>
                          <p className="text-xs text-slate-500">Días laborales</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-amber-600">{calculoDias.diasFinDeSemana}</p>
                          <p className="text-xs text-slate-500">Fines de semana</p>
                        </div>
                      </div>
                      {calculoDias.diasFinDeSemana > 0 && (
                        <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2 rounded-lg">
                          ⚠️ Se incluyen fines de semana porque las vacaciones incluyen viernes
                        </p>
                      )}
                    </div>
                  )}

                  {/* Observaciones */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Observaciones (opcional)
                    </label>
                    <textarea
                      name="observaciones"
                      value={formData.observaciones}
                      onChange={handleFormChange}
                      rows={3}
                      placeholder="Agrega cualquier observación..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowNuevaSolicitud(false)}
                      className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <Button
                      onClick={handleSubmitSolicitud}
                      loading={submitting}
                      icon={PaperAirplaneIcon}
                      className="flex-1"
                    >
                      Enviar Solicitud
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendario;

