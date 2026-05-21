const { pool } = require('../config/database');
const {
  TIPOS_PROVEEDOR_VALUES,
  AREAS_SOLICITANTE_VALUES
} = require('../constants/proveedoresCatalogos');

class Proveedor {
  static validarTipo(tipo, otro) {
    if (!TIPOS_PROVEEDOR_VALUES.has(tipo)) return 'Tipo de proveedor no válido';
    if (tipo === 'otros' && !(otro && String(otro).trim())) {
      return 'Indique el tipo cuando selecciona Otros';
    }
    return null;
  }

  static validarArea(area, otro) {
    if (!AREAS_SOLICITANTE_VALUES.has(area)) return 'Área solicitante no válida';
    if (area === 'otros' && !(otro && String(otro).trim())) {
      return 'Indique el área cuando selecciona Otros';
    }
    return null;
  }

  static async listar(filtros = {}) {
    let q = `SELECT p.* FROM proveedores p WHERE p.activo = 1`;
    const params = [];
    if (filtros.q) {
      q += ` AND (p.razon_social LIKE ? OR p.producto_servicio LIKE ? OR p.contacto_prayaga LIKE ?)`;
      const t = `%${filtros.q}%`;
      params.push(t, t, t);
    }
    if (filtros.tipo_proveedor) {
      q += ` AND p.tipo_proveedor = ?`;
      params.push(filtros.tipo_proveedor);
    }
    q += ` ORDER BY p.razon_social ASC`;
    const [rows] = await pool.execute(q, params);
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.execute(`SELECT * FROM proveedores WHERE id = ?`, [id]);
    return rows[0];
  }

  static async crear(datos) {
    const errTipo = this.validarTipo(datos.tipo_proveedor, datos.tipo_proveedor_otro);
    if (errTipo) throw new Error(errTipo);
    const errArea = this.validarArea(datos.area_solicitante, datos.area_otro);
    if (errArea) throw new Error(errArea);

    const [r] = await pool.execute(
      `INSERT INTO proveedores
       (razon_social, tipo_proveedor, tipo_proveedor_otro, website, fecha_registro,
        area_solicitante, area_otro, producto_servicio, contacto_prayaga,
        nombre_contacto_proveedor, datos_proveedor, evaluacion_origen_id, candidato_origen_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.razon_social.trim(),
        datos.tipo_proveedor,
        datos.tipo_proveedor === 'otros' ? datos.tipo_proveedor_otro?.trim() || null : null,
        datos.website?.trim() || null,
        datos.fecha_registro,
        datos.area_solicitante,
        datos.area_solicitante === 'otros' ? datos.area_otro?.trim() || null : null,
        datos.producto_servicio.trim(),
        datos.contacto_prayaga.trim(),
        datos.nombre_contacto_proveedor?.trim() || null,
        datos.datos_proveedor?.trim() || null,
        datos.evaluacion_origen_id || null,
        datos.candidato_origen_id || null
      ]
    );
    return r.insertId;
  }

  static async actualizar(id, datos) {
    const errTipo = this.validarTipo(datos.tipo_proveedor, datos.tipo_proveedor_otro);
    if (errTipo) throw new Error(errTipo);
    const errArea = this.validarArea(datos.area_solicitante, datos.area_otro);
    if (errArea) throw new Error(errArea);

    const [r] = await pool.execute(
      `UPDATE proveedores SET
         razon_social = ?, tipo_proveedor = ?, tipo_proveedor_otro = ?, website = ?,
         fecha_registro = ?, area_solicitante = ?, area_otro = ?, producto_servicio = ?,
         contacto_prayaga = ?, nombre_contacto_proveedor = ?, datos_proveedor = ?
       WHERE id = ? AND activo = 1`,
      [
        datos.razon_social.trim(),
        datos.tipo_proveedor,
        datos.tipo_proveedor === 'otros' ? datos.tipo_proveedor_otro?.trim() || null : null,
        datos.website?.trim() || null,
        datos.fecha_registro,
        datos.area_solicitante,
        datos.area_solicitante === 'otros' ? datos.area_otro?.trim() || null : null,
        datos.producto_servicio.trim(),
        datos.contacto_prayaga.trim(),
        datos.nombre_contacto_proveedor?.trim() || null,
        datos.datos_proveedor?.trim() || null,
        id
      ]
    );
    return r.affectedRows > 0;
  }

  static async eliminar(id) {
    const [r] = await pool.execute(`UPDATE proveedores SET activo = 0 WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  }
}

module.exports = Proveedor;
