import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LockClosedIcon, ArrowLeftIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

const RestablecerPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificando, setVerificando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    verificarToken();
  }, [token]);

  const verificarToken = async () => {
    try {
      const response = await api.get(`/auth/verificar-token/${token}`);
      if (response.data.success) {
        setTokenValido(true);
        setUsuario(response.data.data);
      }
    } catch (error) {
      setTokenValido(false);
    } finally {
      setVerificando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/restablecer-password', { token, passwordNuevo: password });
      setCompletado(true);
      toast.success('Contraseña actualizada correctamente');
    } catch (error) {
      toast.error(error.response?.data?.mensaje || 'Error al restablecer contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-teal-600 mx-auto mb-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-600">Verificando enlace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-100">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-300/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-300/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-300/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div className="glass rounded-3xl p-8 shadow-2xl animate-fadeIn">
          {!tokenValido ? (
            // Token inválido o expirado
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">
                Enlace Inválido
              </h1>
              <p className="text-slate-600">
                Este enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.
              </p>
              <Link
                to="/recuperar-password"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-semibold text-white gradient-primary shadow-lg shadow-teal-500/30"
              >
                Solicitar nuevo enlace
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 text-sm"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : completado ? (
            // Contraseña actualizada
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                <CheckCircleIcon className="w-12 h-12 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">
                ¡Contraseña Actualizada!
              </h1>
              <p className="text-slate-600">
                Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white gradient-primary shadow-lg shadow-teal-500/30"
              >
                Iniciar Sesión
              </button>
            </div>
          ) : (
            // Formulario para nueva contraseña
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg shadow-teal-500/30 mb-4">
                  <LockClosedIcon className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Nueva Contraseña
                </h1>
                {usuario && (
                  <p className="text-slate-500 mt-1">
                    Hola, {usuario.nombres}
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-white/50 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirmar Contraseña
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-white/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl font-semibold text-white gradient-primary shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    'Guardar Nueva Contraseña'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Bottom text */}
        <p className="text-center mt-6 text-sm text-slate-500">
          © 2024 Prayaga. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};

export default RestablecerPassword;
