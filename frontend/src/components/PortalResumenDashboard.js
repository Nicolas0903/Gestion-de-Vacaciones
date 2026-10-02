import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CalendarDaysIcon,
  BanknotesIcon,
  WalletIcon,
  BriefcaseIcon,
  BellIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  ChartBarSquareIcon
} from '@heroicons/react/24/outline';
import {
  asistenteIaService,
  boletaService,
  controlProyectosService,
  notificacionService,
  periodoService,
  permisoService,
  proveedoresService,
  reembolsoService,
  solicitudService
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { parseFechaSegura } from '../utils/dateUtils';

const fmtNum = (n) =>
  Number.isFinite(Number(n)) ? Number(n).toLocaleString('es-PE', { maximumFractionDigits: 1 }) : '0';

function saludoHorario() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function KpiCard({ icon: Icon, color, valor, etiqueta, hint }) {
  const colores = {
    teal: 'from-teal-500 to-cyan-500 shadow-teal-500/25',
    blue: 'from-sky-500 to-blue-600 shadow-sky-500/25',
    rose: 'from-rose-500 to-pink-600 shadow-rose-500/25',
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/25',
    violet: 'from-violet-600 to-purple-700 shadow-violet-500/25',
    emerald: 'from-emerald-500 to-teal-600 shadow-emerald-500/25'
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colores[color] || colores.teal} shadow-lg flex items-center justify-center shrink-0`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tabular-nums leading-none">{valor}</p>
          <p className="text-sm font-medium text-slate-700 mt-1">{etiqueta}</p>
          {hint ? <p className="text-xs text-slate-500 mt-0.5 leading-snug">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}

function tiempoRelativo(fechaStr) {
  if (!fechaStr) return '';
  try {
    return formatDistanceToNow(parseFechaSegura(fechaStr), { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

export default function PortalResumenDashboard({
  notifCount,
  onAbrirNotificaciones,
  modulosVisibles = [],
  onBuscarModulo
}) {
  const navigate = useNavigate();
  const { usuario, puedeAprobar, puedeAccederModuloPortal } = useAuth();
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState({
    resumenVac: null,
    pendientesAprob: [],
    pendientesIa: { total: 0, categorias: [] },
    actividad: [],
    tareas: [],
    bolsa: null,
    solicitudesActivas: 0,
    boletasSinFirmar: 0
  });

  const cargar = useCallback(async () => {
    setCargando(true);
    const next = {
      resumenVac: null,
      pendientesAprob: [],
      pendientesIa: { total: 0, categorias: [] },
      actividad: [],
      tareas: [],
      bolsa: null,
      solicitudesActivas: 0,
      boletasSinFirmar: 0
    };

    const tareas = [];

    const jobs = [];

    if (puedeAccederModuloPortal('vacaciones')) {
      jobs.push(
        periodoService.miResumen().then((r) => {
          next.resumenVac = r.data?.data || null;
        })
      );
      jobs.push(
        solicitudService.listarMias().then((r) => {
          const lista = r.data?.data || [];
          const activas = lista.filter((s) =>
            ['borrador', 'pendiente_jefe', 'pendiente_contadora'].includes(s.estado)
          );
          next.solicitudesActivas = activas.length;
        })
      );
    }

    jobs.push(
      notificacionService.listar(false).then((r) => {
        next.actividad = (r.data?.data || []).slice(0, 5);
      })
    );

    if (puedeAprobar()) {
      jobs.push(
        solicitudService.listarPendientes().then((r) => {
          next.pendientesAprob = r.data?.data || [];
          (r.data?.data || []).slice(0, 2).forEach((s) => {
            tareas.push({
              id: `vac-${s.id}`,
              icono: CalendarDaysIcon,
              color: 'bg-teal-50 text-teal-700',
              titulo: 'Vacaciones',
              descripcion: `Solicitud de ${s.nombres || ''} ${s.apellidos || ''}`.trim(),
              accion: 'Aprobar o rechazar',
              to: '/vacaciones/aprobaciones',
              tiempo: s.created_at || s.fecha_solicitud
            });
          });
        })
      );
      jobs.push(
        asistenteIaService.pendientes().then((r) => {
          next.pendientesIa = r.data?.data || { total: 0, categorias: [] };
        })
      );
      if (puedeAccederModuloPortal('permisos')) {
        jobs.push(
          permisoService.listarPendientes().then((r) => {
            (r.data?.data || []).slice(0, 1).forEach((p) => {
              tareas.push({
                id: `perm-${p.id}`,
                icono: ClipboardDocumentCheckIcon,
                color: 'bg-sky-50 text-sky-700',
                titulo: 'Permiso / descanso',
                descripcion: `${p.nombres || ''} ${p.apellidos || ''} · ${p.tipo || 'permiso'}`.trim(),
                accion: 'Revisar solicitud',
                to: '/permisos/gestion',
                tiempo: p.created_at
              });
            });
          })
        );
      }
      if (puedeAccederModuloPortal('reembolsos')) {
        jobs.push(
          reembolsoService.pendientes().then((r) => {
            (r.data?.data || []).slice(0, 1).forEach((rb) => {
              tareas.push({
                id: `reemb-${rb.id}`,
                icono: BanknotesIcon,
                color: 'bg-blue-50 text-blue-700',
                titulo: 'Rendición de gastos',
                descripcion: `${rb.nombres || ''} ${rb.apellidos || ''} · S/ ${fmtNum(rb.monto)}`.trim(),
                accion: 'Revisar sustento',
                to: '/reembolsos/gestion',
                tiempo: rb.created_at
              });
            });
          })
        );
      }
      if (puedeAccederModuloPortal('proveedores')) {
        jobs.push(
          proveedoresService.listarSolicitudesPendientes({ estado: 'pendiente' }).then((r) => {
            (r.data?.data || []).slice(0, 1).forEach((pv) => {
              tareas.push({
                id: `prov-${pv.id}`,
                icono: BuildingStorefrontIcon,
                color: 'bg-orange-50 text-orange-700',
                titulo: 'Proveedor',
                descripcion: pv.detalle || pv.codigo || 'Nuevo proveedor pendiente de alta',
                accion: 'Validar registro',
                to: '/proveedores',
                tiempo: pv.created_at
              });
            });
          })
        );
      }
    }

    if (puedeAccederModuloPortal('boletas')) {
      jobs.push(
        boletaService.misBoletas().then((r) => {
          const sinFirmar = (r.data?.data || []).filter((b) => !b.firmada);
          next.boletasSinFirmar = sinFirmar.length;
          if (sinFirmar[0]) {
            tareas.push({
              id: `bol-${sinFirmar[0].id}`,
              icono: DocumentTextIcon,
              color: 'bg-fuchsia-50 text-fuchsia-700',
              titulo: 'Boleta de pago',
              descripcion: `${sinFirmar.length} documento${sinFirmar.length === 1 ? '' : 's'} pendiente${sinFirmar.length === 1 ? '' : 's'} de firma`,
              accion: 'Ver y firmar',
              to: '/boletas',
              tiempo: sinFirmar[0].created_at
            });
          }
        })
      );
    }

    if (puedeAccederModuloPortal('control-proyectos')) {
      jobs.push(
        controlProyectosService.reporteDashboard().then((r) => {
          if (r.data?.success) next.bolsa = r.data.data;
        })
      );
      jobs.push(
        controlProyectosService.listarPendientesAprobacionActividades().then((r) => {
          (r.data?.data || []).slice(0, 1).forEach((a) => {
            tareas.push({
              id: `act-${a.id}`,
              icono: BriefcaseIcon,
              color: 'bg-purple-50 text-purple-700',
              titulo: 'Bolsa de horas',
              descripcion: `${a.nombre_consultor || 'Consultor'} · ${a.nombre_proyecto || 'Proyecto'}`,
              accion: 'Revisar actividad',
              to: '/control-proyectos',
              tiempo: a.created_at
            });
          });
        })
      );
    }

    await Promise.allSettled(jobs);
    next.tareas = tareas.slice(0, 5);
    setDatos(next);
    setCargando(false);
  }, [puedeAprobar, puedeAccederModuloPortal]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const pctBolsa = useMemo(() => {
    const asignadas = Number(datos.bolsa?.resumen?.horas_bolsa_total) || 0;
    const usadas = Number(datos.bolsa?.resumen?.horas_registradas_total) || 0;
    if (!asignadas) return null;
    return Math.min(100, Math.round((usadas / asignadas) * 100));
  }, [datos.bolsa]);

  const totalPendientes =
    datos.pendientesIa.total > 0 ? datos.pendientesIa.total : datos.tareas.length;

  const kpis = useMemo(() => {
    const items = [];
    if (puedeAprobar() || datos.pendientesIa.total > 0) {
      items.push({
        key: 'aprobaciones',
        icon: ClipboardDocumentCheckIcon,
        color: 'teal',
        valor: datos.pendientesIa.total || datos.pendientesAprob.length,
        etiqueta: 'Aprobaciones pendientes',
        hint:
          datos.pendientesIa.total > 0
            ? `${datos.pendientesIa.categorias.filter((c) => c.cantidad > 0).length} categorías con pendientes`
            : 'Requieren tu atención'
      });
    }
    if (puedeAccederModuloPortal('vacaciones') && datos.resumenVac) {
      items.push({
        key: 'vacaciones',
        icon: CalendarDaysIcon,
        color: 'blue',
        valor: datos.resumenVac.total_pendientes ?? 0,
        etiqueta: 'Días de vacaciones',
        hint: `${datos.solicitudesActivas} solicitud${datos.solicitudesActivas === 1 ? '' : 'es'} activa${datos.solicitudesActivas === 1 ? '' : 's'}`
      });
    }
    items.push({
      key: 'notif',
      icon: BellIcon,
      color: 'rose',
      valor: notifCount,
      etiqueta: 'Notificaciones',
      hint: notifCount > 0 ? 'Sin leer en el portal' : 'Estás al día'
    });
    if (pctBolsa != null) {
      items.push({
        key: 'bolsa',
        icon: ChartBarSquareIcon,
        color: 'amber',
        valor: `${pctBolsa}%`,
        etiqueta: 'Bolsa de horas',
        hint: 'Consumo vs. horas asignadas'
      });
    } else if (items.length < 4 && puedeAccederModuloPortal('reembolsos')) {
      items.push({
        key: 'solicitudes',
        icon: BanknotesIcon,
        color: 'violet',
        valor: datos.solicitudesActivas,
        etiqueta: 'Solicitudes activas',
        hint: 'Vacaciones y trámites en curso'
      });
    }
    return items.slice(0, 4);
  }, [datos, notifCount, pctBolsa, puedeAprobar, puedeAccederModuloPortal]);

  const accionesRapidas = useMemo(
    () =>
      [
        puedeAccederModuloPortal('vacaciones') && {
          id: 'vac',
          label: 'Solicitar vacaciones',
          to: '/vacaciones/nueva-solicitud',
          icon: CalendarDaysIcon,
          color: 'from-teal-500 to-emerald-600'
        },
        puedeAccederModuloPortal('reembolsos') && {
          id: 'reemb',
          label: 'Registrar reintegro',
          to: '/reembolsos',
          icon: BanknotesIcon,
          color: 'from-sky-500 to-blue-600'
        },
        (puedeAccederModuloPortal('caja-chica') || puedeAccederModuloPortal('caja-rendicion')) && {
          id: 'caja',
          label: 'Rendir caja',
          to: puedeAccederModuloPortal('caja-chica') ? '/caja-chica' : '/caja-rendicion',
          icon: WalletIcon,
          color: 'from-amber-500 to-orange-600'
        },
        puedeAccederModuloPortal('control-proyectos') && {
          id: 'horas',
          label: 'Registrar horas',
          to: '/control-proyectos',
          icon: BriefcaseIcon,
          color: 'from-violet-600 to-purple-700'
        }
      ].filter(Boolean),
    [puedeAccederModuloPortal]
  );

  const accesosFrecuentes = modulosVisibles.slice(0, 4);

  const horasPorMes = (datos.bolsa?.horas_por_mes || []).slice(-6);
  const maxHorasMes = Math.max(...horasPorMes.map((r) => Number(r.horas) || 0), 1);

  return (
    <div className="space-y-5 mb-8">
      {/* Banner bienvenida */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c2340] via-[#0f3460] to-[#0d9488] text-white p-6 sm:p-8 shadow-lg">
        <div className="absolute top-0 right-0 w-48 h-48 bg-teal-400/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <p className="text-teal-200/90 text-sm font-medium mb-1">Portal interno · Control center</p>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {saludoHorario()}, {usuario?.nombres}
            </h2>
            <p className="text-slate-200/90 mt-2 text-sm sm:text-base max-w-xl">
              Prioriza lo importante y entra a tus módulos desde un solo lugar.
            </p>
          </div>
          {onBuscarModulo && (
            <div className="relative w-full lg:max-w-md shrink-0">
              <input
                type="search"
                placeholder="Buscar módulo, documento o acción…"
                onChange={(e) => onBuscarModulo(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/95 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      {accionesRapidas.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {accionesRapidas.map((a) => {
            const Ic = a.icon;
            return (
              <Link
                key={a.id}
                to={a.to}
                className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center shrink-0 shadow-md`}
                >
                  <Ic className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-800 leading-tight">{a.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {cargando
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-white border border-slate-100 animate-pulse" />
            ))
          : kpis.map((k) => <KpiCard key={k.key} {...k} />)}
      </div>

      {/* Para hoy + actividad / gráfico */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-5">
        <section className="xl:col-span-2 rounded-2xl bg-white border border-slate-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Para hoy</h3>
              <p className="text-sm text-slate-500 mt-0.5">Acciones que requieren tu atención.</p>
            </div>
            {totalPendientes > 0 && (
              <span className="shrink-0 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">
                {totalPendientes}
              </span>
            )}
          </div>

          {cargando ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-50 animate-pulse" />
              ))}
            </div>
          ) : datos.tareas.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">
              No tienes pendientes urgentes. Buen trabajo.
            </div>
          ) : (
            <ul className="space-y-2">
              {datos.tareas.map((t) => {
                const Ic = t.icono;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => navigate(t.to)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors text-left group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.color}`}>
                        <Ic className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{t.titulo}</p>
                        <p className="text-xs text-slate-500 truncate">{t.descripcion}</p>
                      </div>
                      <div className="text-right shrink-0 hidden sm:block">
                        <span className="text-xs font-semibold text-teal-600 group-hover:underline">{t.accion}</span>
                        {t.tiempo ? (
                          <p className="text-[10px] text-slate-400 mt-0.5">{tiempoRelativo(t.tiempo)}</p>
                        ) : null}
                      </div>
                      <ChevronRightIcon className="w-4 h-4 text-slate-300 sm:hidden shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {!cargando && puedeAprobar() && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
              <Link to="/vacaciones/aprobaciones" className="text-sm font-semibold text-teal-600 hover:underline inline-flex items-center gap-1">
                Ver todas las tareas
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>

        <div className="space-y-4">
          {/* Pendientes resumen */}
          <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Pendientes</h3>
              <span className="w-8 h-8 rounded-full bg-rose-500 text-white text-sm font-bold flex items-center justify-center">
                {totalPendientes}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              {datos.pendientesIa.categorias
                .filter((c) => c.cantidad > 0)
                .map((c) => `${c.cantidad} ${c.etiqueta.toLowerCase()}`)
                .join(' · ') || 'Revisión de tareas y notificaciones'}
            </p>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all"
                style={{
                  width: `${Math.min(100, totalPendientes > 0 ? Math.max(12, 100 - totalPendientes * 8) : 100)}%`
                }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Avance estimado del mes</p>
          </section>

          {/* Dato rápido / mini gráfico bolsa */}
          {horasPorMes.length > 0 ? (
            <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Horas registradas</h3>
              <p className="text-xs text-slate-500 mb-4">Últimos meses · Bolsa de horas</p>
              <div className="flex items-end gap-1.5 h-24">
                {horasPorMes.map((row) => {
                  const h = Number(row.horas) || 0;
                  const pct = Math.max(4, Math.round((h / maxHorasMes) * 100));
                  return (
                    <div key={row.mes} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <div className="w-full flex items-end justify-center h-16">
                        <div
                          className="w-full max-w-[2rem] rounded-t-md bg-gradient-to-t from-teal-600 to-cyan-400"
                          style={{ height: `${pct}%` }}
                          title={`${row.mes}: ${fmtNum(h)} h`}
                        />
                      </div>
                      <span className="text-[9px] text-slate-400 truncate w-full text-center">
                        {row.mes
                          ? format(new Date(`${row.mes}-01`), 'MMM', { locale: es })
                          : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
              {pctBolsa != null && (
                <p className="mt-3 text-lg font-bold text-teal-700">{pctBolsa}% consumo total</p>
              )}
            </section>
          ) : datos.resumenVac ? (
            <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Dato rápido</h3>
              <p className="text-2xl font-bold text-teal-700 mt-2">
                {datos.resumenVac.total_pendientes ?? 0} días
              </p>
              <p className="text-sm text-slate-500">de vacaciones disponibles</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">
                {datos.resumenVac.total_gozados ?? 0} gozados · {datos.resumenVac.total_ganados ?? 0} ganados
              </p>
            </section>
          ) : null}

          {/* Accesos frecuentes */}
          {accesosFrecuentes.length > 0 && (
            <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-0.5">Accesos frecuentes</h3>
              <p className="text-xs text-slate-500 mb-3">Tus módulos más usados</p>
              <ul className="space-y-1">
                {accesosFrecuentes.map((m) => {
                  const Ic = m.icono;
                  let hint = m.metricHint;
                  if (m.id === 'vacaciones-permisos' && datos.resumenVac) {
                    hint = `${datos.resumenVac.total_pendientes ?? 0} días disponibles`;
                  }
                  if (m.id === 'control-proyectos' && pctBolsa != null) {
                    hint = `${pctBolsa}% consumo del mes`;
                  }
                  return (
                    <li key={m.id}>
                      <Link
                        to={m.link || m.accionTo || '/portal'}
                        className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors group"
                      >
                        <div
                          className={`w-9 h-9 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center shrink-0 shadow-sm`}
                        >
                          <Ic className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{m.titulo}</p>
                          {hint ? <p className="text-[11px] text-slate-500 truncate">{hint}</p> : null}
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-teal-500 shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>

      {/* Actividad reciente */}
      {datos.actividad.length > 0 && (
        <section className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Tu actividad</h3>
              <p className="text-sm text-slate-500">Lo último y lo pendiente, en contexto.</p>
            </div>
            <button
              type="button"
              onClick={onAbrirNotificaciones}
              className="text-sm font-semibold text-teal-600 hover:underline"
            >
              Ver todo
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {datos.actividad.map((n) => (
              <li key={n.id} className="py-3 flex items-start gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.leida ? 'bg-slate-300' : 'bg-teal-500'}`}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.leida ? 'text-slate-600' : 'font-semibold text-slate-900'}`}>
                    {n.titulo}
                  </p>
                  <p className="text-xs text-slate-500 line-clamp-1">{n.mensaje}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{tiempoRelativo(n.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
