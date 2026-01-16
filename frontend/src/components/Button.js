import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-teal-500/30 hover:shadow-teal-500/40 focus:ring-teal-500',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400',
    outline: 'border-2 border-teal-500 text-teal-600 hover:bg-teal-50 focus:ring-teal-500',
    danger: 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/30 focus:ring-rose-500',
    success: 'bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-emerald-500/30 focus:ring-emerald-500',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-400'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2'
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Cargando...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-5 h-5" />}
          {children}
          {Icon && iconPosition === 'right' && <Icon className="w-5 h-5" />}
        </>
      )}
    </button>
  );
};

export default Button;


