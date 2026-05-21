const { pool } = require('../config/database');
const {
  PUNTAJE_CRITERIO_OPCIONES,
  calcularPuntajeTotal
} = require('../constants/proveedoresCatalogos');

function validarCandidato(c, idx) {
  const pref = `Candidato ${idx + 1}: `;
  if (!c.razon_social?.trim()) return pref + 'razón social requerida';
  const legal = c.cumplimiento_legal;
  if (!['si', 'no', 'na'].includes(legal)) return pref + 'cumplimiento legal inválido';
  for (const campo of ['puntaje_experiencia', 'puntaje_precio', 'puntaje_iso']) {
    const v = Number(c[campo]);
    if (!PUNTAJE_CRITERIO_OPCIONES.includes(v)) {
      return pref + `${campo} debe ser 10, 20 o 30`;
    }
  }
  const va = Number(c.puntaje_valor_agregado);
  if (Number.isNaN(va) || va < 0 || va > 10) {
    return pref + 'valor agregado debe ser entre 0 y 10';
  }
  return null;
}

function mapCandidatoRow(row) {
  return {
    ...row,
    puntaje_total: calcularPuntajeTotal(row)
  };
}

class EvaluacionProveedor {
  static async listar() {
    const [rows] = await pool.execute(
      `SELECT e.*,
              p.razon_social AS proveedor_registrado_nombre,
              c.razon_social AS ganador_nombre
       FROM evaluaciones_proveedor e
       LEFT JOIN proveedores p ON e.proveedor_registrado_id = p.id
       LEFT JOIN evaluacion_proveedor_candidatos c ON e.candidato_ganador_id = c.id
       ORDER BY e.fecha DESC, e.id DESC`
    );
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.execute(`SELECT * FROM evaluaciones_proveedor WHERE id = ?`, [id]);
    return rows[0];
  }

  static async listarCandidatos(evaluacionId) {
    const [rows] = await pool.execute(
      `SELECT * FROM evaluacion_proveedor_candidatos
       WHERE evaluacion_id = ?
       ORDER BY orden ASC, id ASC`,
      [evaluacionId]
    );
    return rows.map(mapCandidatoRow).sort((a, b) => b.puntaje_total - a.puntaje_total);
  }

  static async obtenerDetalle(id) {
    const ev = await this.buscarPorId(id);
    if (!ev) return null;
    const candidatos = await this.listarCandidatos(id);
    let ganador = candidatos[0] || null;
    if (ev.candidato_ganador_id) {
      ganador = candidatos.find((c) => c.id === ev.candidato_ganador_id) || ganador;
    }
    const [provRows] = await pool.execute(
      `SELECT id, razon_social FROM proveedores WHERE evaluacion_origen_id = ? AND activo = 1 LIMIT 1`,
      [id]
    );
    return {
      evaluacion: ev,
      candidatos,
      ganador,
      proveedor_registrado: provRows[0] || null
    };
  }

  static async crear(datos, creadoPor) {
    if (!datos.fecha || !datos.detalle?.trim()) {
      throw new Error('Fecha y detalle son requeridos');
    }
    const oc = datos.oc_asociada === 'si' ? 'si' : 'no';
    const candidatos = Array.isArray(datos.candidatos) ? datos.candidatos : [];
    if (candidatos.length < 1) {
      throw new Error('Agregue al menos un proveedor a evaluar');
    }
    for (let i = 0; i < candidatos.length; i++) {
      const err = validarCandidato(candidatos[i], i);
      if (err) throw new Error(err);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.execute(
        `INSERT INTO evaluaciones_proveedor (fecha, oc_asociada, detalle, creado_por, estado)
         VALUES (?, ?, ?, ?, 'borrador')`,
        [datos.fecha, oc, datos.detalle.trim(), creadoPor || null]
      );
      const evaluacionId = ins.insertId;
      let orden = 0;
      let mejorId = null;
      let mejorPuntaje = -1;
      for (const c of candidatos) {
        const [r] = await conn.execute(
          `INSERT INTO evaluacion_proveedor_candidatos
           (evaluacion_id, razon_social, direccion, cumplimiento_legal,
            puntaje_experiencia, puntaje_precio, puntaje_iso, puntaje_valor_agregado,
            obs_experiencia, obs_precio, obs_iso, obs_valor_agregado, orden)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            evaluacionId,
            c.razon_social.trim(),
            c.direccion?.trim() || null,
            c.cumplimiento_legal || 'na',
            Number(c.puntaje_experiencia),
            Number(c.puntaje_precio),
            Number(c.puntaje_iso),
            Number(c.puntaje_valor_agregado),
            c.obs_experiencia?.trim() || null,
            c.obs_precio?.trim() || null,
            c.obs_iso?.trim() || null,
            c.obs_valor_agregado?.trim() || null,
            orden++
          ]
        );
        const total = calcularPuntajeTotal(c);
        if (total > mejorPuntaje) {
          mejorPuntaje = total;
          mejorId = r.insertId;
        }
      }
      await conn.execute(
        `UPDATE evaluaciones_proveedor SET candidato_ganador_id = ? WHERE id = ?`,
        [mejorId, evaluacionId]
      );
      await conn.commit();
      return evaluacionId;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  static async actualizar(id, datos) {
    const ev = await this.buscarPorId(id);
    if (!ev) throw new Error('Evaluación no encontrada');
    if (ev.proveedor_registrado_id) {
      throw new Error('No se puede editar: el ganador ya fue registrado en la lista');
    }
    if (!datos.fecha || !datos.detalle?.trim()) {
      throw new Error('Fecha y detalle son requeridos');
    }
    const oc = datos.oc_asociada === 'si' ? 'si' : 'no';
    const candidatos = Array.isArray(datos.candidatos) ? datos.candidatos : [];
    if (candidatos.length < 1) throw new Error('Agregue al menos un proveedor a evaluar');
    for (let i = 0; i < candidatos.length; i++) {
      const err = validarCandidato(candidatos[i], i);
      if (err) throw new Error(err);
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE evaluaciones_proveedor SET fecha = ?, oc_asociada = ?, detalle = ? WHERE id = ?`,
        [datos.fecha, oc, datos.detalle.trim(), id]
      );
      await conn.execute(`DELETE FROM evaluacion_proveedor_candidatos WHERE evaluacion_id = ?`, [
        id
      ]);
      let orden = 0;
      let mejorId = null;
      let mejorPuntaje = -1;
      for (const c of candidatos) {
        const [r] = await conn.execute(
          `INSERT INTO evaluacion_proveedor_candidatos
           (evaluacion_id, razon_social, direccion, cumplimiento_legal,
            puntaje_experiencia, puntaje_precio, puntaje_iso, puntaje_valor_agregado,
            obs_experiencia, obs_precio, obs_iso, obs_valor_agregado, orden)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            c.razon_social.trim(),
            c.direccion?.trim() || null,
            c.cumplimiento_legal || 'na',
            Number(c.puntaje_experiencia),
            Number(c.puntaje_precio),
            Number(c.puntaje_iso),
            Number(c.puntaje_valor_agregado),
            c.obs_experiencia?.trim() || null,
            c.obs_precio?.trim() || null,
            c.obs_iso?.trim() || null,
            c.obs_valor_agregado?.trim() || null,
            orden++
          ]
        );
        const total = calcularPuntajeTotal(c);
        if (total > mejorPuntaje) {
          mejorPuntaje = total;
          mejorId = r.insertId;
        }
      }
      await conn.execute(
        `UPDATE evaluaciones_proveedor SET candidato_ganador_id = ? WHERE id = ?`,
        [mejorId, id]
      );
      await conn.commit();
      return true;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  static async registrarGanadorEnLista(evaluacionId, candidatoId, datosProveedor) {
    const det = await this.obtenerDetalle(evaluacionId);
    if (!det) throw new Error('Evaluación no encontrada');
    if (det.evaluacion.proveedor_registrado_id) {
      throw new Error('Ya existe un proveedor registrado desde esta evaluación');
    }
    const candidato = det.candidatos.find((c) => c.id === candidatoId);
    if (!candidato) throw new Error('Candidato no pertenece a esta evaluación');

    const Proveedor = require('./Proveedor');
    const proveedorId = await Proveedor.crear({
      ...datosProveedor,
      razon_social: datosProveedor.razon_social?.trim() || candidato.razon_social,
      evaluacion_origen_id: evaluacionId
    });

    await pool.execute(
      `UPDATE evaluaciones_proveedor
       SET candidato_ganador_id = ?, proveedor_registrado_id = ?, estado = 'cerrada'
       WHERE id = ?`,
      [candidatoId, proveedorId, evaluacionId]
    );
    return { proveedorId, candidato };
  }

  static async eliminar(id) {
    const ev = await this.buscarPorId(id);
    if (!ev) return false;
    if (ev.proveedor_registrado_id) {
      throw new Error('No se puede eliminar: ya hay proveedor registrado en la lista');
    }
    const [r] = await pool.execute(`DELETE FROM evaluaciones_proveedor WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  }
}

module.exports = EvaluacionProveedor;
