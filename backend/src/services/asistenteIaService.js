/**
 * Asistente IA del Admin (Nivel 1: solo lectura).
 *
 * Usa Groq con el modelo Llama 3.3 70B y tool-calling estilo OpenAI.
 * Tier gratuito generoso (1.000 req/día, 30 req/min) y ultra rápido.
 *
 * Importante:
 *  - Solo el rol `admin` debe poder invocar este servicio (la ruta ya valida eso).
 *  - Las funciones registradas en `HANDLERS` SOLO LEEN datos (no modifican).
 *  - Si más adelante se agrega Nivel 2 (escritura), las funciones de escritura
 *    deberán pedir confirmación al usuario antes de ejecutar.
 */

const {
  Empleado,
  PeriodoVacaciones,
  PermisoDescanso,
  SolicitudVacaciones,
  SolicitudRegistro,
  Reembolso,
  BoletaPago,
  CajaChica,
  ControlProyecto
} = require('../models');
const { pool } = require('../config/database');

let _client = null;
function obtenerCliente() {
  if (_client) return _client;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Falta la variable de entorno GROQ_API_KEY. Obtené una gratis en https://console.groq.com/keys'
    );
  }
  const Groq = require('groq-sdk');
  _client = new Groq({ apiKey });
  return _client;
}

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/* ============================================================
 * SYSTEM PROMPT
 * ============================================================ */

function buildSystemPrompt() {
  const ahora = new Date();
  const fechaIso = ahora.toISOString().slice(0, 10);
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const fechaHumana = `${ahora.getDate()} de ${meses[ahora.getMonth()]} de ${ahora.getFullYear()}`;
  const primerDiaMes = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-01`;
  const ultDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  return `Eres "Asistente Prayaga", un asistente experto interno para el equipo de administración del sistema de Gestión Integral de Prayaga.

FECHA ACTUAL: ${fechaHumana} (${fechaIso}).
"Este mes" = del ${primerDiaMes} al ${ultDiaMes}.

CONTEXTO DEL SISTEMA:
Plataforma interna donde Prayaga gestiona vacaciones, permisos, descansos médicos, boletas de pago, reembolsos, caja chica, control de proyectos (bolsa de horas) y administración de usuarios. Roles: admin, contadora, jefe_operaciones, colaborador.

REGLA CRÍTICA — USO DE HERRAMIENTAS:
TIENES ACCESO DIRECTO A LA BASE DE DATOS a través de las funciones (tools) que se te proporcionan. SIEMPRE que el usuario pregunte por datos concretos (cantidades, listas, períodos, estados, fechas, nombres, montos), DEBES llamar a la función correspondiente. NUNCA respondas "no tengo acceso a esa información" ni "no tengo datos en tiempo real": SÍ tienes acceso, vía las tools.

MAPEO PREGUNTA → FUNCIÓN:
- "cuántos permisos..." / "permisos del mes" / "permisos médicos" → **listarPermisos**
- "permisos pendientes de aprobar" → **listarPermisosPendientes**
- "días de vacaciones de X" / "períodos de X" → **buscarEmpleado** + **listarPeriodosVacaciones**
- "resumen vacaciones de X" → **buscarEmpleado** + **obtenerResumenVacaciones**
- "solicitudes de vacaciones" → **listarSolicitudesVacaciones**
- "cuántos empleados activos" / "lista de admins" → **listarEmpleadosTodos**
- "qué hay pendiente" / "estado del sistema" → **obtenerContextoSistema**
- "boletas de X" → **buscarEmpleado** + **listarBoletas**
- "reembolsos pendientes" / "reembolsos de X" → **listarReembolsos**
- "caja chica del mes" → **listarPeriodosCajaChica** + **obtenerDetallesCajaChica**
- "proyectos" / "bolsa de horas" → **listarProyectosControl**
- "solicitudes de registro" / "nuevos usuarios" → **listarSolicitudesRegistro**

REGLAS GENERALES:
- Respondes SIEMPRE en español, tono cordial y profesional, conciso.
- Solo consultas información del sistema.
- NUNCA inventes datos. Si necesitas algo, LLAMA A LA FUNCIÓN.
- NUNCA modifiques ni borres (esta versión es solo lectura).
- Si te piden modificar (ej. "actualiza", "elimina", "crea"), responde:
  "Por ahora solo puedo consultar información, todavía no tengo permisos para modificar registros. Esa funcionalidad llegará pronto."
- Si preguntan fuera del dominio, redirige amablemente al tema.

CÓMO TRABAJAR PASO A PASO:
1. Si mencionan un empleado por nombre, llama PRIMERO a "buscarEmpleado". La búsqueda es TOLERANTE a tildes y mayúsculas.
2. Si "buscarEmpleado" devuelve VARIOS, lista los nombres y pregunta cuál.
3. Si devuelve CERO, prueba apellido solo o nombre solo antes de pedir DNI/código.
4. Con el id, llama a la función específica del módulo.
5. Para fechas relativas ("este mes", "esta semana", "ayer"), usa la FECHA ACTUAL ya mencionada y construye fecha_inicio/fecha_fin tú mismo. NO le pidas al usuario que aclare "este mes".
6. Si la pregunta abarca varios módulos, llama varias funciones y resume.

FORMATO DE RESPUESTA:
- TEXTO NATURAL, conversacional. NUNCA uses tablas markdown con caracteres "|" porque no se renderizan bien en el chat.
- Listas con guiones "-" o números "1." "2."
- **Negritas** para destacar nombres, números, fechas.
- Concisas. Si hay muchos datos, resume y ofrece dar más detalle si piden.

EJEMPLOS:

Usuario: "cuántos permisos se registraron este mes?"
→ Llamás listarPermisos({ fecha_inicio: "${primerDiaMes}", fecha_fin: "${ultDiaMes}" })
→ Respondes: "Este mes se registraron **N permisos** (X aprobados, Y pendientes, Z rechazados)..."

Usuario: "días de vacaciones de Nicolás Valdivia"
→ buscarEmpleado({ query: "Nicolás Valdivia" }) → obtenés empleadoId
→ listarPeriodosVacaciones({ empleadoId })
→ Respondes con la lista en viñetas.

Usuario: "qué hay pendiente?"
→ obtenerContextoSistema()
→ Resumen.

NO HAGAS ESTO:
- ❌ "Lo siento, no tengo acceso en tiempo real..."
- ❌ "Te sugiero consultar el módulo X..."
- ❌ Tablas con "|"
- ✅ En cambio: LLAMA A LA FUNCIÓN y responde con datos reales.`;
}

/* ============================================================
 * UTILIDADES
 * ============================================================ */

function _normalizar(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function _num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/* ============================================================
 * HANDLERS — todas las funciones que el modelo puede invocar.
 * SOLO LECTURA. Todas devuelven JSON serializable.
 * ============================================================ */

const HANDLERS = {
  /**
   * Foto general del sistema. Útil cuando el usuario hace preguntas amplias
   * tipo "qué hay pendiente" o "qué módulos tiene el sistema".
   */
  async obtenerContextoSistema() {
    try {
      const [empleadosRows] = await pool.execute(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) AS activos
           FROM empleados`
      );
      const [rolesRows] = await pool.execute(
        `SELECT r.nombre, COUNT(e.id) AS total
           FROM roles r
           LEFT JOIN empleados e ON e.rol_id = r.id AND e.activo = 1
          GROUP BY r.id, r.nombre
          ORDER BY r.nombre`
      );
      const [permisosPend] = await pool.execute(
        `SELECT COUNT(*) AS total FROM permisos_descansos WHERE estado = 'pendiente'`
      );
      const [reembolsosPend] = await pool.execute(
        `SELECT COUNT(*) AS total FROM solicitudes_reembolso WHERE estado IN ('pendiente','observado')`
      );
      const [registroPend] = await pool.execute(
        `SELECT COUNT(*) AS total FROM solicitudes_registro WHERE estado = 'pendiente'`
      );
      return {
        ok: true,
        empleados: {
          total: _num(empleadosRows[0]?.total),
          activos: _num(empleadosRows[0]?.activos)
        },
        roles: rolesRows.map((r) => ({ rol: r.nombre, empleados_activos: _num(r.total) })),
        pendientes: {
          permisos: _num(permisosPend[0]?.total),
          reembolsos: _num(reembolsosPend[0]?.total),
          solicitudes_registro: _num(registroPend[0]?.total)
        },
        modulos: [
          'vacaciones',
          'permisos_y_descansos',
          'boletas_de_pago',
          'reembolsos',
          'caja_chica',
          'control_proyectos_bolsa_horas',
          'solicitudes_registro'
        ]
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // -------- Empleados --------
  async buscarEmpleado({ query, soloActivos = true }) {
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return { ok: false, mensaje: 'El query debe tener al menos 2 caracteres.' };
    }
    const q = query.trim();
    const baseFiltros = soloActivos ? { activo: 1 } : {};

    let lista = await Empleado.listarTodos({ ...baseFiltros, busqueda: q });

    if (!lista || lista.length === 0) {
      const tokens = q.split(/\s+/).map((t) => t.trim()).filter((t) => t.length >= 2);
      if (tokens.length === 0) return { ok: true, total: 0, resultados: [] };

      const mapa = new Map();
      for (const tk of tokens) {
        const parciales = await Empleado.listarTodos({ ...baseFiltros, busqueda: tk });
        for (const e of parciales) mapa.set(e.id, e);
      }
      const tNorm = tokens.map(_normalizar);
      lista = Array.from(mapa.values()).filter((e) => {
        const blob = _normalizar(
          `${e.nombres} ${e.apellidos} ${e.email || ''} ${e.codigo_empleado || ''} ${e.dni || ''}`
        );
        return tNorm.every((tk) => blob.includes(tk));
      });
    }

    return {
      ok: true,
      total: lista.length,
      resultados: lista.slice(0, 10).map((e) => ({
        id: e.id,
        codigo: e.codigo_empleado,
        nombre_completo: `${e.nombres} ${e.apellidos}`,
        dni: e.dni,
        email: e.email,
        cargo: e.cargo,
        rol: e.rol_nombre,
        activo: e.activo === 1 || e.activo === true,
        jefe: e.jefe_nombres ? `${e.jefe_nombres} ${e.jefe_apellidos}` : null
      }))
    };
  },

  async obtenerEmpleado({ empleadoId }) {
    const e = await Empleado.buscarPorId(Number(empleadoId));
    if (!e) return { ok: false, mensaje: `No existe empleado con id ${empleadoId}.` };
    return {
      ok: true,
      empleado: {
        id: e.id,
        codigo: e.codigo_empleado,
        nombres: e.nombres,
        apellidos: e.apellidos,
        dni: e.dni,
        email: e.email,
        cargo: e.cargo,
        fecha_ingreso: e.fecha_ingreso,
        rol: e.rol_nombre,
        activo: e.activo === 1 || e.activo === true,
        jefe: e.jefe_nombres ? `${e.jefe_nombres} ${e.jefe_apellidos}` : null
      }
    };
  },

  async listarEmpleadosTodos(args) {
    const { rol, soloActivos = true } = args || {};
    const filtros = soloActivos ? { activo: 1 } : {};
    let lista = await Empleado.listarTodos(filtros);
    if (rol) {
      const rn = _normalizar(rol);
      lista = lista.filter((e) => _normalizar(e.rol_nombre) === rn);
    }
    return {
      ok: true,
      total: lista.length,
      empleados: lista.slice(0, 50).map((e) => ({
        id: e.id,
        nombre_completo: `${e.nombres} ${e.apellidos}`,
        cargo: e.cargo,
        rol: e.rol_nombre,
        email: e.email
      }))
    };
  },

  // -------- Vacaciones --------
  async listarPeriodosVacaciones({ empleadoId }) {
    const lista = await PeriodoVacaciones.listarPorEmpleado(Number(empleadoId), {
      vistaEmpleado: false
    });
    if (!lista || lista.length === 0) {
      return { ok: true, total: 0, periodos: [], mensaje: 'No hay períodos registrados.' };
    }
    return {
      ok: true,
      total: lista.length,
      periodos: lista.map((p) => ({
        id: p.id,
        fecha_inicio: p.fecha_inicio_periodo,
        fecha_fin: p.fecha_fin_periodo,
        dias_correspondientes: _num(p.dias_correspondientes),
        dias_gozados: _num(p.dias_gozados),
        dias_pendientes: _num(p.dias_pendientes),
        estado: p.estado,
        observaciones: p.observaciones || null
      }))
    };
  },

  async obtenerResumenVacaciones({ empleadoId }) {
    const r = await PeriodoVacaciones.obtenerResumen(Number(empleadoId), {
      vistaEmpleado: false
    });
    return {
      ok: true,
      resumen: {
        total_ganados: _num(r?.total_ganados),
        total_gozados: _num(r?.total_gozados),
        total_pendientes: _num(r?.total_pendientes)
      }
    };
  },

  async listarSolicitudesVacaciones(args) {
    const { empleadoId, estado } = args || {};
    const filtros = {};
    if (empleadoId) filtros.empleado_id = Number(empleadoId);
    if (estado) filtros.estado = estado;
    const fn =
      typeof SolicitudVacaciones?.listarTodas === 'function'
        ? SolicitudVacaciones.listarTodas
        : typeof SolicitudVacaciones?.listar === 'function'
        ? SolicitudVacaciones.listar
        : null;
    if (!fn) return { ok: false, mensaje: 'Consulta no disponible.' };
    const lista = await fn.call(SolicitudVacaciones, filtros);
    return {
      ok: true,
      total: lista.length,
      solicitudes: lista.slice(0, 30).map((s) => ({
        id: s.id,
        empleado: s.empleado_nombres ? `${s.empleado_nombres} ${s.empleado_apellidos}` : null,
        estado: s.estado,
        fecha_inicio: s.fecha_inicio,
        fecha_fin: s.fecha_fin,
        dias_solicitados: _num(s.dias_solicitados || s.dias)
      }))
    };
  },

  // -------- Permisos / Descansos --------
  async listarPermisos(args) {
    const { empleadoId, estado, tipo, fecha_inicio, fecha_fin } = args || {};
    const filtros = {};
    if (empleadoId) filtros.empleado_id = Number(empleadoId);
    if (estado) filtros.estado = estado;
    if (tipo) filtros.tipo = tipo;
    if (fecha_inicio) filtros.fecha_inicio = fecha_inicio;
    if (fecha_fin) filtros.fecha_fin = fecha_fin;
    const lista = await PermisoDescanso.listarTodos(filtros);
    return {
      ok: true,
      total: lista.length,
      permisos: lista.slice(0, 30).map((p) => ({
        id: p.id,
        empleado: `${p.empleado_nombres} ${p.empleado_apellidos}`,
        tipo: p.tipo,
        estado: p.estado,
        fecha_inicio: p.fecha_inicio,
        fecha_fin: p.fecha_fin,
        motivo: p.motivo,
        aprobado_por: p.aprobador_nombres
          ? `${p.aprobador_nombres} ${p.aprobador_apellidos}`
          : null,
        tiene_archivo: !!p.archivo_path
      }))
    };
  },

  async listarPermisosPendientes() {
    const lista = await PermisoDescanso.listarPendientes();
    return {
      ok: true,
      total: lista.length,
      permisos: lista.map((p) => ({
        id: p.id,
        empleado: `${p.empleado_nombres} ${p.empleado_apellidos}`,
        tipo: p.tipo,
        fecha_inicio: p.fecha_inicio,
        fecha_fin: p.fecha_fin,
        motivo: p.motivo
      }))
    };
  },

  // -------- Boletas de pago --------
  async listarBoletas(args) {
    const { empleadoId, anio } = args || {};
    if (!empleadoId) {
      return { ok: false, mensaje: 'Debes especificar el id del empleado.' };
    }
    const lista = await BoletaPago.listarPorEmpleado(Number(empleadoId), anio ? Number(anio) : null);
    return {
      ok: true,
      total: lista.length,
      boletas: lista.slice(0, 30).map((b) => ({
        id: b.id,
        anio: b.anio,
        mes: b.mes,
        nombre_archivo: b.nombre_archivo,
        fecha_subida: b.created_at
      }))
    };
  },

  // -------- Reembolsos --------
  async listarReembolsos(args) {
    const { empleadoId, estado } = args || {};
    let lista;
    if (empleadoId) {
      lista = await Reembolso.listarPorEmpleado(Number(empleadoId));
      if (estado) lista = lista.filter((r) => r.estado === estado);
    } else {
      lista = await Reembolso.listarTodos(estado ? { estado } : {});
    }
    return {
      ok: true,
      total: lista.length,
      reembolsos: lista.slice(0, 30).map((r) => ({
        id: r.id,
        empleado: `${r.empleado_nombres || ''} ${r.empleado_apellidos || ''}`.trim(),
        estado: r.estado,
        descripcion: r.descripcion,
        monto: _num(r.monto),
        fecha_documento: r.fecha_documento,
        fecha_solicitud: r.created_at,
        comentarios: r.comentarios_resolucion || null
      }))
    };
  },

  // -------- Caja chica --------
  async listarPeriodosCajaChica() {
    const lista = await CajaChica.listarPeriodos();
    return {
      ok: true,
      total: lista.length,
      periodos: lista.slice(0, 30).map((p) => ({
        id: p.id,
        anio: p.anio,
        mes: p.mes,
        estado: p.estado,
        fecha_creacion: p.created_at
      }))
    };
  },

  async obtenerDetallesCajaChica({ periodoId }) {
    const p = await CajaChica.buscarPeriodoPorId(Number(periodoId));
    if (!p) return { ok: false, mensaje: `No existe período de caja chica con id ${periodoId}.` };
    const ingresos = await CajaChica.listarIngresos(p.id);
    const totalIngresos = ingresos.reduce((acc, i) => acc + _num(i.monto), 0);
    return {
      ok: true,
      periodo: {
        id: p.id,
        anio: p.anio,
        mes: p.mes,
        estado: p.estado
      },
      total_ingresos: totalIngresos,
      cantidad_ingresos: ingresos.length,
      ingresos: ingresos.slice(0, 15).map((i) => ({
        descripcion: i.descripcion,
        monto: _num(i.monto),
        fecha: i.fecha
      }))
    };
  },

  // -------- Bolsa de horas / Proyectos --------
  async listarProyectosControl(args) {
    const { empleadoId } = args || {};
    const lista = empleadoId
      ? await ControlProyecto.listarProyectosPorConsultor(Number(empleadoId))
      : await ControlProyecto.listarProyectosTodos();
    return {
      ok: true,
      total: lista.length,
      proyectos: lista.slice(0, 30).map((p) => ({
        id: p.id,
        codigo: p.codigo,
        nombre: p.nombre,
        cliente: p.cliente,
        fecha_inicio: p.fecha_inicio,
        fecha_fin: p.fecha_fin,
        estado: p.estado,
        bolsa_horas_total: _num(p.bolsa_horas_total),
        horas_consumidas: _num(p.horas_consumidas),
        horas_restantes: _num(p.horas_restantes),
        encargado: p.encargado_nombre || null
      }))
    };
  },

  // -------- Solicitudes de Registro --------
  async listarSolicitudesRegistro(args) {
    const { soloPendientes = true } = args || {};
    const lista = soloPendientes
      ? await SolicitudRegistro.listarPendientes()
      : await SolicitudRegistro.listarTodas();
    return {
      ok: true,
      total: lista.length,
      solicitudes: lista.slice(0, 30).map((s) => ({
        id: s.id,
        nombres: s.nombres,
        apellidos: s.apellidos,
        email: s.email,
        dni: s.dni,
        cargo: s.cargo,
        estado: s.estado,
        fecha_solicitud: s.created_at
      }))
    };
  }
};

/* ============================================================
 * TOOL DECLARATIONS — formato OpenAI (compatible con Groq).
 * ============================================================ */

const TOOLS = [
  // ===== Contexto =====
  {
    type: 'function',
    function: {
      name: 'obtenerContextoSistema',
      description:
        'Devuelve la FOTO GENERAL del sistema: cantidad de empleados activos, distribución por rol, ' +
        'cantidad de pendientes en cada módulo (permisos, reembolsos, registros). Llamar PRIMERO cuando el ' +
        'usuario hace una pregunta amplia tipo "qué hay pendiente", "cómo está el sistema", "qué módulos hay".',
      parameters: { type: 'object', properties: {} }
    }
  },
  // ===== Empleados =====
  {
    type: 'function',
    function: {
      name: 'buscarEmpleado',
      description:
        'Busca empleados por nombre, apellido, DNI, código de empleado o email. TOLERANTE a tildes y mayúsculas. ' +
        'Devuelve hasta 10 coincidencias con id y datos clave. Llamar ANTES de cualquier otra cuando se mencione un empleado por nombre.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Texto a buscar (mínimo 2 caracteres).' },
          soloActivos: { type: 'boolean', description: 'Si true (default), solo activos.' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'obtenerEmpleado',
      description: 'Datos completos de un empleado por su id.',
      parameters: {
        type: 'object',
        properties: { empleadoId: { type: 'integer' } },
        required: ['empleadoId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listarEmpleadosTodos',
      description:
        'Lista TODOS los empleados (con filtro opcional por rol y activos). Útil para preguntas tipo "cuántos empleados hay" o "lista los admins".',
      parameters: {
        type: 'object',
        properties: {
          rol: {
            type: 'string',
            description: 'Filtrar por rol (admin, contadora, jefe_operaciones, colaborador). Opcional.'
          },
          soloActivos: { type: 'boolean', description: 'Default true.' }
        }
      }
    }
  },
  // ===== Vacaciones =====
  {
    type: 'function',
    function: {
      name: 'listarPeriodosVacaciones',
      description:
        'Lista TODOS los períodos de vacaciones de un empleado: fechas, días asignados, gozados, pendientes y estado.',
      parameters: {
        type: 'object',
        properties: { empleadoId: { type: 'integer' } },
        required: ['empleadoId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'obtenerResumenVacaciones',
      description: 'Resumen total de vacaciones (suma de períodos): ganados, gozados, pendientes.',
      parameters: {
        type: 'object',
        properties: { empleadoId: { type: 'integer' } },
        required: ['empleadoId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listarSolicitudesVacaciones',
      description: 'Solicitudes de vacaciones con filtros opcionales (empleado, estado).',
      parameters: {
        type: 'object',
        properties: {
          empleadoId: { type: 'integer' },
          estado: {
            type: 'string',
            enum: ['pendiente', 'aprobada', 'rechazada', 'cancelada']
          }
        }
      }
    }
  },
  // ===== Permisos =====
  {
    type: 'function',
    function: {
      name: 'listarPermisos',
      description:
        'Lista permisos y descansos con filtros (empleado, estado, tipo, rango de fechas).',
      parameters: {
        type: 'object',
        properties: {
          empleadoId: { type: 'integer' },
          estado: { type: 'string', enum: ['pendiente', 'aprobado', 'rechazado'] },
          tipo: {
            type: 'string',
            description: 'Ej: descanso_medico, permiso_personal, licencia_sin_goce.'
          },
          fecha_inicio: { type: 'string', description: 'yyyy-mm-dd' },
          fecha_fin: { type: 'string', description: 'yyyy-mm-dd' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'listarPermisosPendientes',
      description: 'Lista TODOS los permisos pendientes de aprobación globalmente.',
      parameters: { type: 'object', properties: {} }
    }
  },
  // ===== Boletas =====
  {
    type: 'function',
    function: {
      name: 'listarBoletas',
      description: 'Boletas de pago de un empleado, opcionalmente filtradas por año.',
      parameters: {
        type: 'object',
        properties: {
          empleadoId: { type: 'integer' },
          anio: { type: 'integer', description: 'Año (ej. 2026). Opcional.' }
        },
        required: ['empleadoId']
      }
    }
  },
  // ===== Reembolsos =====
  {
    type: 'function',
    function: {
      name: 'listarReembolsos',
      description:
        'Lista solicitudes de reembolso. Sin filtros lista todos. Con empleadoId filtra por empleado. Con estado filtra por estado.',
      parameters: {
        type: 'object',
        properties: {
          empleadoId: { type: 'integer' },
          estado: {
            type: 'string',
            enum: ['pendiente', 'observado', 'aprobado', 'rechazado']
          }
        }
      }
    }
  },
  // ===== Caja Chica =====
  {
    type: 'function',
    function: {
      name: 'listarPeriodosCajaChica',
      description: 'Lista los períodos de caja chica (año/mes/estado).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'obtenerDetallesCajaChica',
      description: 'Detalles de un período de caja chica con sus ingresos y montos.',
      parameters: {
        type: 'object',
        properties: { periodoId: { type: 'integer' } },
        required: ['periodoId']
      }
    }
  },
  // ===== Bolsa de Horas / Proyectos =====
  {
    type: 'function',
    function: {
      name: 'listarProyectosControl',
      description:
        'Lista proyectos del módulo Control de Proyectos / Bolsa de Horas. Si se pasa empleadoId, lista solo los proyectos donde el empleado es consultor.',
      parameters: {
        type: 'object',
        properties: { empleadoId: { type: 'integer' } }
      }
    }
  },
  // ===== Solicitudes de Registro =====
  {
    type: 'function',
    function: {
      name: 'listarSolicitudesRegistro',
      description: 'Solicitudes de registro de nuevos usuarios. Por default solo las pendientes.',
      parameters: {
        type: 'object',
        properties: {
          soloPendientes: { type: 'boolean', description: 'Default true.' }
        }
      }
    }
  }
];

/* ============================================================
 * LOOP PRINCIPAL
 * ============================================================ */

/**
 * Procesa un mensaje del usuario.
 *
 * @param {Array} historial - Mensajes previos en formato OpenAI (`{ role: 'user'|'assistant', content }`).
 * @param {string} mensajeUsuario
 * @returns {Promise<{ texto: string, accionesEjecutadas: Array }>}
 */
async function procesarMensaje(historial, mensajeUsuario) {
  const client = obtenerCliente();
  const accionesEjecutadas = [];

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...(Array.isArray(historial) ? historial : []),
    { role: 'user', content: mensajeUsuario }
  ];

  const MAX_ITER = 6;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let response;
    try {
      response = await client.chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 1024
      });
    } catch (err) {
      console.error('[asistenteIa] Error llamando a Groq:', err);
      const status = err?.status;
      if (status === 401) {
        throw new Error('La GROQ_API_KEY es inválida o fue revocada.');
      }
      if (status === 429) {
        throw new Error(
          'Llegaste al límite de uso del tier gratuito de Groq por unos segundos. Esperá 30 segundos y reintentá.'
        );
      }
      throw new Error('No pude conectar con el asistente IA. Revisá la conectividad o la API key.');
    }

    const msg = response.choices?.[0]?.message;
    if (!msg) {
      return {
        texto: 'No tengo una respuesta clara para esa consulta. ¿Podés reformular?',
        accionesEjecutadas
      };
    }

    const toolCalls = msg.tool_calls || [];
    if (toolCalls.length === 0) {
      const texto = (msg.content || '').trim() ||
        'No tengo una respuesta clara para esa consulta. ¿Podés reformular?';
      return { texto, accionesEjecutadas };
    }

    // Persistir el turn del assistant CON las tool_calls.
    messages.push({
      role: 'assistant',
      content: msg.content || null,
      tool_calls: toolCalls
    });

    for (const tc of toolCalls) {
      const fnName = tc.function?.name;
      let args = {};
      try {
        args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
      } catch (e) {
        args = {};
      }
      const handler = HANDLERS[fnName];
      let resultado;
      try {
        resultado = handler
          ? await handler(args)
          : { ok: false, error: `Función desconocida: ${fnName}` };
      } catch (err) {
        console.error(`[asistenteIa] Error ejecutando "${fnName}":`, err);
        resultado = { ok: false, error: err.message || 'Error interno al ejecutar la consulta.' };
      }
      accionesEjecutadas.push({
        funcion: fnName,
        args,
        ok: resultado?.ok !== false
      });

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(resultado)
      });
    }
  }

  return {
    texto:
      'No logré resolver tu consulta en un número razonable de pasos. ¿Podés ser más específico?',
    accionesEjecutadas
  };
}

/* =========================================================================
 * Resumen de pendientes al iniciar sesión.
 *
 * Devuelve un objeto con:
 *   - total: número total de pendientes (para el badge en la burbuja).
 *   - saludo: texto markdown listo para mostrar dentro del chat.
 *   - categorias: desglose por categoría (clave, etiqueta, cantidad).
 *
 * Los pendientes dependen del rol del usuario:
 *   - admin: vacaciones + permisos + reembolsos + solicitudes de registro
 *            (vista global, no filtrada por aprobador).
 *   - contadora: vacaciones que le tocan aprobar + permisos pendientes
 *                + reembolsos (si es la aprobadora configurada).
 *   - jefe_operaciones: vacaciones que le tocan aprobar como jefe
 *                       + reembolsos (si es el aprobador configurado).
 * ========================================================================= */
async function obtenerResumenPendientes(usuario) {
  const rol = usuario?.rol_nombre;
  const userId = usuario?.id;
  const primerNombre = String(usuario?.nombres || '').trim().split(/\s+/)[0] || 'Equipo';

  const categorias = [];
  let aprobadorReembolsosId = null;

  /* Intentamos detectar si el usuario actual es el aprobador de reembolsos
   * (admin siempre puede aprobarlos; los demás solo si están marcados). */
  try {
    const aprobadorReemb = await Empleado.obtenerAprobadorReembolsos();
    aprobadorReembolsosId = aprobadorReemb?.id || null;
  } catch (_) {
    /* si falla, asumimos que solo admin aprueba reembolsos */
  }

  if (rol === 'admin') {
    const [vacaciones, permisos, reembolsos, registros] = await Promise.all([
      SolicitudVacaciones.listarTodasPendientes().catch(() => []),
      PermisoDescanso.listarPendientes().catch(() => []),
      Reembolso.listarPendientes().catch(() => []),
      SolicitudRegistro.listarPendientes().catch(() => [])
    ]);
    categorias.push(
      { clave: 'vacaciones', etiqueta: 'Solicitudes de vacaciones por aprobar', cantidad: vacaciones.length },
      { clave: 'permisos', etiqueta: 'Permisos / descansos por revisar', cantidad: permisos.length },
      { clave: 'reembolsos', etiqueta: 'Reembolsos pendientes', cantidad: reembolsos.length },
      { clave: 'registros', etiqueta: 'Solicitudes de registro de usuarios', cantidad: registros.length }
    );
  } else if (rol === 'contadora') {
    const promesas = [
      SolicitudVacaciones.listarPendientesAprobacion(userId, 'contadora').catch(() => []),
      PermisoDescanso.listarPendientes().catch(() => [])
    ];
    if (aprobadorReembolsosId && userId === aprobadorReembolsosId) {
      promesas.push(Reembolso.listarPendientes().catch(() => []));
    } else {
      promesas.push(Promise.resolve(null));
    }
    const [vacaciones, permisos, reembolsos] = await Promise.all(promesas);
    categorias.push(
      { clave: 'vacaciones', etiqueta: 'Vacaciones esperando tu visto como contadora', cantidad: vacaciones.length },
      { clave: 'permisos', etiqueta: 'Permisos / descansos por revisar', cantidad: permisos.length }
    );
    if (reembolsos != null) {
      categorias.push({
        clave: 'reembolsos',
        etiqueta: 'Reembolsos pendientes (sos la aprobadora)',
        cantidad: reembolsos.length
      });
    }
  } else if (rol === 'jefe_operaciones') {
    const promesas = [
      SolicitudVacaciones.listarPendientesAprobacion(userId, 'jefe').catch(() => [])
    ];
    if (aprobadorReembolsosId && userId === aprobadorReembolsosId) {
      promesas.push(Reembolso.listarPendientes().catch(() => []));
    } else {
      promesas.push(Promise.resolve(null));
    }
    const [vacaciones, reembolsos] = await Promise.all(promesas);
    categorias.push({
      clave: 'vacaciones',
      etiqueta: 'Vacaciones esperando tu aprobación como jefe',
      cantidad: vacaciones.length
    });
    if (reembolsos != null) {
      categorias.push({
        clave: 'reembolsos',
        etiqueta: 'Reembolsos pendientes (sos el aprobador)',
        cantidad: reembolsos.length
      });
    }
  } else {
    /* Roles no soportados: devolvemos un saludo neutro. */
    return {
      total: 0,
      saludo: `Hola ${primerNombre}, no tenés pendientes asignados a tu rol.`,
      categorias: []
    };
  }

  const total = categorias.reduce((acc, c) => acc + (c.cantidad || 0), 0);

  let saludo;
  if (total === 0) {
    saludo =
      `**¡Hola, ${primerNombre}!**\n\n` +
      `No tenés pendientes en este momento. Buen trabajo. ` +
      `Podés preguntarme por vacaciones, permisos, reembolsos o empleados cuando quieras.`;
  } else {
    const lineas = categorias
      .filter((c) => c.cantidad > 0)
      .map((c) => `- ${c.etiqueta}: **${c.cantidad}**`);
    const sugerencia =
      rol === 'admin'
        ? '_Tip: preguntame "muestra las solicitudes de vacaciones pendientes" o "lista los reembolsos pendientes" para ver el detalle._'
        : '_Tip: preguntame "muestra las solicitudes de vacaciones pendientes" para ver el detalle._';
    saludo =
      `**¡Hola, ${primerNombre}!** Esto es lo que tenés en tu bandeja al iniciar sesión:\n\n` +
      lineas.join('\n') +
      `\n\n${sugerencia}`;
  }

  return { total, saludo, categorias };
}

module.exports = {
  procesarMensaje,
  buildSystemPrompt,
  obtenerResumenPendientes,
  TOOLS,
  HANDLERS
};
