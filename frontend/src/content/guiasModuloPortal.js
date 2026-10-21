/**
 * Textos de guía de uso (sincronizados con docs/manuales-portal/*.md).
 * @typedef {{ titulo: string, intro: string, pasos?: string[], notas?: string[] }} GuiaBloque
 */

/** @type {Record<string, GuiaBloque & { variantes?: Record<string, GuiaBloque> }>} */
export const GUIAS_MODULO_PORTAL = {
  vacaciones: {
    titulo: 'Vacaciones',
    intro: 'Solicitudes de días, calendario del equipo y seguimiento de saldos.',
    pasos: [
      'Revisa tu saldo en Dashboard antes de pedir días largos.',
      'Nueva solicitud: elige fechas, tipo y comentarios; envía al flujo de aprobación.',
      'Mis solicitudes: consulta estados (pendiente jefe/contadora, aprobada, rechazada).',
      'Calendario: vista de vacaciones según permisos.'
    ],
    variantes: {
      aprobaciones: {
        titulo: 'Aprobaciones de vacaciones',
        intro: 'Bandeja para jefes, contadora y administración.',
        pasos: [
          'Revisa solicitudes pendientes de tu rol.',
          'Aprueba o rechaza con observaciones; el solicitante recibe aviso.',
          'Desde Inicio, el KPI de aprobaciones puede llevarte aquí.'
        ]
      },
      'nueva-solicitud': {
        titulo: 'Nueva solicitud',
        intro: 'Registro de días a tomar.',
        pasos: [
          'Completa fechas y tipo de ausencia.',
          'Verifica que no solapes solicitudes activas.',
          'Envía; no podrás editar hasta que respondan.'
        ]
      },
      'estado-vacaciones': {
        titulo: 'Estado de vacaciones',
        intro: 'Vista gerencial / RRHH de saldos y periodos.',
        pasos: ['Filtra por área o empleado según pantalla.', 'Usa exportación si está disponible.']
      }
    }
  },
  permisos: {
    titulo: 'Permisos y descansos',
    intro: 'Registro de permisos y descansos médicos con flujo de aprobación.',
    pasos: [
      'Crea solicitud con fechas y sustento si aplica.',
      'Consulta historial y estado en la misma sección.',
      'Gestión (contadora/admin): aprueba o rechaza en Permisos — Gestión.'
    ],
    variantes: {
      gestion: {
        titulo: 'Permisos — Gestión',
        intro: 'Aprobación de permisos del personal.',
        pasos: ['Filtra pendientes.', 'Aprueba o rechaza; el colaborador ve el resultado en su bandeja.']
      }
    }
  },
  boletas: {
    titulo: 'Boletas de pago',
    intro: 'Consulta documentos de remuneración y firma cuando corresponda.',
    pasos: [
      'Abre el periodo y visualiza o descarga el PDF.',
      'Firma si el botón está habilitado (política Prayaga).',
      'Pendientes de firma pueden aparecer en Para hoy del portal.'
    ],
    variantes: {
      gestion: {
        titulo: 'Gestión de boletas',
        intro: 'Carga y asignación de boletas por RRHH.',
        pasos: [
          'Sube boletas por empleado, mes y año.',
          'Publica para que el colaborador consulte y firme.'
        ]
      }
    }
  },
  asistencia: {
    titulo: 'Reporte de asistencia',
    intro: 'Visualización del reporte de asistencia del personal (Power BI).',
    pasos: [
      'Acceso restringido: admin o cuentas autorizadas.',
      'Usa pantalla completa o abrir en nueva pestaña si el embed es lento.',
      'Para habilitar acceso, solicita módulo asistencia en administración de usuarios.'
    ]
  },
  reembolsos: {
    titulo: 'Reintegros / reembolsos',
    intro: 'Solicitud de reintegro de gastos con comprobantes.',
    pasos: [
      'Nueva solicitud: concepto, monto, método de pago y adjuntos.',
      'Indica RUC y N° de documento según el comprobante (icono de ayuda junto al campo).',
      'Sigue el estado hasta aprobación contable/jefe.'
    ],
    variantes: {
      gestion: {
        titulo: 'Gestión de reembolsos',
        intro: 'Bandeja de aprobación para administradores y aprobadores.',
        pasos: [
          'Filtra pendientes y revisa comprobantes.',
          'Aprueba, observa o rechaza con motivo.'
        ]
      }
    }
  },
  'rendicion-presupuesto': {
    titulo: 'Rendición de presupuesto',
    intro: 'Solicitud de presupuesto (Magali) y luego rendición de gastos vinculada.',
    pasos: [
      'Paso 1: Solicitud de presupuesto → envío a aprobación de gerencia.',
      'Paso 2: Con presupuesto aprobado, registra cada gasto seleccionando la solicitud.',
      'Gestión: aprueba presupuestos y rendiciones; depósitos en caja rendición.'
    ],
    variantes: {
      gestion: {
        titulo: 'Gestión rendición presupuesto',
        intro: 'Revisión y aprobación (admin).',
        pasos: ['Revisa rendiciones enviadas.', 'Aprueba o devuelve con observaciones.']
      }
    }
  },
  'caja-chica': {
    titulo: 'Rendición caja chica',
    intro: 'Reporte mensual: ingresos manuales y egresos desde reintegros aprobados.',
    pasos: [
      'Elige mes y año.',
      'Registra ingresos y revisa egresos del periodo.',
      'Cuadra totales antes de cerrar el mes con contabilidad.'
    ]
  },
  'caja-rendicion': {
    titulo: 'Rendición presupuesto (depósitos)',
    intro: 'Comprobantes de depósito de rendiciones ya aprobadas.',
    pasos: [
      'Lista rendiciones aprobadas pendientes de depósito.',
      'Registra fecha, monto y adjunta comprobante.',
      'Guarda para trazabilidad del cierre mensual.'
    ]
  },
  proveedores: {
    titulo: 'Gestión de proveedores',
    intro: 'Catálogo, evaluación de nuevos proveedores y reevaluación.',
    pasos: [
      'Lista: alta y edición de proveedores (RUC, contactos).',
      'Evaluación: compara candidatos y registra ganador en lista.',
      'Solicitudes pendientes: convierte pedidos internos en evaluación.',
      'Reevaluación: seguimiento de proveedores afiliados.'
    ]
  },
  'solicitud-cotizacion': {
    titulo: 'Solicitud de cotización',
    intro: 'Pedido comercial previo a la cotización formal en presales.',
    pasos: [
      'Nueva solicitud: proyecto, cliente, contexto y responsable (obligatorio al enviar).',
      'Guardar borrador o Enviar al equipo; correo al responsable elegido.',
      'Anular envío o eliminar borrador según estado.',
      'El responsable crea la cotización desde el módulo Cotizaciones.'
    ]
  },
  cotizaciones: {
    titulo: 'Cotizaciones',
    intro: 'Elaboración comercial con actividades, costos, propuesta y versiones.',
    pasos: [
      'Bandeja: crear cotización desde solicitudes enviadas o rechazar con motivo.',
      'Editor: pestañas General, Actividades (% 100), Costos, Propuesta, Versiones.',
      'Guardar sube versión automáticamente si hubo cambios (queda editado por).',
      'Restaurar versión anterior desde historial.'
    ]
  },
  'cierre-negocio': {
    titulo: 'Cierre de negocio',
    intro: 'Seguimiento post-venta vinculado a cotización cuando aplica.',
    pasos: [
      'Nuevo cierre: desde cotización final o histórico manual.',
      'Vistas: reporte, actividades, cronograma, hojas de costo, editar datos.',
      'Eliminar cierre es irreversible; confirma en el diálogo.'
    ]
  },
  'comisiones-por-pagar': {
    titulo: 'Comisiones por pagar',
    intro: 'Seguimiento por vendedor, cliente y cuotas de pago.',
    pasos: [
      'Selecciona un registro para ver cuotas (1er, 2do pago…).',
      'Administradores: alta/edición de encabezado y pagos.',
      'Consulta factura, fechas de emisión y pago en el detalle.'
    ]
  },
  'consumo-fabric': {
    titulo: 'Consumo Microsoft Fabric',
    intro: 'Cruce reporte PAYG con montos mensuales por cliente.',
    pasos: [
      'Sube archivo PAYG de Microsoft para generar reporte visual.',
      'Registra montos por cliente/mes/año en la pestaña Montos.',
      'Exporta Excel o PDF del reporte abierto.'
    ]
  },
  'control-proyectos': {
    titulo: 'Bolsa de horas',
    intro: 'Proyectos, registro de actividades y reportes de horas.',
    pasos: [
      'Busca proyecto y registra actividad (inicio/fin o horas, consultores).',
      'Algunas actividades requieren aprobación del gestor.',
      'Reportes: dashboard, por proyecto, actividades y locadores (enlace en portal).'
    ],
    variantes: {
      reportes: {
        titulo: 'Reportes — Bolsa de horas',
        intro: 'Análisis de horas y capacidad.',
        pasos: [
          'Dashboard: resumen y horas por mes.',
          'Navega entre proyectos, actividades y locadores con el menú de reportes.'
        ]
      },
      'admin-config': {
        titulo: 'Configuración bolsa de horas',
        intro: 'Parámetros administrativos (solo admin).',
        pasos: ['Costo hora por proyecto o catálogo de locadores según pantalla.']
      }
    }
  },
  'solicitudes-registro': {
    titulo: 'Solicitudes de registro',
    intro: 'Aprobación de cuentas nuevas del formulario público.',
    pasos: [
      'Revisa datos del solicitante en pendientes.',
      'Aprobar: asigna rol y opcionalmente jefe directo; se envían credenciales por correo.',
      'Rechazar: motivo obligatorio.'
    ]
  },
  'archivo-respaldos': {
    titulo: 'Archivo / respaldos',
    intro: 'Copias Excel legibles y volcado SQL de la base de datos.',
    pasos: [
      'Respaldos automáticos 08:30 y 17:30 (hora Perú).',
      'Descarga Excel (auditoría) o SQL (solo TI autorizado).',
      'Respaldo manual: botones mañana/tarde si necesitas copia fuera de horario.'
    ]
  },
  'administracion-usuarios': {
    titulo: 'Administración de usuarios',
    intro: 'Cuentas, contraseñas y módulos visibles en el portal.',
    pasos: [
      'Detalle por pestañas: Cuenta, Acceso a módulos, Vacaciones ganadas.',
      'Activa o desactiva cada módulo (RESTRINGIDO en Inicio).',
      'Restablecer contraseña, bloquear o eliminar según política interna.'
    ]
  },
  'portal-inicio': {
    titulo: 'Portal Prayaga Interno',
    intro: 'Navegación general, notificaciones, búsqueda y acceso a módulos.',
    pasos: [
      'Use el menú lateral o las áreas en Inicio para abrir cada módulo.',
      'La campana y los KPIs muestran pendientes y accesos rápidos.',
      'En cada módulo: Guía rápida, Manual completo y descarga PDF.',
      'Módulos RESTRINGIDO requieren activación en Administración de usuarios.'
    ]
  }
};

/**
 * @param {string} moduloId
 * @param {string} [variant]
 * @returns {GuiaBloque | null}
 */
export function obtenerGuiaModulo(moduloId, variant) {
  const base = GUIAS_MODULO_PORTAL[moduloId];
  if (!base) return null;
  const v = variant && base.variantes?.[variant];
  if (v) {
    return {
      titulo: v.titulo || base.titulo,
      intro: v.intro || base.intro,
      pasos: v.pasos ?? base.pasos,
      notas: v.notas ?? base.notas
    };
  }
  return {
    titulo: base.titulo,
    intro: base.intro,
    pasos: base.pasos,
    notas: base.notas
  };
}

/** @param {string} pathname */
export function variantGuiaVacaciones(pathname) {
  const p = pathname || '';
  if (p.includes('/aprobaciones')) return 'aprobaciones';
  if (p.includes('/nueva-solicitud')) return 'nueva-solicitud';
  if (p.includes('/estado-vacaciones')) return 'estado-vacaciones';
  return undefined;
}
