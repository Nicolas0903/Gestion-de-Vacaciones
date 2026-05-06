const { pool } = require('../config/database');

function horasDesdeDatetime(inicio, fin) {
  const a = new Date(inicio);
  const b = new Date(fin);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return null;
  return Math.round(((b - a) / (1000 * 60 * 60)) * 100) / 100;
}

async function mapaConsultoresPorProyectos(proyectoIds) {
  if (!proyectoIds.length) return new Map();
  const placeholders = proyectoIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `SELECT pc.proyecto_id,
        e.id AS empleado_id,
        CONCAT(TRIM(e.nombres), ' ', TRIM(e.apellidos)) AS nombre_completo,
        e.email
      FROM cp_proyecto_consultores pc
      INNER JOIN empleados e ON e.id = pc.empleado_id
      WHERE pc.proyecto_id IN (${placeholders})
      ORDER BY e.apellidos, e.nombres`,
    proyectoIds
  );
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.proyecto_id)) map.set(r.proyecto_id, []);
    map.get(r.proyecto_id).push({
      id: r.empleado_id,
      nombre_completo: r.nombre_completo,
      email: r.email
    });
  }
  return map;
}

async function enriquecerProyectos(rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const map = await mapaConsultoresPorProyectos(ids);
  return rows.map((p) => {
    const consultores = map.get(p.id) || [];
    return {
      ...p,
      consultores,
      consultores_empleado_ids: consultores.map((c) => c.id),
      consultores_nombres: consultores.map((c) => c.nombre_completo).join(', ')
    };
  });
}

class ControlProyecto {
  static async listarConsultoresActivos() {
    const [rows] = await pool.execute(
      `SELECT e.id,
        CONCAT(TRIM(e.nombres), ' ', TRIM(e.apellidos)) AS nombre_completo,
        e.email,
        e.activo
       FROM empleados e WHERE e.activo = 1 ORDER BY e.apellidos, e.nombres`
    );
    return rows;
  }

  static async listarProyectosTodos() {
    const [rows] = await pool.execute(
      `SELECT p.*
       FROM cp_proyectos p
       ORDER BY p.fecha_inicio DESC, p.id DESC`
    );
    return await enriquecerProyectos(rows);
  }

  static async listarProyectosPorConsultor(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT DISTINCT p.*
       FROM cp_proyectos p
       INNER JOIN cp_proyecto_consultores pc ON pc.proyecto_id = p.id AND pc.empleado_id = ?
       ORDER BY p.fecha_inicio DESC, p.id DESC`,
      [empleadoId]
    );
    return await enriquecerProyectos(rows);
  }

  static async empleadoAsignadoAProyecto(proyectoId, empleadoId) {
    const [r] = await pool.execute(
      `SELECT 1 FROM cp_proyecto_consultores WHERE proyecto_id = ? AND empleado_id = ? LIMIT 1`,
      [proyectoId, empleadoId]
    );
    return r.length > 0;
  }

  static async obtenerProyecto(id) {
    const [rows] = await pool.execute(`SELECT * FROM cp_proyectos WHERE id = ?`, [id]);
    const p = rows[0];
    if (!p) return null;
    const enriched = await enriquecerProyectos([p]);
    return enriched[0];
  }

  static async reemplazarConsultoresProyecto(proyectoId, empleadoIds, conn) {
    const c = conn || pool;
    const uniq = [...new Set(empleadoIds.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0))];
    await c.execute(`DELETE FROM cp_proyecto_consultores WHERE proyecto_id = ?`, [proyectoId]);
    for (const eid of uniq) {
      await c.execute(`INSERT INTO cp_proyecto_consultores (proyecto_id, empleado_id) VALUES (?, ?)`, [
        proyectoId,
        eid
      ]);
    }
  }

  static async crearProyectoConConsultores(
    { empresa, proyecto, fecha_inicio, fecha_fin, horas_asignadas, estado, detalles },
    consultoresIds
  ) {
    const uniq = [...new Set(consultoresIds.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0))];
    if (!uniq.length) {
      throw new Error('Debe indicar al menos un consultor asignado del portal');
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [r] = await conn.execute(
        `INSERT INTO cp_proyectos
         (empresa, proyecto, fecha_inicio, fecha_fin, horas_asignadas, estado, detalles)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [empresa, proyecto, fecha_inicio, fecha_fin, horas_asignadas, estado, detalles || null]
      );
      const id = r.insertId;
      await ControlProyecto.reemplazarConsultoresProyecto(id, uniq, conn);
      await conn.commit();
      return id;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  static async actualizarProyectoYConsultores(id, patch, consultoresIds) {
    const allowed = ['empresa', 'proyecto', 'fecha_inicio', 'fecha_fin', 'horas_asignadas', 'estado', 'detalles'];
    const keys = allowed.filter((k) => patch[k] !== undefined);
    if (!keys.length && consultoresIds == null) return false;
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      if (keys.length) {
        const sets = keys.map((k) => `${k} = ?`).join(', ');
        const vals = keys.map((k) => patch[k]);
        const [r] = await conn.execute(`UPDATE cp_proyectos SET ${sets} WHERE id = ?`, [...vals, id]);
        if (r.affectedRows === 0) {
          await conn.rollback();
          return false;
        }
      } else if (consultoresIds != null) {
        const [ex] = await conn.execute(`SELECT id FROM cp_proyectos WHERE id = ? LIMIT 1`, [id]);
        if (!ex.length) {
          await conn.rollback();
          return false;
        }
      }
      if (consultoresIds != null) {
        const uniq = [...new Set(consultoresIds.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0))];
        if (!uniq.length) {
          throw new Error('Debe indicar al menos un consultor asignado del portal');
        }
        await ControlProyecto.reemplazarConsultoresProyecto(id, uniq, conn);
      }
      await conn.commit();
      return true;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }

  /** compat: actualizar solo campos de proyecto sin tocar consultores */
  static async actualizarProyecto(id, patch) {
    const allowed = ['empresa', 'proyecto', 'fecha_inicio', 'fecha_fin', 'horas_asignadas', 'estado', 'detalles'];
    const keys = allowed.filter((k) => patch[k] !== undefined);
    if (!keys.length) return false;
    const sets = keys.map((k) => `${k} = ?`).join(', ');
    const vals = keys.map((k) => patch[k]);
    const [r] = await pool.execute(`UPDATE cp_proyectos SET ${sets} WHERE id = ?`, [...vals, id]);
    return r.affectedRows > 0;
  }

  static async listarActividades({ empleadoId, verTodos, proyectoId }) {
    let sql = `
      SELECT a.*,
        p.proyecto AS proyecto_nombre,
        p.empresa AS empresa_nombre,
        CONCAT(TRIM(ec.nombres), ' ', TRIM(ec.apellidos)) AS consultor_nombre
      FROM cp_actividades a
      INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
      INNER JOIN empleados ec ON ec.id = a.consultor_asignado_id
      WHERE 1=1`;
    const params = [];
    if (!verTodos) {
      sql += ` AND a.consultor_asignado_id = ?`;
      params.push(empleadoId);
    }
    if (proyectoId) {
      sql += ` AND a.proyecto_id = ?`;
      params.push(proyectoId);
    }
    sql += ` ORDER BY a.fecha_hora_inicio DESC, a.id DESC`;
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  static async obtenerActividad(id) {
    const [rows] = await pool.execute(
      `SELECT a.*,
        p.proyecto AS proyecto_nombre,
        p.empresa AS empresa_nombre,
        CONCAT(TRIM(ec.nombres), ' ', TRIM(ec.apellidos)) AS consultor_nombre
       FROM cp_actividades a
       INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
       INNER JOIN empleados ec ON ec.id = a.consultor_asignado_id
       WHERE a.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async crearActividad({
    proyecto_id,
    requerido_por,
    consultor_asignado_id,
    descripcion_actividad,
    prioridad,
    fecha_hora_inicio,
    fecha_hora_fin,
    estado,
    comentarios,
    situacion_pago,
    horas_trabajadas
  }) {
    const ht = horas_trabajadas ?? horasDesdeDatetime(fecha_hora_inicio, fecha_hora_fin);
    if (ht == null || ht < 0) {
      throw new Error('Horas trabajadas inválidas');
    }
    const [r] = await pool.execute(
      `INSERT INTO cp_actividades
       (proyecto_id, requerido_por, consultor_asignado_id, descripcion_actividad, prioridad,
        fecha_hora_inicio, fecha_hora_fin, horas_trabajadas, estado, comentarios, situacion_pago)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proyecto_id,
        requerido_por,
        consultor_asignado_id,
        descripcion_actividad,
        prioridad,
        fecha_hora_inicio,
        fecha_hora_fin,
        ht,
        estado,
        comentarios || null,
        situacion_pago
      ]
    );
    return r.insertId;
  }

  static async actualizarActividad(id, patch, { permiteCambiarConsultor }) {
    const keys = [];
    const vals = [];
    const map = {
      proyecto_id: patch.proyecto_id,
      requerido_por: patch.requerido_por,
      descripcion_actividad: patch.descripcion_actividad,
      prioridad: patch.prioridad,
      fecha_hora_inicio: patch.fecha_hora_inicio,
      fecha_hora_fin: patch.fecha_hora_fin,
      estado: patch.estado,
      comentarios: patch.comentarios,
      situacion_pago: patch.situacion_pago
    };
    if (permiteCambiarConsultor && patch.consultor_asignado_id != null) {
      map.consultor_asignado_id = patch.consultor_asignado_id;
    }
    Object.entries(map).forEach(([k, v]) => {
      if (v !== undefined) {
        keys.push(`${k} = ?`);
        vals.push(v);
      }
    });
    if (!keys.length) return false;

    vals.push(id);
    const [r] = await pool.execute(`UPDATE cp_actividades SET ${keys.join(', ')} WHERE id = ?`, vals);

    if (patch.fecha_hora_inicio || patch.fecha_hora_fin) {
      const act = await this.obtenerActividad(id);
      if (act) {
        const ht = horasDesdeDatetime(act.fecha_hora_inicio, act.fecha_hora_fin);
        if (ht != null) {
          await pool.execute(`UPDATE cp_actividades SET horas_trabajadas = ? WHERE id = ?`, [ht, id]);
        }
      }
    }
    return r.affectedRows > 0;
  }

  static async listarCostosHora() {
    const [rows] = await pool.execute(
      `SELECT c.empleado_id, c.costo_por_hora, c.updated_at,
        CONCAT(TRIM(e.nombres), ' ', TRIM(e.apellidos)) AS nombre_completo,
        e.email
       FROM cp_costo_hora c
       INNER JOIN empleados e ON e.id = c.empleado_id
       ORDER BY e.apellidos, e.nombres`
    );
    return rows;
  }

  static async upsertCostoHora(empleadoId, costo_por_hora) {
    await pool.execute(
      `INSERT INTO cp_costo_hora (empleado_id, costo_por_hora) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE costo_por_hora = VALUES(costo_por_hora)`,
      [empleadoId, costo_por_hora]
    );
    const [rows] = await pool.execute(`SELECT * FROM cp_costo_hora WHERE empleado_id = ?`, [empleadoId]);
    return rows[0];
  }

  /**
   * KPIs y series para vista tipo BI. Si verTodo=false, solo datos de proyectos donde el empleado está asignado.
   */
  static async reporteDashboard({ verTodo, empleadoId }) {
    const scope = verTodo ? 1 : 0;
    const emp = empleadoId;

    const filtroProyecto = `(
      ? = 1 OR EXISTS (
        SELECT 1 FROM cp_proyecto_consultores pc
        WHERE pc.proyecto_id = p.id AND pc.empleado_id = ?
      )
    )`;

    const [porEstado] = await pool.execute(
      `SELECT p.estado, COUNT(*) AS total
       FROM cp_proyectos p
       WHERE ${filtroProyecto}
       GROUP BY p.estado`,
      [scope, emp]
    );

    const [totProy] = await pool.execute(
      `SELECT COUNT(*) AS total_proyectos, COALESCE(SUM(p.horas_asignadas), 0) AS horas_bolsa_total
       FROM cp_proyectos p
       WHERE ${filtroProyecto}`,
      [scope, emp]
    );

    const [actAgg] = await pool.execute(
      `SELECT COUNT(*) AS registros_actividades, COALESCE(SUM(a.horas_trabajadas), 0) AS horas_registradas_total
       FROM cp_actividades a
       INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
       WHERE ${filtroProyecto}`,
      [scope, emp]
    );

    const [porMes] = await pool.execute(
      `SELECT DATE_FORMAT(a.fecha_hora_inicio, '%Y-%m') AS mes,
              COALESCE(SUM(a.horas_trabajadas), 0) AS horas
       FROM cp_actividades a
       INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
       WHERE ${filtroProyecto}
         AND a.fecha_hora_inicio >= DATE_SUB(CURDATE(), INTERVAL 14 MONTH)
       GROUP BY DATE_FORMAT(a.fecha_hora_inicio, '%Y-%m')
       ORDER BY mes ASC`,
      [scope, emp]
    );

    const [topProyectos] = await pool.execute(
      `SELECT p.id, p.empresa, p.proyecto, p.estado,
              COALESCE(SUM(a.horas_trabajadas), 0) AS horas_registradas
       FROM cp_proyectos p
       LEFT JOIN cp_actividades a ON a.proyecto_id = p.id
       WHERE ${filtroProyecto}
       GROUP BY p.id, p.empresa, p.proyecto, p.estado
       ORDER BY horas_registradas DESC
       LIMIT 10`,
      [scope, emp]
    );

    return {
      resumen: {
        ...(totProy[0] || {}),
        ...(actAgg[0] || {})
      },
      proyectos_por_estado: porEstado,
      horas_por_mes: porMes,
      top_proyectos_horas: topProyectos,
      alcance: verTodo ? 'todos' : 'mis_proyectos_asignados'
    };
  }
}

module.exports = ControlProyecto;
