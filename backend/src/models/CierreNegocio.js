const { pool } = require('../config/database');
const Cotizacion = require('./Cotizacion');
const {
  parseJson,
  facturacionDesdeCotizacion,
  costosDesdeCotizacion,
  hojasCostoDesdeCotizacion,
  enriquecerSnapshotDesdeBorrador,
  snapshotTieneActividades,
  snapshotTieneDatos,
  snapshotTieneEconomicos,
  facturacionVacia,
  monedaDesdeSnapshot,
  num,
  calcularReporte,
  cabeceraDesdeCotizacion
} = require('../services/cierreNegocioService');

class CierreNegocio {
  static async generarCodigo() {
    const year = new Date().getFullYear();
    const prefix = `CN-${year}-`;
    const [rows] = await pool.query(`SELECT codigo FROM cierres_negocio WHERE codigo LIKE ?`, [
      `${prefix}%`
    ]);
    const usados = new Set();
    const re = new RegExp(`^CN-${year}-(\\d+)$`);
    for (const row of rows) {
      const m = String(row.codigo || '').match(re);
      if (m) usados.add(parseInt(m[1], 10));
    }
    let n = 1;
    while (usados.has(n)) n += 1;
    return `${prefix}${String(n).padStart(3, '0')}`;
  }

  static async listarFacturacion(cierreId) {
    const [rows] = await pool.query(
      `SELECT * FROM cierre_facturacion WHERE cierre_id = ? ORDER BY orden ASC, id ASC`,
      [cierreId]
    );
    return rows;
  }

  static async listarCostos(cierreId, fase = null) {
    let sql = `SELECT * FROM cierre_costos WHERE cierre_id = ?`;
    const params = [cierreId];
    if (fase) {
      sql += ` AND fase = ?`;
      params.push(fase);
    }
    sql += ` ORDER BY orden ASC, id ASC`;
    const [rows] = await pool.query(sql, params);
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT c.*,
              CONCAT(e.nombres, ' ', e.apellidos) AS creado_por_nombre,
              COALESCE(
                cot.proyecto,
                JSON_UNQUOTE(JSON_EXTRACT(c.snapshot_cotizacion, '$.general.nombre_proyecto'))
              ) AS cotizacion_proyecto
       FROM cierres_negocio c
       LEFT JOIN empleados e ON e.id = c.creado_por
       LEFT JOIN cotizaciones cot ON cot.id = c.cotizacion_id
       WHERE c.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async listar() {
    const [rows] = await pool.query(
      `SELECT c.*,
              CONCAT(e.nombres, ' ', e.apellidos) AS creado_por_nombre,
              COALESCE(
                cot.proyecto,
                JSON_UNQUOTE(JSON_EXTRACT(c.snapshot_cotizacion, '$.general.nombre_proyecto'))
              ) AS cotizacion_proyecto
       FROM cierres_negocio c
       LEFT JOIN empleados e ON e.id = c.creado_por
       LEFT JOIN cotizaciones cot ON cot.id = c.cotizacion_id
       WHERE c.estado != 'eliminado'
       ORDER BY c.updated_at DESC, c.id DESC`
    );
    return rows;
  }

  static async listarCotizacionesDisponibles() {
    const [rows] = await pool.query(
      `SELECT c.id, c.codigo, c.cliente, c.proyecto, c.version_actual,
              v.monto_propuesta, v.costo_total
       FROM cotizaciones c
       LEFT JOIN cotizacion_versiones v ON v.cotizacion_id = c.id AND v.es_actual = 1
       ORDER BY c.updated_at DESC`
    );
    return rows;
  }

  static async obtenerSnapshotCotizacion(cotizacionId, versionNum) {
    const cot = await Cotizacion.buscarPorId(cotizacionId);
    if (!cot) throw new Error('Cotización no encontrada');

    const borradorActual = Cotizacion.enriquecerBorrador(cot.borrador_json, cot);
    let snapshotVersion = null;
    const vn = Number(versionNum) || cot.version_actual || 1;
    if (vn > 0) {
      const version = await Cotizacion.obtenerVersion(cotizacionId, vn);
      if (version?.snapshot_json) {
        snapshotVersion = Cotizacion.enriquecerBorrador(version.snapshot_json, cot);
      }
    }
    const snapshot = enriquecerSnapshotDesdeBorrador(snapshotVersion, borradorActual);
    return { cotizacion: cot, snapshot, versionNum: vn };
  }

  static async resolverSnapshotParaCierre(cierre) {
    const snapshot = parseJson(cierre.snapshot_cotizacion, {});
    if (!cierre.cotizacion_id) return snapshot;
    if (snapshotTieneActividades(snapshot) && snapshotTieneEconomicos(snapshot)) return snapshot;
    try {
      const { snapshot: fresh } = await this.obtenerSnapshotCotizacion(
        cierre.cotizacion_id,
        cierre.cotizacion_version_num
      );
      return fresh;
    } catch {
      return snapshot;
    }
  }

  static async insertarLineas(cierreId, facturacion, costos) {
    for (const f of facturacion || []) {
      await pool.query(
        `INSERT INTO cierre_facturacion
          (cierre_id, item_num, factura, descripcion, fecha_inicio, fecha_fin,
           fecha_estimada_facturacion, fecha_real_facturacion, cantidad, precio_unitario,
           aplica_igv, total_venta, observaciones, estado_linea, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cierreId,
          f.item_num ?? null,
          f.factura || null,
          f.descripcion || null,
          f.fecha_inicio || null,
          f.fecha_fin || null,
          f.fecha_estimada_facturacion || null,
          f.fecha_real_facturacion || null,
          f.cantidad ?? 1,
          f.precio_unitario ?? 0,
          f.aplica_igv ? 1 : 0,
          f.total_venta ?? 0,
          f.observaciones || null,
          f.estado_linea || null,
          f.orden ?? 0
        ]
      );
    }
    for (const c of costos || []) {
      await pool.query(
        `INSERT INTO cierre_costos
          (cierre_id, fase, hoja_nombre, titulo, cantidad, dias, precio_unitario, total_costo,
           utilidad, margen_pct, proveedor, observacion, referencia_rhe, monto_adicional, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cierreId,
          c.fase || 'reporte',
          c.hoja_nombre || null,
          c.titulo || null,
          c.cantidad ?? 1,
          c.dias ?? null,
          c.precio_unitario ?? 0,
          c.total_costo ?? 0,
          c.utilidad ?? 0,
          c.margen_pct ?? 0,
          c.proveedor || null,
          c.observacion || null,
          c.referencia_rhe || null,
          c.monto_adicional ?? null,
          c.orden ?? 0
        ]
      );
    }
  }

  static async reemplazarLineas(cierreId, facturacion, costos) {
    await pool.query(`DELETE FROM cierre_facturacion WHERE cierre_id = ?`, [cierreId]);
    await pool.query(`DELETE FROM cierre_costos WHERE cierre_id = ?`, [cierreId]);
    await this.insertarLineas(cierreId, facturacion, costos);
  }

  static async crearManual(usuarioId, payload = {}) {
    const cliente = String(payload.cliente_nombre || '').trim();
    if (!cliente) throw new Error('cliente_nombre es obligatorio');

    const codigo = String(payload.codigo || '').trim() || (await this.generarCodigo());
    const proyecto = String(payload.proyecto || payload.proyecto_nombre || '').trim();
    const moneda = String(payload.moneda || 'PEN').toUpperCase() === 'USD' ? 'USD' : 'PEN';
    const snapshot = proyecto
      ? { general: { nombre_proyecto: proyecto, cliente } }
      : { general: { cliente } };

    const [result] = await pool.query(
      `INSERT INTO cierres_negocio
        (codigo, cotizacion_id, cotizacion_version_num, cotizacion_codigo, snapshot_cotizacion,
         cliente_nombre, ruc, orden_compra, fecha_inicio, fecha_fin, semanas_proyecto,
         forma_pago, moneda, codigo_servicio, riesgo, status_cierre, dias_garantia, creado_por)
       VALUES (?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        payload.cotizacion_codigo || null,
        JSON.stringify(snapshot),
        cliente,
        payload.ruc || null,
        payload.orden_compra || null,
        payload.fecha_inicio || null,
        payload.fecha_fin || null,
        payload.semanas_proyecto ?? null,
        payload.forma_pago || 'Crédito 30 días',
        moneda,
        payload.codigo_servicio || null,
        payload.riesgo || 'medio',
        payload.status_cierre || 'inicial',
        payload.dias_garantia ?? 0,
        usuarioId
      ]
    );

    const facturacion = payload.facturacion || [];
    const costos = payload.costos || [];
    if (facturacion.length || costos.length) {
      await this.insertarLineas(result.insertId, facturacion, costos);
    }

    return this.obtenerDetalle(result.insertId);
  }

  static async crearDesdeCotizacion(usuarioId, cotizacionId, versionNum) {
    const { cotizacion, snapshot, versionNum: vn } = await this.obtenerSnapshotCotizacion(
      cotizacionId,
      versionNum
    );

    const codigo = await this.generarCodigo();
    const cab = cabeceraDesdeCotizacion(cotizacion, snapshot, vn);
    const facturacion = facturacionDesdeCotizacion(snapshot).map((f, i) => ({
      ...f,
      item_num: i + 1
    }));
    const costos = costosDesdeCotizacion(snapshot);
    const hojasCosto = hojasCostoDesdeCotizacion(snapshot);

    const [result] = await pool.query(
      `INSERT INTO cierres_negocio
        (codigo, cotizacion_id, cotizacion_version_num, cotizacion_codigo, snapshot_cotizacion,
         cliente_nombre, ruc, orden_compra, fecha_inicio, fecha_fin, semanas_proyecto,
         forma_pago, moneda, codigo_servicio, riesgo, status_cierre, dias_garantia,
         tipo_cambio, hojas_costo_var, creado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo,
        cab.cotizacion_id,
        cab.cotizacion_version_num,
        cab.cotizacion_codigo,
        JSON.stringify(snapshot),
        cab.cliente_nombre,
        cab.ruc,
        cab.orden_compra,
        null,
        null,
        cab.semanas_proyecto,
        cab.forma_pago,
        cab.moneda,
        cab.codigo_servicio,
        cab.riesgo,
        cab.status_cierre,
        cab.dias_garantia,
        null,
        JSON.stringify(hojasCosto),
        usuarioId
      ]
    );

    await this.insertarLineas(result.insertId, facturacion, costos);
    return this.obtenerDetalle(result.insertId);
  }

  static async actualizar(id, payload) {
    const cierre = await this.buscarPorId(id);
    if (!cierre) throw new Error('Cierre no encontrado');

    const fields = [
      'cliente_nombre',
      'ruc',
      'orden_compra',
      'fecha_inicio',
      'fecha_fin',
      'semanas_proyecto',
      'forma_pago',
      'moneda',
      'codigo_servicio',
      'cotizacion_codigo',
      'riesgo',
      'status_cierre',
      'dias_garantia',
      'direccion',
      'atencion',
      'cargo_atencion',
      'email_cliente',
      'telefono_cliente',
      'solicitante',
      'email_solicitante',
      'tipo_cambio'
    ];

    const sets = [];
    const vals = [];
    for (const f of fields) {
      if (payload[f] !== undefined) {
        sets.push(`${f} = ?`);
        vals.push(payload[f]);
      }
    }

    if (payload.hojas_costo_var !== undefined) {
      sets.push('hojas_costo_var = ?');
      vals.push(JSON.stringify(payload.hojas_costo_var));
    }

    if (payload.proyecto !== undefined && !cierre.cotizacion_id) {
      const snap = parseJson(cierre.snapshot_cotizacion, { general: {} });
      snap.general = {
        ...snap.general,
        nombre_proyecto: payload.proyecto,
        cliente: payload.cliente_nombre ?? cierre.cliente_nombre
      };
      sets.push('snapshot_cotizacion = ?');
      vals.push(JSON.stringify(snap));
    }

    if (sets.length) {
      vals.push(id);
      await pool.query(`UPDATE cierres_negocio SET ${sets.join(', ')} WHERE id = ?`, vals);
    }

    if (payload.facturacion || payload.costos) {
      await this.reemplazarLineas(id, payload.facturacion, payload.costos);
    }

    return this.obtenerDetalle(id);
  }

  static async sincronizarEconomicoDesdeSnapshot(cierreId, snapshot) {
    const facturacion = facturacionDesdeCotizacion(snapshot).map((f, i) => ({
      ...f,
      item_num: i + 1
    }));
    const costos = costosDesdeCotizacion(snapshot);
    const tieneMontos = facturacion.some(
      (f) => num(f.total_venta) > 0 || num(f.precio_unitario) > 0
    );
    if (!tieneMontos) return false;

    await this.reemplazarLineas(cierreId, facturacion, costos);
    const moneda = monedaDesdeSnapshot(snapshot);
    const hojasCosto = hojasCostoDesdeCotizacion(snapshot);
    await pool.query(
      `UPDATE cierres_negocio
       SET moneda = ?, snapshot_cotizacion = ?, hojas_costo_var = ?
       WHERE id = ?`,
      [moneda, JSON.stringify(snapshot), JSON.stringify(hojasCosto), cierreId]
    );
    return true;
  }

  static async obtenerDetalle(id) {
    const cierre = await this.buscarPorId(id);
    if (!cierre) return null;

    let facturacion = await this.listarFacturacion(id);
    let costos = await this.listarCostos(id);
    const snapshot = await this.resolverSnapshotParaCierre(cierre);

    if (cierre.cotizacion_id && facturacionVacia(facturacion)) {
      const ok = await this.sincronizarEconomicoDesdeSnapshot(id, snapshot);
      if (ok) {
        facturacion = await this.listarFacturacion(id);
        costos = await this.listarCostos(id);
        cierre.moneda = monedaDesdeSnapshot(snapshot);
      }
    }

    const hojas_costo = parseJson(cierre.hojas_costo_var, []);
    const reporte = calcularReporte(cierre, facturacion, costos, snapshot);

    return { cierre, facturacion, costos, hojas_costo, reporte, snapshot };
  }

  static async eliminar(id) {
    const [r] = await pool.query(`UPDATE cierres_negocio SET estado = 'eliminado' WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  }
}

module.exports = CierreNegocio;
