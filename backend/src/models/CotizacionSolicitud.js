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
    const ids = await this.resolverResponsablesIds(
      responsableId != null && responsableId !== '' ? { responsables_ids: [responsableId] } : {},
      {},
      { obligatorio }
    );
    return ids[0] ?? null;
  }

  static resolverTiposProyecto(body, row = {}) {
    if (Array.isArray(body?.tipos_proyecto) && body.tipos_proyecto.length) {
      return body.tipos_proyecto
        .map((t) => ({
          codigo: t.codigo || null,
          nombre: String(t.nombre || '').trim()
        }))
        .filter((t) => t.nombre || t.codigo);
    }
    const g = normalizarGeneralTipoProyecto({ ...row, ...body });
    if (tipoProyectoValido(g)) {
      return [{ codigo: g.tipo_proyecto_codigo, nombre: g.tipo_proyecto }];
    }
    const payload = parseJson(row.payload_json, {});
    if (Array.isArray(payload.tipos_proyecto) && payload.tipos_proyecto.length) {
      return payload.tipos_proyecto;
    }
    if (row.tipo_proyecto) {
      return [{ codigo: row.tipo_proyecto_codigo, nombre: row.tipo_proyecto }];
    }
    return [];
  }

  static async resolverResponsablesIds(body, row = {}, { obligatorio = false } = {}) {
    let ids = [];
    const raw =
      body?.responsables_ids ??
      body?.responsable_ids ??
      (body?.responsable_id != null && body?.responsable_id !== ''
        ? [body.responsable_id]
        : undefined);
    if (Array.isArray(raw)) {
      ids = raw.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
    } else if (row.responsable_id) {
      ids = [Number(row.responsable_id)];
    } else {
      const payload = parseJson(row.payload_json, {});
      if (Array.isArray(payload.responsables_ids)) {
        ids = payload.responsables_ids.map(Number).filter(Boolean);
      }
    }
    ids = [...new Set(ids)];
    const validos = await this.idsResponsablesValidos();
    ids = ids.filter((id) => validos.has(id));
    if (obligatorio && !ids.length) {
      throw new Error('Seleccione al menos un responsable para elaborar la cotización');
    }
    for (const id of ids) {
      if (!validos.has(id)) throw new Error('Uno de los responsables seleccionados no es válido');
    }
    return ids;
  }

  static enriquecer(row) {
    if (!row) return row;
    const payload = parseJson(row.payload_json, {});
    const tipos =
      Array.isArray(payload.tipos_proyecto) && payload.tipos_proyecto.length
        ? payload.tipos_proyecto
        : row.tipo_proyecto
          ? [{ codigo: row.tipo_proyecto_codigo, nombre: row.tipo_proyecto }]
          : [];
    const responsables_ids =
      Array.isArray(payload.responsables_ids) && payload.responsables_ids.length
        ? payload.responsables_ids.map(Number)
        : row.responsable_id
          ? [Number(row.responsable_id)]
          : [];
    return {
      ...row,
      tipos_proyecto: tipos,
      responsables_ids,
      tipos_proyecto_texto: tipos
        .map((t) => t.nombre)
        .filter(Boolean)
        .join(', ')
    };
  }

  static async enriquecerConResponsables(row) {
    const base = this.enriquecer(row);
    const ids = base.responsables_ids || [];
    if (!ids.length) return base;
    const placeholders = ids.map(() => '?').join(',');
    const [emps] = await pool.query(
      `SELECT id, nombres, apellidos, email FROM empleados WHERE id IN (${placeholders})`,
      ids
    );
    base.responsables = emps;
    base.responsables_texto = emps
      .map((e) => [e.nombres, e.apellidos].filter(Boolean).join(' '))
      .filter(Boolean)
      .join(', ');
    return base;
  }

  static mergePayloadJson(body, row, tipos, responsablesIds) {
    const prev = parseJson(row?.payload_json, {});
    const extra = body?.payload && typeof body.payload === 'object' ? body.payload : {};
    return {
      ...prev,
      ...extra,
      tipos_proyecto: tipos,
      responsables_ids: responsablesIds
    };
  }

  static validarPayload(body, row = {}, { parcial = false } = {}) {
    const tipos = this.resolverTiposProyecto(body, row);
    const g =
      tipos[0] != null
        ? normalizarGeneralTipoProyecto({
            tipo_proyecto: tipos[0].nombre,
            tipo_proyecto_codigo: tipos[0].codigo
          })
        : normalizarGeneralTipoProyecto(body || {});
    const nombre = String(g.nombre_proyecto || body?.nombre_proyecto || '').trim();
    const cliente = String(g.cliente || body?.cliente || '').trim();
    if (!parcial) {
      if (!nombre) throw new Error('El nombre del proyecto es obligatorio');
      if (!cliente) throw new Error('El cliente es obligatorio');
      if (!tipos.length || !tipoProyectoValido(g)) {
        throw new Error('Seleccione al menos un tipo de proyecto válido');
      }
      const ctx = String(body?.contexto_comercial || '').trim();
      if (!ctx) throw new Error('Describe el contexto comercial para el equipo de cotización');
    }
    return { g, tipos };
  }

  static async crear(solicitanteId, body) {
    const { g, tipos } = this.validarPayload(body, {}, { parcial: true });
    const codigo = await this.generarCodigo();
    const estado = body?.enviar ? 'enviada' : 'borrador';
    if (estado === 'enviada') this.validarPayload(body, {}, { parcial: false });
    const responsablesIds = await this.resolverResponsablesIds(body, {}, {
      obligatorio: estado === 'enviada'
    });
    const responsableId = responsablesIds[0] ?? null;
    const payloadJson = this.mergePayloadJson(body, null, tipos, responsablesIds);

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
        g.tipo_proyecto || tipos[0]?.nombre || '',
        g.tipo_proyecto_codigo || tipos[0]?.codigo || null,
        body?.fecha_limite || null,
        String(body?.contexto_comercial || '').trim() || null,
        String(body?.contacto_cliente || '').trim() || null,
        String(body?.email_cliente || '').trim() || null,
        JSON.stringify(payloadJson)
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
    const { g, tipos } = enviar
      ? this.validarPayload(body, row, { parcial: false })
      : this.validarPayload(body, row, { parcial: true });

    const nextEstado = enviar ? 'enviada' : row.estado === 'borrador' ? 'borrador' : row.estado;

    const responsablesIds = await this.resolverResponsablesIds(body, row, { obligatorio: enviar });
    const responsableId = responsablesIds[0] ?? row.responsable_id ?? null;
    const payloadJson = this.mergePayloadJson(body, row, tipos, responsablesIds);

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
        g.tipo_proyecto || tipos[0]?.nombre || '',
        g.tipo_proyecto_codigo || tipos[0]?.codigo || null,
        body?.fecha_limite !== undefined ? body.fecha_limite || null : row.fecha_limite,
        String(body?.contexto_comercial ?? row.contexto_comercial ?? '').trim() || null,
        String(body?.contacto_cliente ?? row.contacto_cliente ?? '').trim() || null,
        String(body?.email_cliente ?? row.email_cliente ?? '').trim() || null,
        JSON.stringify(payloadJson),
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
      sql += ` AND s.estado = 'enviada' AND s.cotizacion_id IS NULL`;
      if (responsableIdEquipo) {
        sql += ` AND (
          s.responsable_id = ?
          OR JSON_CONTAINS(
            COALESCE(JSON_EXTRACT(s.payload_json, '$.responsables_ids'), JSON_ARRAY()),
            CAST(? AS JSON)
          )
        )`;
        params.push(responsableIdEquipo, responsableIdEquipo);
      }
    }
    sql += ` ORDER BY s.updated_at DESC, s.id DESC`;
    const [rows] = await pool.query(sql, params);
    for (const r of rows) {
      await this.reconciliarEstadoHuerfana(r.id);
    }
    if (rows.length) {
      const [fresh] = await pool.query(
        `SELECT s.*,
                CONCAT(e.nombres, ' ', e.apellidos) AS solicitante_nombre,
                e.email AS solicitante_email,
                ${SELECT_RESPONSABLE},
                c.codigo AS cotizacion_codigo
         FROM cotizacion_solicitudes s
         JOIN empleados e ON e.id = s.solicitante_id
         LEFT JOIN empleados er ON er.id = s.responsable_id
         LEFT JOIN cotizaciones c ON c.id = s.cotizacion_id
         WHERE s.id IN (${rows.map(() => '?').join(',')})
         ORDER BY s.updated_at DESC, s.id DESC`,
        rows.map((r) => r.id)
      );
      return Promise.all(fresh.map((r) => this.enriquecerConResponsables(r)));
    }
    return Promise.all(rows.map((r) => this.enriquecerConResponsables(r)));
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(`SELECT * FROM cotizacion_solicitudes WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  static async obtener(id) {
    await this.reconciliarEstadoHuerfana(id);
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
    const row = rows[0];
    if (!row) return null;
    return this.enriquecerConResponsables(row);
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

  /** Cotización que aún existe en BD (el FK puede quedar huérfano si se borró la fila sin SET NULL). */
  static async cotizacionActivaPorId(cotizacionId) {
    if (!cotizacionId) return null;
    const [rows] = await pool.query(`SELECT id, codigo FROM cotizaciones WHERE id = ? LIMIT 1`, [
      cotizacionId
    ]);
    return rows[0] || null;
  }

  /** Si estaba en elaboración pero no hay cotización, vuelve a enviada y limpia el vínculo. */
  static async reconciliarEstadoHuerfana(id) {
    const row = await this.buscarPorId(id);
    if (!row) return null;
    const activa = row.cotizacion_id ? await this.cotizacionActivaPorId(row.cotizacion_id) : null;
    if (!activa && (row.cotizacion_id || row.estado === 'en_elaboracion')) {
      await pool.query(
        `UPDATE cotizacion_solicitudes SET
          cotizacion_id = NULL,
          estado = CASE WHEN estado = 'atendida' THEN estado ELSE 'enviada' END,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [id]
      );
    }
    return this.buscarPorId(id);
  }

  static async assertPuedeAnular(row, actorId, { esAdmin, esEquipoCot }) {
    if (!row) throw new Error('Solicitud no encontrada');
    if (row.estado === 'cancelada') return;
    if (row.estado === 'atendida') {
      throw new Error('No se puede anular una solicitud ya atendida');
    }
    const cotActiva = row.cotizacion_id ? await this.cotizacionActivaPorId(row.cotizacion_id) : null;
    if (cotActiva) {
      throw new Error(
        `Hay cotización activa (${cotActiva.codigo}). Elimínela primero en el módulo Cotizaciones.`
      );
    }
    const esSolicitante = row.solicitante_id === actorId;
    const enriched = this.enriquecer(row);
    const esResponsable =
      row.responsable_id === actorId ||
      (enriched.responsables_ids || []).includes(Number(actorId));
    if (row.estado === 'borrador') {
      if (!esSolicitante && !esAdmin) throw new Error('No puedes anular este borrador');
      return;
    }
    if (row.estado === 'enviada') {
      if (esSolicitante || esAdmin || (esEquipoCot && esResponsable)) return;
      if (esEquipoCot && esAdmin) return;
      throw new Error('No tienes permiso para rechazar esta solicitud');
    }
    if (row.estado === 'en_elaboracion') {
      if (esSolicitante || esAdmin || (esEquipoCot && esResponsable)) return;
      throw new Error('No tienes permiso para cancelar esta solicitud');
    }
    throw new Error('Estado no permite anular');
  }

  static async cancelar(id, actorId, { motivo = '', esAdmin = false, esEquipoCot = false } = {}) {
    const row = await this.reconciliarEstadoHuerfana(id);
    await this.assertPuedeAnular(row, actorId, { esAdmin, esEquipoCot });
    if (row.estado === 'cancelada') return this.obtener(id);

    const payload = parseJson(row.payload_json, {});
    payload.motivo_cancelacion = String(motivo || '').trim() || null;
    payload.cancelado_por = actorId;
    payload.cancelado_at = new Date().toISOString();

    await pool.query(
      `UPDATE cotizacion_solicitudes SET
        estado = 'cancelada', payload_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [JSON.stringify(payload), id]
    );
    return this.obtener(id);
  }

  static async eliminar(id, actorId, { esAdmin = false } = {}) {
    let row = await this.reconciliarEstadoHuerfana(id);
    if (!row) throw new Error('Solicitud no encontrada');

    const cotActiva = row.cotizacion_id ? await this.cotizacionActivaPorId(row.cotizacion_id) : null;
    if (cotActiva) {
      throw new Error(
        `No se puede eliminar: existe la cotización ${cotActiva.codigo}. Elimínela en el módulo Cotizaciones.`
      );
    }

    if (row.estado === 'atendida') {
      throw new Error('No se puede eliminar una solicitud ya atendida');
    }

    const esSolicitante = row.solicitante_id === actorId;
    if (!esSolicitante && !esAdmin) {
      throw new Error('No tienes permiso para eliminar esta solicitud');
    }

    await pool.query(`DELETE FROM cotizacion_solicitudes WHERE id = ?`, [id]);
    return true;
  }
}

module.exports = CotizacionSolicitud;
