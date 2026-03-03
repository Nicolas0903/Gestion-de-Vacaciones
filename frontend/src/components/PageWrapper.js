import React from 'react';

const PageWrapper = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="glass rounded-2xl lg:rounded-3xl p-6 lg:p-8 shadow-xl animate-fadeIn">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageWrapper;
