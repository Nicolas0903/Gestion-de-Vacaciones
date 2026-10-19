const { pool } = require('../config/database');
const Cotizacion = require('./Cotizacion');
const {
  normalizarGeneralTipoProyecto,
  tipoProyectoValido
} = require('../constants/cotizacionTiposProyecto');

const SELECT_RESPONSABLE = `
  CONCAT(er.nombres, ' ', er.apellidos) AS responsable_nombre,
  er.email AS responsable_email`;

function parseJson(raw, fallback) {
  if (raw == null) return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

class CotizacionSolicitud {
  static async generarCodigo() {
    const year = new Date().getFullYear();
    const prefix = `SOL-COT-${year}-`;
    const [rows] = await pool.query(
      `SELECT codigo FROM cotizacion_solicitudes WHERE codigo LIKE ? ORDER BY id DESC LIMIT 1`,
      [`${prefix}%`]
    );
    let n = 1;
    if (rows[0]?.codigo) {
      const m = String(rows[0].codigo).match(/-(\d+)$/);
      if (m) n = Number(m[1]) + 1;
    }
    return `${prefix}${String(n).padStart(3, '0')}`;
  }

  static async idsResponsablesValidos() {
    const rows = await Cotizacion.listarResponsables();
    return new Set(rows.map((r) => Number(r.id)));
  }

  static async validarResponsableId(responsableId, { obligatorio = false } = {}) {
    const id = responsableId != null && responsableId !== '' ? Number(responsableId) : null;
    if (!id) {
      if (obligatorio) throw new Error('Seleccione al responsable que debe elaborar la cotización');
      return null;
    }
    const validos = await this.idsResponsablesValidos();
    if (!validos.has(id)) throw new Error('El responsable seleccionado no es válido');
    return id;
  }

  static validarPayload(body, { parcial = false } = {}) {
    const g = normalizarGeneralTipoProyecto(body || {});
    const nombre = String(g.nombre_proyecto || body?.nombre_proyecto || '').trim();
    const cliente = String(g.cliente || body?.cliente || '').trim();
    if (!parcial) {
      if (!nombre) throw new Error('El nombre del proyecto es obligatorio');
      if (!cliente) throw new Error('El cliente es obligatorio');
      if (!tipoProyectoValido(g)) throw new Error('Seleccione un tipo de proyecto válido');
      const ctx = String(body?.contexto_comercial || '').trim();
      if (!ctx) throw new Error('Describe el contexto comercial para el equipo de cotización');
    }
    return g;
  }

  static async crear(solicitanteId, body) {
    const g = this.validarPayload(body, { parcial: true });
    const codigo = await this.generarCodigo();
    const estado = body?.enviar ? 'enviada' : 'borrador';
    if (estado === 'enviada') this.validarPayload(body);
    const responsableId = await this.validarResponsableId(body?.responsable_id, {
      obligatorio: estado === 'enviada'
    });

    if (estado === 'enviada') {
      g.nombre_proyecto = String(body?.nombre_proyecto || '').trim();
      g.cliente = String(body?.cliente || '').trim();
    }

    const [result] = await pool.query(
      `INSERT INTO cotizacion_solicitudes
        (codigo, estado, solicitante_id, responsable_id, nombre_proyecto, cliente, tipo_proyecto, tipo_proyecto_codigo,
         fecha_limite, contexto_comercial, contacto_cliente, email_cliente, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        estado,
        solicitanteId,
        responsableId,
        String(body?.nombre_proyecto || g.nombre_proyecto || '').trim(),
        String(body?.cliente || g.cliente || '').trim(),
        g.tipo_proyecto || '',
        g.tipo_proyecto_codigo || null,
        body?.fecha_limite || null,
        String(body?.contexto_comercial || '').trim() || null,
        String(body?.contacto_cliente || '').trim() || null,
        String(body?.email_cliente || '').trim() || null,
        JSON.stringify(body?.payload || {})
      ]
    );
    return this.obtener(result.insertId);
  }

  static async actualizar(id, solicitanteId, body, { esEquipoCot = false } = {}) {
    const row = await this.buscarPorId(id);
    if (!row) throw new Error('Solicitud no encontrada');
    if (!esEquipoCot && row.solicitante_id !== solicitanteId) {
      throw new Error('No puedes editar esta solicitud');
    }
    if (!esEquipoCot && !['borrador', 'enviada'].includes(row.estado) && body?.enviar !== true) {
      throw new Error('La solicitud ya está en elaboración');
    }

    const enviar = Boolean(body?.enviar);
    if (enviar) this.validarPayload({ ...row, ...body });

    const g = normalizarGeneralTipoProyecto({ ...row, ...body });
    const nextEstado = enviar ? 'enviada' : row.estado === 'borrador' ? 'borrador' : row.estado;

    let responsableId = row.responsable_id;
    if (body?.responsable_id !== undefined) {
      responsableId = await this.validarResponsableId(body.responsable_id, { obligatorio: enviar });
    } else if (enviar) {
      responsableId = await this.validarResponsableId(row.responsable_id, { obligatorio: true });
    }

    await pool.query(
      `UPDATE cotizacion_solicitudes SET
        estado = ?, responsable_id = ?, nombre_proyecto = ?, cliente = ?, tipo_proyecto = ?, tipo_proyecto_codigo = ?,
        fecha_limite = ?, contexto_comercial = ?, contacto_cliente = ?, email_cliente = ?,
        payload_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nextEstado,
        responsableId,
        String(body?.nombre_proyecto ?? row.nombre_proyecto).trim(),
        String(body?.cliente ?? row.cliente).trim(),
        g.tipo_proyecto,
        g.tipo_proyecto_codigo,
        body?.fecha_limite !== undefined ? body.fecha_limite || null : row.fecha_limite,
        String(body?.contexto_comercial ?? row.contexto_comercial ?? '').trim() || null,
        String(body?.contacto_cliente ?? row.contacto_cliente ?? '').trim() || null,
        String(body?.email_cliente ?? row.email_cliente ?? '').trim() || null,
        JSON.stringify(body?.payload != null ? body.payload : parseJson(row.payload_json, {})),
        id
      ]
    );
    return this.obtener(id);
  }

  static async listar({
    solicitanteId = null,
    soloPendientesEquipo = false,
    responsableIdEquipo = null
  } = {}) {
    let sql = `
      SELECT s.*,
             CONCAT(e.nombres, ' ', e.apellidos) AS solicitante_nombre,
             e.email AS solicitante_email,
             ${SELECT_RESPONSABLE},
             c.codigo AS cotizacion_codigo
      FROM cotizacion_solicitudes s
      JOIN empleados e ON e.id = s.solicitante_id
      LEFT JOIN empleados er ON er.id = s.responsable_id
      LEFT JOIN cotizaciones c ON c.id = s.cotizacion_id
      WHERE 1=1`;
    const params = [];
    if (solicitanteId) {
      sql += ` AND s.solicitante_id = ?`;
      params.push(solicitanteId);
    }
    if (soloPendientesEquipo) {
      sql += ` AND s.estado IN ('enviada', 'en_elaboracion') AND s.cotizacion_id IS NULL`;
      if (responsableIdEquipo) {
        sql += ` AND s.responsable_id = ?`;
        params.push(responsableIdEquipo);
      }
    }
    sql += ` ORDER BY s.updated_at DESC, s.id DESC`;
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(`SELECT * FROM cotizacion_solicitudes WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  static async obtener(id) {
    const [rows] = await pool.query(
      `SELECT s.*,
              CONCAT(e.nombres, ' ', e.apellidos) AS solicitante_nombre,
              e.email AS solicitante_email,
              ${SELECT_RESPONSABLE},
              c.codigo AS cotizacion_codigo
       FROM cotizacion_solicitudes s
       JOIN empleados e ON e.id = s.solicitante_id
       LEFT JOIN empleados er ON er.id = s.responsable_id
       LEFT JOIN cotizaciones c ON c.id = s.cotizacion_id
       WHERE s.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async vincularCotizacion(id, cotizacionId) {
    await pool.query(
      `UPDATE cotizacion_solicitudes SET
        cotizacion_id = ?, estado = 'en_elaboracion', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [cotizacionId, id]
    );
    await pool.query(`UPDATE cotizaciones SET solicitud_id = ? WHERE id = ?`, [cotizacionId, id]);
  }

  static async marcarAtendida(id) {
    await pool.query(
      `UPDATE cotizacion_solicitudes SET estado = 'atendida', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );
  }
}

module.exports = CotizacionSolicitud;
