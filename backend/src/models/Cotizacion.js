const { pool } = require('../config/database');
const { calcularCotizacion, borradorVacio } = require('../services/cotizacionCalculoService');
const { COTIZACION_RESPONSABLES_EMAILS } = require('../constants/cotizacionResponsables');
const {
  estructuraDesdeTipoProyecto,
  listarTiposProyectoCatalogo,
  normalizarGeneralTipoProyecto,
  tipoProyectoValido
} = require('../constants/cotizacionTiposProyecto');
const { diffCotizacionSnapshots } = require('../utils/cotizacionSnapshotDiff');

function parseJson(val, fallback) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

class Cotizacion {
  /**
   * Próximo código secuencial reutilizando huecos (ej. si falta 002, asigna 002).
   */
  static async generarCodigo() {
    const year = new Date().getFullYear();
    const prefix = `COT-${year}-`;
    const [rows] = await pool.query(`SELECT codigo FROM cotizaciones WHERE codigo LIKE ?`, [
      `${prefix}%`
    ]);
    const usados = new Set();
    const re = new RegExp(`^COT-${year}-(\\d+)$`);
    for (const row of rows) {
      const m = String(row.codigo || '').match(re);
      if (m) usados.add(parseInt(m[1], 10));
    }
    let n = 1;
    while (usados.has(n)) n += 1;
    return `${prefix}${String(n).padStart(3, '0')}`;
  }

  static async codigoDisponible(codigo, excluirId = null) {
    const c = String(codigo || '').trim();
    if (!c) return true;
    const params = [c];
    let sql = `SELECT id FROM cotizaciones WHERE codigo = ?`;
    if (excluirId) {
      sql += ` AND id != ?`;
      params.push(excluirId);
    }
    const [rows] = await pool.query(sql, params);
    return rows.length === 0;
  }

  static async listarTiposProyecto() {
    return listarTiposProyectoCatalogo();
  }

  static async crearTipoProyecto(nombre) {
    const n = String(nombre || '').trim();
    if (!n) throw new Error('Nombre de tipo requerido');
    const [result] = await pool.query(
      `INSERT INTO cotizacion_tipos_proyecto (nombre) VALUES (?)`,
      [n]
    );
    return { id: result.insertId, nombre: n };
  }

  static async listarResponsables() {
    const emails = COTIZACION_RESPONSABLES_EMAILS.map((e) => String(e).trim().toLowerCase());
    if (!emails.length) return [];
    const placeholders = emails.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT id, nombres, apellidos, email
       FROM empleados
       WHERE activo = 1
         AND LOWER(TRIM(email)) IN (${placeholders})`,
      emails
    );
    const orden = new Map(emails.map((e, i) => [e, i]));
    return rows.sort(
      (a, b) =>
        (orden.get(String(a.email || '').trim().toLowerCase()) ?? 99) -
        (orden.get(String(b.email || '').trim().toLowerCase()) ?? 99)
    );
  }

  static responsableIdsFromGeneral(general, fallbackId = null) {
    if (Array.isArray(general?.responsable_ids) && general.responsable_ids.length) {
      return general.responsable_ids.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0);
    }
    if (general?.responsable_id != null) {
      const n = Number(general.responsable_id);
      if (Number.isFinite(n) && n > 0) return [n];
    }
    if (fallbackId != null) {
      const n = Number(fallbackId);
      if (Number.isFinite(n) && n > 0) return [n];
    }
    return [];
  }

  static async listar(filtros = {}) {
    let sql = `
      SELECT c.*,
              CONCAT(e.nombres, ' ', e.apellidos) AS responsable_nombre,
              CONCAT(ec.nombres, ' ', ec.apellidos) AS creado_por_nombre,
              v.monto_propuesta AS version_monto,
              v.costo_total AS version_costo,
              v.created_at AS version_fecha
       FROM cotizaciones c
       LEFT JOIN empleados e ON e.id = c.responsable_id
       LEFT JOIN empleados ec ON ec.id = c.creado_por
       LEFT JOIN cotizacion_versiones v ON v.cotizacion_id = c.id AND v.es_actual = 1
       WHERE 1=1`;
    const params = [];

    const q = String(filtros.q || '').trim();
    if (q) {
      const like = `%${q}%`;
      sql += ` AND (
        c.codigo LIKE ? OR c.proyecto LIKE ? OR c.cliente LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(c.borrador_json, '$.general.ruc_cliente')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(c.borrador_json, '$.general.nombre_proyecto')) LIKE ?
      )`;
      params.push(like, like, like, like, like);
    }
    const ruc = String(filtros.ruc || '').trim().replace(/\D/g, '');
    if (ruc) {
      sql += ` AND REPLACE(JSON_UNQUOTE(JSON_EXTRACT(c.borrador_json, '$.general.ruc_cliente')), '-', '') LIKE ?`;
      params.push(`%${ruc}%`);
    }
    if (filtros.estado) {
      sql += ` AND c.estado = ?`;
      params.push(String(filtros.estado));
    }
    if (filtros.desde) {
      sql += ` AND DATE(c.updated_at) >= ?`;
      params.push(String(filtros.desde).slice(0, 10));
    }
    if (filtros.hasta) {
      sql += ` AND DATE(c.updated_at) <= ?`;
      params.push(String(filtros.hasta).slice(0, 10));
    }

    sql += ` ORDER BY c.updated_at DESC, c.id DESC`;
    const [rows] = await pool.query(sql, params);

    const allIds = new Set();
    for (const row of rows) {
      const borrador = parseJson(row.borrador_json, {});
      const gen = normalizarGeneralTipoProyecto(borrador.general || {});
      if (gen.tipo_proyecto) row.tipo_proyecto = gen.tipo_proyecto;
      if (gen.tipo_proyecto_codigo) row.tipo_proyecto_codigo = gen.tipo_proyecto_codigo;
      if (gen.ruc_cliente) row.ruc_cliente = gen.ruc_cliente;
      const ids = this.responsableIdsFromGeneral(borrador.general, row.responsable_id);
      row.responsable_ids = ids;
      ids.forEach((id) => allIds.add(id));
    }
    if (allIds.size) {
      const idList = [...allIds];
      const placeholders = idList.map(() => '?').join(',');
      const [emps] = await pool.query(
        `SELECT id, nombres, apellidos FROM empleados WHERE id IN (${placeholders})`,
        idList
      );
      const map = new Map(
        emps.map((e) => [e.id, `${e.nombres || ''} ${e.apellidos || ''}`.trim()])
      );
      for (const row of rows) {
        const nombres = row.responsable_ids.map((id) => map.get(id)).filter(Boolean);
        if (nombres.length) row.responsable_nombre = nombres.join(', ');
      }
    }
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT c.*,
              CONCAT(e.nombres, ' ', e.apellidos) AS responsable_nombre,
              CONCAT(ec.nombres, ' ', ec.apellidos) AS creado_por_nombre
       FROM cotizaciones c
       LEFT JOIN empleados e ON e.id = c.responsable_id
       LEFT JOIN empleados ec ON ec.id = c.creado_por
       WHERE c.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async listarVersiones(cotizacionId) {
    const [rows] = await pool.query(
      `SELECT v.*, CONCAT(e.nombres, ' ', e.apellidos) AS creado_por_nombre
       FROM cotizacion_versiones v
       LEFT JOIN empleados e ON e.id = v.creado_por
       WHERE v.cotizacion_id = ?
       ORDER BY v.version_num DESC`,
      [cotizacionId]
    );
    return rows.map((r) => ({
      ...r,
      cambios_json: parseJson(r.cambios_json, null)
    }));
  }

  static async obtenerVersion(cotizacionId, versionNum) {
    const [rows] = await pool.query(
      `SELECT v.*, CONCAT(e.nombres, ' ', e.apellidos) AS creado_por_nombre
       FROM cotizacion_versiones v
       LEFT JOIN empleados e ON e.id = v.creado_por
       WHERE v.cotizacion_id = ? AND v.version_num = ?`,
      [cotizacionId, versionNum]
    );
    return rows[0] || null;
  }

  static migrarBorradorLegacy(raw) {
    const b = parseJson(raw, borradorVacio());
    if (!b.general) b.general = { ...borradorVacio().general };
    if (b.general.proyecto && !b.general.nombre_proyecto) {
      b.general.nombre_proyecto = b.general.proyecto;
    }
    if (b.recursos && !b.costos) {
      b.costos = {
        recursos: b.recursos,
        parametros: borradorVacio().costos.parametros
      };
      delete b.recursos;
    }
    if (!b.actividades) b.actividades = borradorVacio().actividades;
    if (!b.costos) b.costos = borradorVacio().costos;
    if (!b.propuesta) b.propuesta = borradorVacio().propuesta;

    const hm = Number(b.costos?.parametros?.horas_mes) || 160;
    if (Array.isArray(b.costos?.recursos)) {
      b.costos.recursos = b.costos.recursos.map((r) => {
        const next = { ...r };
        if (next.horas_asignadas == null && next.tiempo_meses != null) {
          next.horas_asignadas = Number(next.tiempo_meses) * hm;
        }
        if (next.horas_asignadas == null) {
          next.horas_asignadas = Number(next.horas) || 0;
        }
        return next;
      });
    }

    delete b.actividades.holgura_pct;
    delete b.actividades.holgura_horas;
    delete b.actividades.holgura_global;

    if (Array.isArray(b.actividades.bloques)) {
      b.actividades.bloques = b.actividades.bloques.map((bl) => ({
        ...bl,
        actividades: (bl.actividades || []).map((a) => ({
          ...a,
          holgura_horas: a.holgura_horas ?? 0
        }))
      }));
    }

    if (Array.isArray(b.propuesta?.items) && !(b.propuesta.inversion_roles?.length)) {
      b.propuesta.inversion_roles = b.propuesta.items;
    }
    if (!b.propuesta.inversion_roles?.length) {
      b.propuesta.inversion_roles = borradorVacio().propuesta.inversion_roles;
    }
    if (!b.propuesta.pagos_entregables?.length) {
      b.propuesta.pagos_entregables = borradorVacio().propuesta.pagos_entregables;
    }
    if (!b.propuesta.detalle?.length) {
      b.propuesta.detalle = borradorVacio().propuesta.detalle;
    } else {
      b.propuesta.detalle = b.propuesta.detalle.map((d) => ({
        ...d,
        horas: d.horas ?? d.semanas ?? 0
      }));
    }
    if (!b.propuesta.pagos_forma?.length) {
      b.propuesta.pagos_forma = borradorVacio().propuesta.pagos_forma;
    }

    const defParams = borradorVacio().costos.parametros;
    if (b.costos?.parametros) {
      if (b.costos.parametros.horas_garantia == null && b.costos.parametros.dias_garantia != null) {
        b.costos.parametros.horas_garantia = Number(b.costos.parametros.dias_garantia) || 0;
      }
      if (!Array.isArray(b.costos.parametros.markups)) {
        b.costos.parametros.markups = defParams.markups;
      }
      if (b.costos.parametros.proyeccion_activa == null) {
        b.costos.parametros.proyeccion_activa = 0;
      }
      if (!b.costos.parametros.moneda_proyeccion) {
        b.costos.parametros.moneda_proyeccion = 'USD';
      }
    }
    if (Array.isArray(b.horas_perfil) && b.horas_perfil.length && !(b.actividades.bloques || []).length) {
      b.actividades.bloques = [
        {
          id: `legacy-${Date.now()}`,
          nombre: 'Actividades importadas',
          orden: 1,
          actividades: b.horas_perfil.map((h, i) => ({
            id: `la-${i}`,
            orden: i + 1,
            descripcion: h.nombre || h.paquete_id || `Paquete ${i + 1}`,
            horas: h.total_horas || 0
          }))
        }
      ];
    }
    return b;
  }

  static enriquecerBorrador(raw, cotRow = null) {
    const base = this.migrarBorradorLegacy(raw);
    base.general = normalizarGeneralTipoProyecto(base.general);
    const tipoProy =
      base.general?.tipo_proyecto_codigo ||
      base.general?.tipo_proyecto ||
      cotRow?.tipo_proyecto_codigo ||
      cotRow?.tipo_proyecto;
    base.actividades.tipo_estructura = estructuraDesdeTipoProyecto(tipoProy);
    if (
      base.actividades.tipo_estructura === 'bolsa_horas' &&
      !(base.actividades.bloques || []).length
    ) {
      base.actividades.bloques = [
        { id: 'bolsa-unica', nombre: 'Bolsa de horas', orden: 1, actividades: [] }
      ];
    }
    if (cotRow) {
      base.general.codigo = cotRow.codigo || base.general.codigo;
      base.general.nombre_proyecto = base.general.nombre_proyecto || cotRow.proyecto || '';
      base.general.cliente = base.general.cliente || cotRow.cliente || '';
      base.general.tipo_proyecto = base.general.tipo_proyecto || cotRow.tipo_proyecto || '';
      base.general.tipo_proyecto_codigo =
        base.general.tipo_proyecto_codigo || cotRow.tipo_proyecto_codigo || '';
      base.general = normalizarGeneralTipoProyecto(base.general);
      const ids = this.responsableIdsFromGeneral(base.general, cotRow.responsable_id);
      base.general.responsable_ids = ids.length ? ids : base.general.responsable_ids || [];
      base.general.responsable_id = base.general.responsable_id || ids[0] || cotRow.responsable_id;
      base.general.notas_internas = base.general.notas_internas || cotRow.notas_internas || '';
      base.general.estado = base.general.estado || cotRow.estado || 'borrador';
    }
    return calcularCotizacion(base);
  }

  static async obtenerDetalle(id) {
    const cot = await this.buscarPorId(id);
    if (!cot) return null;
    const borrador = this.enriquecerBorrador(cot.borrador_json, cot);
    const versiones = await this.listarVersiones(id);
    const versionActual = versiones.find((v) => v.es_actual) || null;
    return { cotizacion: cot, borrador, versiones, versionActual };
  }

  static validarGeneral(general) {
    const cliente = String(general?.cliente || '').trim();
    const nombre = String(general?.nombre_proyecto || general?.proyecto || '').trim();
    if (!cliente) throw new Error('El cliente es obligatorio');
    if (!nombre) throw new Error('El nombre del proyecto es obligatorio');
    const generalNorm = normalizarGeneralTipoProyecto(general);
    if (!generalNorm.tipo_proyecto_codigo && !generalNorm.tipo_proyecto) {
      throw new Error('El tipo de proyecto es obligatorio');
    }
    if (!tipoProyectoValido(generalNorm)) {
      throw new Error('Seleccione un tipo de proyecto válido del catálogo');
    }
    const respIds = this.responsableIdsFromGeneral(general);
    if (!respIds.length) throw new Error('Debe seleccionar al menos un responsable');
    return true;
  }

  static syncFromBorrador(borrador) {
    return {
      cliente: borrador.general.cliente,
      proyecto: borrador.general.nombre_proyecto,
      tipo_proyecto: borrador.general.tipo_proyecto,
      tipo_proyecto_codigo: borrador.general.tipo_proyecto_codigo || null,
      notas_internas: borrador.general.notas_internas || null,
      moneda: borrador.costos?.parametros?.moneda || 'PEN',
      responsable_id: borrador.general.responsable_id,
      estado: borrador.general.estado || 'borrador'
    };
  }

  static async crear(usuarioId, payload) {
    const g = payload?.general || payload || {};
    let codigo = String(g.codigo || '').trim();
    if (codigo) {
      if (!(await this.codigoDisponible(codigo))) {
        throw new Error('El código de cotización ya existe');
      }
    } else {
      codigo = await this.generarCodigo();
    }

    const borradorBase = borradorVacio();
    const respIn = Array.isArray(g.responsable_ids)
      ? g.responsable_ids
      : g.responsable_id
        ? [g.responsable_id]
        : [usuarioId];
    borradorBase.general = normalizarGeneralTipoProyecto({
      ...borradorBase.general,
      codigo,
      estado: g.estado || 'borrador',
      nombre_proyecto: g.nombre_proyecto || g.proyecto || '',
      cliente: g.cliente || '',
      tipo_proyecto_codigo: g.tipo_proyecto_codigo || '',
      tipo_proyecto: g.tipo_proyecto || '',
      responsable_ids: respIn,
      responsable_id: respIn[0] || usuarioId,
      ruc_cliente: g.ruc_cliente || '',
      notas_internas: g.notas_internas || ''
    });

    const tipoRef =
      borradorBase.general.tipo_proyecto_codigo || borradorBase.general.tipo_proyecto;
    borradorBase.actividades = {
      ...(borradorBase.actividades || {}),
      tipo_estructura: estructuraDesdeTipoProyecto(tipoRef)
    };
    if (
      borradorBase.actividades.tipo_estructura === 'bolsa_horas' &&
      !(borradorBase.actividades.bloques || []).length
    ) {
      borradorBase.actividades.bloques = [
        { id: 'bolsa-inicial', nombre: 'Bolsa de horas', orden: 1, actividades: [] }
      ];
    }

    const borrador = calcularCotizacion(borradorBase);
    this.validarGeneral(borrador.general);
    const sync = this.syncFromBorrador(borrador);

    const [result] = await pool.query(
      `INSERT INTO cotizaciones
        (codigo, cliente, proyecto, tipo_proyecto, tipo_proyecto_codigo, notas_internas, moneda, estado,
         version_actual, borrador_json, creado_por, responsable_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        codigo,
        sync.cliente,
        sync.proyecto,
        sync.tipo_proyecto,
        sync.tipo_proyecto_codigo,
        sync.notas_internas,
        sync.moneda,
        sync.estado,
        JSON.stringify(borrador),
        usuarioId,
        sync.responsable_id
      ]
    );

    const id = result.insertId;
    await this.publicarVersion(id, 'Versión inicial', usuarioId);
    return this.obtenerDetalle(id);
  }

  static async snapshotVersionActual(cotizacionId) {
    const [rows] = await pool.query(
      `SELECT snapshot_json FROM cotizacion_versiones
       WHERE cotizacion_id = ? AND es_actual = 1 ORDER BY version_num DESC LIMIT 1`,
      [cotizacionId]
    );
    return rows[0] ? parseJson(rows[0].snapshot_json, null) : null;
  }

  static async registrarVersionSiCambio(cotizacionId, borrador, usuarioId, comentario = null) {
    const cot = await this.buscarPorId(cotizacionId);
    if (!cot) throw new Error('Cotización no encontrada');

    const prevSnap = await this.snapshotVersionActual(cotizacionId);
    if (prevSnap && JSON.stringify(prevSnap) === JSON.stringify(borrador)) {
      return cot.version_actual;
    }
    const cambios = diffCotizacionSnapshots(prevSnap, borrador);

    const nuevaVersion = Number(cot.version_actual || 0) + 1;
    const comentarioFinal = String(comentario || '').trim() || null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`UPDATE cotizacion_versiones SET es_actual = 0 WHERE cotizacion_id = ?`, [
        cotizacionId
      ]);
      await conn.query(
        `INSERT INTO cotizacion_versiones
          (cotizacion_id, version_num, comentario_cambio, cambios_json, snapshot_json, es_actual,
           monto_propuesta, costo_total, creado_por)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          cotizacionId,
          nuevaVersion,
          comentarioFinal,
          JSON.stringify(cambios),
          JSON.stringify(borrador),
          borrador.calculados?.monto_propuesta ?? null,
          borrador.calculados?.costo_total ?? null,
          usuarioId
        ]
      );
      await conn.query(
        `UPDATE cotizaciones SET version_actual = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [nuevaVersion, cotizacionId]
      );
      await conn.commit();
      return nuevaVersion;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  static async actualizarBorrador(id, payload, opts = {}) {
    const cot = await this.buscarPorId(id);
    if (!cot) throw new Error('Cotización no encontrada');

    const comentarioVersion =
      payload?.comentario_version != null ? payload.comentario_version : opts.comentarioVersion;
    const clean = { ...(payload || {}) };
    delete clean.comentario_version;

    const prev = parseJson(cot.borrador_json, borradorVacio());
    const merged = {
      general: { ...prev.general, ...(clean.general || {}) },
      actividades: clean.actividades != null ? clean.actividades : prev.actividades,
      costos: clean.costos != null ? clean.costos : prev.costos,
      propuesta: clean.propuesta != null ? clean.propuesta : prev.propuesta
    };
    merged.general.codigo = cot.codigo;
    merged.general = normalizarGeneralTipoProyecto(merged.general);
    const tipoRefUpd = merged.general.tipo_proyecto_codigo || merged.general.tipo_proyecto;
    merged.actividades = {
      ...merged.actividades,
      tipo_estructura: estructuraDesdeTipoProyecto(tipoRefUpd)
    };

    const borrador = calcularCotizacion(merged);
    this.validarGeneral(borrador.general);
    const sync = this.syncFromBorrador(borrador);

    await pool.query(
      `UPDATE cotizaciones SET
        cliente = ?, proyecto = ?, tipo_proyecto = ?, tipo_proyecto_codigo = ?, notas_internas = ?,
        moneda = ?, estado = ?, responsable_id = ?,
        borrador_json = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        sync.cliente,
        sync.proyecto,
        sync.tipo_proyecto,
        sync.tipo_proyecto_codigo,
        sync.notas_internas,
        sync.moneda,
        sync.estado,
        sync.responsable_id,
        JSON.stringify(borrador),
        id
      ]
    );

    if (opts.usuarioId) {
      await this.registrarVersionSiCambio(id, borrador, opts.usuarioId, comentarioVersion);
    }
    return this.obtenerDetalle(id);
  }

  static async publicarVersion(id, comentario, usuarioId) {
    const cot = await this.buscarPorId(id);
    if (!cot) throw new Error('Cotización no encontrada');
    const borrador = this.enriquecerBorrador(cot.borrador_json, cot);
    this.validarGeneral(borrador.general);
    await this.registrarVersionSiCambio(id, borrador, usuarioId, comentario);
    return this.obtenerDetalle(id);
  }

  static async restaurarVersion(id, versionNum, comentario, usuarioId) {
    const version = await this.obtenerVersion(id, versionNum);
    if (!version) throw new Error('Versión no encontrada');
    const snapshot = parseJson(version.snapshot_json, null);
    if (!snapshot) throw new Error('Snapshot inválido');
    await this.actualizarBorrador(id, snapshot);
    return this.publicarVersion(
      id,
      comentario || `Restaurada desde versión ${versionNum}`,
      usuarioId
    );
  }

  static async eliminar(id) {
    await pool.query(
      `UPDATE cotizacion_solicitudes SET
        cotizacion_id = NULL,
        estado = CASE WHEN estado = 'atendida' THEN estado ELSE 'enviada' END,
        updated_at = CURRENT_TIMESTAMP
       WHERE cotizacion_id = ?`,
      [id]
    );
    const [result] = await pool.query(`DELETE FROM cotizaciones WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Cotizacion;
