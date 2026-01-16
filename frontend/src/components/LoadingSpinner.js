import React from 'react';

const LoadingSpinner = ({ size = 'lg', text = 'Cargando...' }) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-50">
      <div className="relative">
        <div className={`${sizeClasses[size]} animate-spin`}>
          <div className="absolute inset-0 rounded-full border-4 border-teal-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-500"></div>
        </div>
      </div>
      {text && (
        <p className="mt-4 text-slate-600 font-medium animate-pulse">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;


