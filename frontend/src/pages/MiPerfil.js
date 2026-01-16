import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { periodoService, authService } from '../services/api';
import Button from '../components/Button';
import { StatCard } from '../components/Card';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const MiPerfil = () => {
  const { usuario } = useAuth();
  const [resumen, setResumen] = useState({ total_ganados: 0, total_gozados: 0, total_pendientes: 0 });
  const [periodos, setPeriodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    passwordActual: '',
    passwordNuevo: '',
    confirmarPassword: ''
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [resumenRes, periodosRes] = await Promise.all([
        periodoService.miResumen(),
        periodoService.misPeriodos()
      ]);
      setResumen(resumenRes.data.data);
      setPeriodos(periodosRes.data.data);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.passwordNuevo !== passwordData.confirmarPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.passwordNuevo.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setSavingPassword(true);
      await authService.cambiarPassword(passwordData.passwordActual, passwordData.passwordNuevo);
      toast.success('Contraseña actualizada correctamente');
      setShowPasswordModal(false);
      setPasswordData({ passwordActual: '', passwordNuevo: '', confirmarPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al cambiar contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  const getEstadoColor = (estado) => {
    if (estado === 'gozadas') return 'bg-emerald-100 text-emerald-700';
    if (estado === 'parcial') return 'bg-amber-100 text-amber-700';
    return 'bg-slate-100 text-slate-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header con info del usuario */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold">
            {usuario?.nombres?.charAt(0)}{usuario?.apellidos?.charAt(0)}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold">{usuario?.nombres} {usuario?.apellidos}</h1>
            <p className="text-teal-100">{usuario?.cargo}</p>
            <div className="flex flex-wrap gap-4 mt-3 justify-center sm:justify-start">
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                {usuario?.codigo_empleado}
              </span>
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full capitalize">
                {usuario?.rol_nombre?.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="sm:ml-auto">
            <Button
              variant="secondary"
              icon={KeyIcon}
              onClick={() => setShowPasswordModal(true)}
              size="sm"
            >
              Cambiar Contraseña
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={CalendarDaysIcon}
          label="Días Ganados"
          value={resumen.total_ganados || 0}
          color="blue"
        />
        <StatCard
          icon={CheckCircleIcon}
          label="Días Gozados"
          value={resumen.total_gozados || 0}
          color="emerald"
        />
        <StatCard
          icon={ClockIcon}
          label="Días Pendientes"
          value={resumen.total_pendientes || 0}
          color="amber"
        />
      </div>

      {/* Info personal */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <UserCircleIcon className="w-5 h-5 text-teal-500" />
          Información Personal
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-slate-500">DNI</p>
            <p className="font-medium text-slate-800">{usuario?.dni}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="font-medium text-slate-800">{usuario?.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Fecha de Ingreso</p>
            <p className="font-medium text-slate-800">
              {usuario?.fecha_ingreso && format(parseISO(usuario.fecha_ingreso), "d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Jefe Directo</p>
            <p className="font-medium text-slate-800">
              {usuario?.jefe_nombres ? `${usuario.jefe_nombres} ${usuario.jefe_apellidos}` : 'No asignado'}
            </p>
          </div>
        </div>
      </div>

      {/* Períodos de vacaciones */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <CalendarDaysIcon className="w-5 h-5 text-teal-500" />
          Mis Períodos de Vacaciones
        </h2>
        
        {periodos.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No tienes períodos de vacaciones registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Período</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Correspondientes</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Gozados</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Pendientes</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periodos.map((periodo) => (
                  <tr key={periodo.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-700">
                        {format(parseISO(periodo.fecha_inicio_periodo), "d MMM yyyy", { locale: es })} - {format(parseISO(periodo.fecha_fin_periodo), "d MMM yyyy", { locale: es })}
                      </p>
                      {periodo.observaciones && (
                        <p className="text-xs text-slate-500">{periodo.observaciones}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-700">
                      {periodo.dias_correspondientes}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-600">
                      {periodo.dias_gozados}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-amber-600">
                      {periodo.dias_pendientes}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getEstadoColor(periodo.estado)}`}>
                        {periodo.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal cambiar contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-fadeIn">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Cambiar Contraseña</h3>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Actual</label>
                <input
                  type="password"
                  name="passwordActual"
                  value={passwordData.passwordActual}
                  onChange={handlePasswordChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                <input
                  type="password"
                  name="passwordNuevo"
                  value={passwordData.passwordNuevo}
                  onChange={handlePasswordChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  name="confirmarPassword"
                  value={passwordData.confirmarPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button type="submit" loading={savingPassword} className="flex-1">
                  Cambiar Contraseña
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiPerfil;


