import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import LogoTransparente from './LogoTransparente';

/**
 * Shell visual alineado al portal (fondo claro, header blanco, acentos teal).
 */
export default function PortalAdminShell({ titulo, subtitulo, children, acciones }) {
  return (
    <div className="min-h-screen bg-[#f4f7fa] text-slate-800">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-4">
          <Link
            to="/portal"
            className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Portal
          </Link>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <LogoTransparente src="/isotipo-prayaga.png" alt="Prayaga" className="h-8 w-8 shrink-0 hidden sm:block" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{titulo}</h1>
              {subtitulo ? <p className="text-sm text-slate-500 truncate">{subtitulo}</p> : null}
            </div>
          </div>
          {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
