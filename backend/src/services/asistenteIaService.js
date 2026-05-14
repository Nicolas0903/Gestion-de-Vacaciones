/**
 * Asistente IA del Admin (Nivel 1: solo lectura).
 *
 * Usa Google Gemini (modelo `gemini-2.5-flash`) con tool-calling para que el
 * modelo decida qué función ejecutar según la consulta del usuario.
 *
 * Importante:
 *  - Solo el rol `admin` debe poder invocar este servicio (la ruta ya valida eso).
 *  - Las funciones registradas en `HANDLERS` SOLO LEEN datos (no modifican).
 *  - Si más adelante se agrega Nivel 2 (escritura), las funciones de escritura
 *    deberán pedir confirmación al usuario antes de ejecutar.
 */

const { Empleado, PeriodoVacaciones, PermisoDescanso, SolicitudVacaciones } = require('../models');

let _ai = null;
function obtenerCliente() {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Falta la variable de entorno GEMINI_API_KEY. Obtené una en https://aistudio.google.com/apikey'
    );
  }
  /* Cargado de forma diferida para no romper el arranque si la dep no está instalada
   * mientras el feature no se usa. */
  const { GoogleGenAI } = require('@google/genai');
  _ai = new GoogleGenAI({ apiKey });
  return _ai;
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Instrucciones del sistema. Determina la personalidad y los límites del bot.
 * Las funciones disponibles se describen aparte (Gemini las recibe vía `tools`),
 * pero el system prompt establece el tono y reglas de uso.
 */
const SYSTEM_INSTRUCTION = `Eres "Asistente Prayaga", un asistente experto interno para el equipo de administración del sistema de Gestión de Vacaciones de Prayaga.

REGLAS GENERALES:
- Respondes SIEMPRE en español, en tono cordial y profesional, conciso.
- Tu único trabajo es ayudar a consultar información de empleados, vacaciones, permisos y solicitudes.
- NO inventas datos. Si necesitas información, USA las funciones disponibles.
- NUNCA modificas ni borras nada (en esta versión solo tienes funciones de lectura).
- Si te piden hacer un cambio (ej. "actualiza los días", "elimina"), responde amablemente:
  "Por ahora solo puedo consultar información, todavía no tengo permisos para modificar registros. Esa funcionalidad llegará pronto."
- Si te preguntan algo fuera del dominio (chistes, clima, código, etc.), redirige al tema.

CÓMO TRABAJAR:
1. Cuando el usuario mencione un empleado por nombre o apellido, llama PRIMERO a "buscarEmpleado" para resolver el id. La búsqueda es TOLERANTE a tildes y mayúsculas (interna), así que NO le pidas al usuario que reescriba el nombre solo por acentos.
2. Si la búsqueda devuelve VARIOS resultados, lista los nombres y pregunta cuál.
3. Si la búsqueda devuelve CERO resultados con un nombre, NO le pidas al usuario el DNI o código de inmediato: primero intenta otra variante (apellido solo, nombre solo) y SOLO si tampoco funciona, pídele el DNI o código.
4. Con el id resuelto, llama a la función adecuada para obtener la información.
5. Para fechas, formato dd/mm/yyyy.
6. Si el usuario pregunta sobre "días de vacaciones" sin más, ofrece tanto el resumen como el detalle por período.

FORMATO DE RESPUESTA (importante):
- Responde en TEXTO NATURAL, conversacional, en español. NO uses tablas markdown con caracteres "|" porque no se renderizan en el chat.
- Para listas usa viñetas con guiones "-" o números.
- Usa **negritas** (markdown estándar) solo para destacar datos clave.
- Para mostrar varios períodos o registros, usa una lista con viñetas y saltos de línea, no tabla.
- Mantén las respuestas concisas. Si hay muchos datos, resume y ofrece dar más detalle si lo piden.

EJEMPLO DE RESPUESTA CORRECTA (períodos de vacaciones):
"Acá están los períodos de **Nicolás Valdivia** (DNI 75464668):

- **2024-2025** (02/05/2024 → 01/05/2025): 15 asignados, 10 gozados, **5 pendientes** — Parcial
- **2025-2026** (02/05/2025 → 01/05/2026): 15 asignados, 0 gozados, **15 pendientes** — Pendiente
- **2026-2027** (02/05/2026 → 01/05/2027): 15 asignados, 0 gozados, **15 pendientes** — Pendiente

Total: 35 días pendientes."

NO HAGAS ASÍ (mala):
"| Período | Días | Estado |
|---|---|---|
| 2024-2025 | 15 | Parcial |"

PERÍODOS DE VACACIONES:
- Cada período tiene: fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes (asignados), dias_gozados, dias_pendientes, estado.
- "estado" puede ser: pendiente (nada gozado), parcial (algo gozado, falta), gozadas (completos).

PERMISOS:
- Tipos: descanso_medico, permiso_personal, licencia_sin_goce, otros.
- Estados: pendiente, aprobado, rechazado.
`;

// ============================================================
// HANDLERS — Funciones reales que ejecutan consultas a la BD.
// ============================================================

/** Quita tildes/acentos y pasa a minúscula para comparar de forma tolerante. */
function _normalizar(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const HANDLERS = {
  /**
   * Busca empleados de forma TOLERANTE a tildes, mayúsculas y orden de palabras.
   * Estrategia:
   *   1. Intenta la búsqueda directa (puede fallar si hay tildes).
   *   2. Si no hay resultados, tokeniza el query, busca cada token, y filtra
   *      empleados que contengan TODOS los tokens normalizados.
   */
  async buscarEmpleado({ query, soloActivos = true }) {
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return { ok: false, mensaje: 'El query debe tener al menos 2 caracteres.' };
    }
    const q = query.trim();
    const baseFiltros = soloActivos ? { activo: 1 } : {};

    // 1) Intento directo (LIKE %query%): rápido y suele alcanzar.
    let lista = await Empleado.listarTodos({ ...baseFiltros, busqueda: q });

    // 2) Fallback fuzzy: tokenizo, busco cada token, filtro por intersección normalizada.
    if (!lista || lista.length === 0) {
      const tokens = q
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2);

      if (tokens.length === 0) {
        return { ok: true, total: 0, resultados: [] };
      }

      // Recupero candidatos por cada token (LIKE) y junto sin duplicar.
      const mapa = new Map();
      for (const tk of tokens) {
        const parciales = await Empleado.listarTodos({ ...baseFiltros, busqueda: tk });
        for (const e of parciales) mapa.set(e.id, e);
      }

      const tokensNormalizados = tokens.map(_normalizar);
      // Filtro: el candidato debe contener TODOS los tokens (normalizando tildes).
      lista = Array.from(mapa.values()).filter((e) => {
        const blob = _normalizar(
          `${e.nombres} ${e.apellidos} ${e.email || ''} ${e.codigo_empleado || ''} ${e.dni || ''}`
        );
        return tokensNormalizados.every((tk) => blob.includes(tk));
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

  /** Devuelve los datos de un empleado por su id. */
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

  /** Lista todos los períodos de vacaciones del empleado (vista admin: ve todos). */
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
        dias_correspondientes: Number(p.dias_correspondientes || 0),
        dias_gozados: Number(p.dias_gozados || 0),
        dias_pendientes: Number(p.dias_pendientes || 0),
        estado: p.estado,
        observaciones: p.observaciones || null
      }))
    };
  },

  /** Devuelve resumen total ganado/gozado/pendiente del empleado. */
  async obtenerResumenVacaciones({ empleadoId }) {
    const r = await PeriodoVacaciones.obtenerResumen(Number(empleadoId), {
      vistaEmpleado: false
    });
    return {
      ok: true,
      resumen: {
        total_ganados: Number(r?.total_ganados || 0),
        total_gozados: Number(r?.total_gozados || 0),
        total_pendientes: Number(r?.total_pendientes || 0)
      }
    };
  },

  /** Lista permisos/descansos con filtros opcionales. */
  async listarPermisos({ empleadoId, estado, tipo, fecha_inicio, fecha_fin } = {}) {
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

  /** Lista solo permisos pendientes (global). */
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

  /** Lista solicitudes de vacaciones con filtros opcionales. */
  async listarSolicitudesVacaciones({ empleadoId, estado } = {}) {
    const filtros = {};
    if (empleadoId) filtros.empleado_id = Number(empleadoId);
    if (estado) filtros.estado = estado;
    /* SolicitudVacaciones.listar puede no existir con este nombre exacto; usamos un
     * fallback robusto: si el modelo expone listarTodas o listar, lo invocamos.
     * En caso contrario respondemos no soportado. */
    const fn =
      typeof SolicitudVacaciones?.listarTodas === 'function'
        ? SolicitudVacaciones.listarTodas
        : typeof SolicitudVacaciones?.listar === 'function'
        ? SolicitudVacaciones.listar
        : null;
    if (!fn) {
      return {
        ok: false,
        mensaje:
          'Esta consulta todavía no está disponible en el asistente. Avísale al equipo de desarrollo.'
      };
    }
    const lista = await fn.call(SolicitudVacaciones, filtros);
    return {
      ok: true,
      total: lista.length,
      solicitudes: lista.slice(0, 30).map((s) => ({
        id: s.id,
        empleado: s.empleado_nombres
          ? `${s.empleado_nombres} ${s.empleado_apellidos}`
          : null,
        estado: s.estado,
        fecha_inicio: s.fecha_inicio,
        fecha_fin: s.fecha_fin,
        dias_solicitados: Number(s.dias_solicitados || s.dias || 0)
      }))
    };
  }
};

// ============================================================
// DECLARACIONES PARA GEMINI — Schema que el modelo "ve".
// ============================================================

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'buscarEmpleado',
        description:
          'Busca empleados por nombre, apellido, DNI, código de empleado o email. ' +
          'Devuelve hasta 10 coincidencias con id y datos clave. Llamá esta función ANTES de cualquier otra cuando el usuario mencione un empleado por nombre.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Texto a buscar (mínimo 2 caracteres).'
            },
            soloActivos: {
              type: 'boolean',
              description: 'Si true (default), busca solo empleados activos.'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'obtenerEmpleado',
        description: 'Obtiene los datos completos de un empleado por su id.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            empleadoId: { type: 'integer', description: 'Id numérico del empleado.' }
          },
          required: ['empleadoId']
        }
      },
      {
        name: 'listarPeriodosVacaciones',
        description:
          'Lista TODOS los períodos de vacaciones de un empleado (incluyendo gozados, parciales y pendientes). ' +
          'Cada período muestra fechas, días asignados, días gozados, días pendientes y estado.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            empleadoId: { type: 'integer', description: 'Id numérico del empleado.' }
          },
          required: ['empleadoId']
        }
      },
      {
        name: 'obtenerResumenVacaciones',
        description:
          'Obtiene el RESUMEN total de vacaciones de un empleado: total de días ganados, gozados y pendientes (suma de todos los períodos).',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            empleadoId: { type: 'integer', description: 'Id numérico del empleado.' }
          },
          required: ['empleadoId']
        }
      },
      {
        name: 'listarPermisos',
        description:
          'Lista permisos y descansos con filtros opcionales. Útil para ver el historial de permisos de un empleado o filtrar por estado/tipo/fechas.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            empleadoId: {
              type: 'integer',
              description: 'Filtrar por empleado (opcional).'
            },
            estado: {
              type: 'string',
              enum: ['pendiente', 'aprobado', 'rechazado'],
              description: 'Filtrar por estado (opcional).'
            },
            tipo: {
              type: 'string',
              description:
                'Filtrar por tipo de permiso (ej. descanso_medico, permiso_personal). Opcional.'
            },
            fecha_inicio: {
              type: 'string',
              description: 'Fecha de inicio del rango (yyyy-mm-dd). Opcional.'
            },
            fecha_fin: {
              type: 'string',
              description: 'Fecha de fin del rango (yyyy-mm-dd). Opcional.'
            }
          }
        }
      },
      {
        name: 'listarPermisosPendientes',
        description:
          'Lista TODOS los permisos pendientes de aprobación en el sistema (sin filtros). Útil para ver el backlog del admin.',
        parametersJsonSchema: { type: 'object', properties: {} }
      },
      {
        name: 'listarSolicitudesVacaciones',
        description:
          'Lista solicitudes de vacaciones con filtros opcionales (empleado, estado).',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            empleadoId: { type: 'integer', description: 'Filtrar por empleado (opcional).' },
            estado: {
              type: 'string',
              enum: ['pendiente', 'aprobada', 'rechazada', 'cancelada'],
              description: 'Filtrar por estado (opcional).'
            }
          }
        }
      }
    ]
  }
];

// ============================================================
// LOOP PRINCIPAL — procesa el mensaje hasta resolver function calls.
// ============================================================

/**
 * Procesa un mensaje del usuario.
 *
 * @param {Array} historial - Mensajes anteriores en formato `Content[]` de Gemini.
 *                            Cada uno: { role: 'user'|'model', parts: [{text}] }.
 *                            Se pasa el historial limpio (sin function calls intermedios).
 * @param {string} mensajeUsuario - Texto del usuario.
 * @returns {Promise<{ texto: string, accionesEjecutadas: Array }>}
 */
async function procesarMensaje(historial, mensajeUsuario) {
  const ai = obtenerCliente();
  const accionesEjecutadas = [];

  const contents = [
    ...(Array.isArray(historial) ? historial : []),
    { role: 'user', parts: [{ text: mensajeUsuario }] }
  ];

  const MAX_ITER = 6;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let response;
    try {
      response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: TOOLS,
          temperature: 0.2
        }
      });
    } catch (err) {
      console.error('[asistenteIa] Error llamando a Gemini:', err);
      throw new Error(
        'No pude conectar con el asistente IA. Revisá la GEMINI_API_KEY y la conectividad.'
      );
    }

    const fc = response.functionCalls || [];
    if (!fc.length) {
      const texto = (response.text || '').trim() ||
        'No tengo una respuesta clara para esa consulta. ¿Podés reformular?';
      return { texto, accionesEjecutadas };
    }

    /* Persistir el turn del modelo (con las functionCall parts) en el historial,
     * y luego añadir las functionResponse parts. Gemini las necesita en este orden
     * para entender el contexto del próximo turno. */
    const modelContent = { role: 'model', parts: [] };
    const userResponseContent = { role: 'user', parts: [] };

    for (const call of fc) {
      modelContent.parts.push({ functionCall: { name: call.name, args: call.args || {} } });

      const handler = HANDLERS[call.name];
      let resultado;
      try {
        resultado = handler
          ? await handler(call.args || {})
          : { ok: false, error: `Función desconocida: ${call.name}` };
      } catch (err) {
        console.error(`[asistenteIa] Error ejecutando "${call.name}":`, err);
        resultado = { ok: false, error: err.message || 'Error interno al ejecutar la consulta.' };
      }
      accionesEjecutadas.push({ funcion: call.name, args: call.args, ok: resultado?.ok !== false });

      userResponseContent.parts.push({
        functionResponse: { name: call.name, response: resultado }
      });
    }

    contents.push(modelContent, userResponseContent);
  }

  return {
    texto: 'No logré resolver tu consulta en un número razonable de pasos. ¿Podés ser más específico?',
    accionesEjecutadas
  };
}

module.exports = {
  procesarMensaje,
  SYSTEM_INSTRUCTION,
  TOOLS,
  HANDLERS
};
