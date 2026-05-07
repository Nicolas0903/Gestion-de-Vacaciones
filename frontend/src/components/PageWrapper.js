import React from 'react';

/**
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {boolean} [props.wide] — columnas/tablas tipo BI (hasta ~120rem menos márgenes)
 */
const PageWrapper = ({ children, wide = false }) => {
  const outerCls = wide
    ? 'max-w-[min(120rem,calc(100vw-2rem))] mx-auto px-3 sm:px-4 lg:px-6 py-6 lg:py-8'
    : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8';
  const glassPad = wide ? 'p-4 sm:p-5 lg:p-7' : 'p-6 lg:p-8';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className={outerCls}>
        <div className={`glass rounded-2xl lg:rounded-3xl ${glassPad} shadow-xl animate-fadeIn`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageWrapper;
