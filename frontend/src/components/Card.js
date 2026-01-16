import React from 'react';

export const Card = ({ children, className = '', hover = false, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-2xl p-6 shadow-sm border border-slate-100 ${
      hover ? 'hover:shadow-md hover:border-teal-200 transition-all cursor-pointer' : ''
    } ${className}`}
  >
    {children}
  </div>
);

export const StatCard = ({ icon: Icon, label, value, trend, color = 'teal' }) => {
  const colorClasses = {
    teal: 'from-teal-500 to-cyan-500 shadow-teal-500/30',
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/30',
    emerald: 'from-emerald-500 to-green-500 shadow-emerald-500/30',
    rose: 'from-rose-500 to-pink-500 shadow-rose-500/30',
    violet: 'from-violet-500 to-purple-500 shadow-violet-500/30',
    blue: 'from-blue-500 to-indigo-500 shadow-blue-500/30'
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
};

export default Card;


