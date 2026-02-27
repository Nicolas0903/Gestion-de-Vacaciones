import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('¡Bienvenido!');
      navigate('/portal');
    } else {
      toast.error(result.mensaje);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col items-center justify-center relative overflow-hidden gradient-primary rounded-r-[2.5rem] p-10">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 border border-white/30 rounded-full" />
          <div className="absolute bottom-20 right-10 w-60 h-60 border border-white/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-white/10 rounded-full" />
        </div>

        <div className="relative z-10 text-center max-w-sm">
          <h1 className="text-4xl font-bold text-white mb-8">PRAYAGA</h1>

          {/* Illustration */}
          <div className="mb-8">
            <svg viewBox="0 0 400 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs mx-auto drop-shadow-lg">
              <rect x="40" y="80" width="320" height="160" rx="12" fill="white" fillOpacity="0.15"/>
              <rect x="60" y="100" width="100" height="70" rx="8" fill="white" fillOpacity="0.25"/>
              <rect x="60" y="108" width="80" height="4" rx="2" fill="white" fillOpacity="0.5"/>
              <rect x="60" y="118" width="60" height="4" rx="2" fill="white" fillOpacity="0.4"/>
              <rect x="60" y="128" width="90" height="4" rx="2" fill="white" fillOpacity="0.3"/>
              <rect x="60" y="142" width="40" height="18" rx="4" fill="#2dd4bf" fillOpacity="0.6"/>
              <rect x="180" y="100" width="160" height="70" rx="8" fill="white" fillOpacity="0.2"/>
              <rect x="195" y="115" width="30" height="40" rx="3" fill="#5eead4" fillOpacity="0.5"/>
              <rect x="235" y="105" width="30" height="50" rx="3" fill="#99f6e4" fillOpacity="0.5"/>
              <rect x="275" y="125" width="30" height="30" rx="3" fill="#5eead4" fillOpacity="0.4"/>
              <rect x="315" y="110" width="15" height="45" rx="3" fill="#99f6e4" fillOpacity="0.3"/>
              <circle cx="110" cy="55" r="22" fill="white" fillOpacity="0.2"/>
              <path d="M110 40 L110 55 L122 55" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.6"/>
              <circle cx="200" cy="30" r="8" fill="#fbbf24" fillOpacity="0.7"/>
              <circle cx="200" cy="30" r="4" fill="#fbbf24" fillOpacity="0.4"/>
              {/* Person 1 */}
              <circle cx="100" cy="200" r="10" fill="#fde68a" fillOpacity="0.8"/>
              <rect x="90" y="212" width="20" height="24" rx="6" fill="#14b8a6" fillOpacity="0.6"/>
              {/* Person 2 */}
              <circle cx="200" cy="195" r="12" fill="#fde68a" fillOpacity="0.8"/>
              <rect x="188" y="209" width="24" height="28" rx="6" fill="#0d9488" fillOpacity="0.6"/>
              {/* Person 3 */}
              <circle cx="300" cy="200" r="10" fill="#fde68a" fillOpacity="0.8"/>
              <rect x="290" y="212" width="20" height="24" rx="6" fill="#14b8a6" fillOpacity="0.5"/>
              {/* Plants */}
              <ellipse cx="50" cy="235" rx="12" ry="18" fill="#34d399" fillOpacity="0.4"/>
              <ellipse cx="355" cy="232" rx="10" ry="15" fill="#34d399" fillOpacity="0.35"/>
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">
            Portal de Recursos Humanos
          </h2>
          <p className="text-teal-100 text-sm leading-relaxed mb-8">
            Gestiona vacaciones, boletas de pago, permisos y más desde una sola plataforma. Todo lo que necesitas para la administración de tu equipo.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            {['Vacaciones', 'Boletas de pago', 'Permisos', 'Reportes'].map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/15 text-white backdrop-blur-sm border border-white/20"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-teal-300" />
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fadeIn">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-lg shadow-teal-500/30 mb-3">
              <span className="text-2xl font-bold text-white">P</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              PRAYAGA
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center lg:text-left">
            Iniciar Sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Usuario
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Usuario"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-white text-sm"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all bg-white pr-12 text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              <label htmlFor="remember-me" className="ml-2 text-sm text-slate-600 cursor-pointer select-none">
                Recordar la sesión
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-teal-500/20"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="mt-6 space-y-3 text-center">
            <Link
              to="/recuperar-password"
              className="block text-sm text-teal-600 hover:text-teal-700 hover:underline transition-colors font-medium"
            >
              ¿Olvidaste tu contraseña?
            </Link>
            <p className="text-sm text-slate-500">
              ¿No tienes una cuenta?{' '}
              <Link
                to="/crear-cuenta"
                className="text-teal-600 hover:text-teal-700 hover:underline transition-colors font-medium"
              >
                Crea una aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


