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
  /**
   * Catálogo para asignar consultores: usuarios con es_consultor_cp=1.
   * Si proyectoId está definido, también muestra los ya asignados a ese proyecto (edición).
   */
  static async listarConsultoresParaSelector(proyectoId = null) {
    const pid =
      proyectoId != null && Number.isFinite(Number(proyectoId)) && Number(proyectoId) > 0
        ? Number(proyectoId)
        : null;
    if (pid) {
      const [rows] = await pool.execute(
        `SELECT DISTINCT e.id,
          CONCAT(TRIM(e.nombres), ' ', TRIM(e.apellidos)) AS nombre_completo,
          e.email,
          e.activo
         FROM empleados e
         WHERE e.activo = 1
           AND (
             IFNULL(e.es_consultor_cp, 0) = 1
             OR e.id IN (SELECT empleado_id FROM cp_proyecto_consultores WHERE proyecto_id = ?)
           )
         ORDER BY e.apellidos, e.nombres`,
        [pid]
      );
      return rows;
    }
    const [rows] = await pool.execute(
      `SELECT e.id,
        CONCAT(TRIM(e.nombres), ' ', TRIM(e.apellidos)) AS nombre_completo,
        e.email,
        e.activo
       FROM empleados e
       WHERE e.activo = 1 AND IFNULL(e.es_consultor_cp, 0) = 1
       ORDER BY e.apellidos, e.nombres`
    );
    return rows;
  }

  /** Valida que todos los IDs puedan quedar asignados (crear: solo catálogo; editar: catálogo o ya en el proyecto). */
  static async assertConsultoresPermitidos(empleadoIds, proyectoIdExistente) {
    const ids = [...new Set(empleadoIds.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0))];
    if (!ids.length) {
      throw new Error('Debe indicar al menos un consultor asignado del portal');
    }
    const ph = ids.map(() => '?').join(',');
    if (proyectoIdExistente) {
      const [rows] = await pool.execute(
        `SELECT e.id FROM empleados e
         WHERE e.id IN (${ph}) AND e.activo = 1
           AND (
             IFNULL(e.es_consultor_cp, 0) = 1
             OR e.id IN (SELECT empleado_id FROM cp_proyecto_consultores WHERE proyecto_id = ?)
           )`,
        [...ids, proyectoIdExistente]
      );
      if (rows.length !== ids.length) {
        throw new Error(
          'Hay consultores no permitidos. Solo puede asignar personas marcadas como consultores en «Administración de usuarios», o mantener asignaciones ya existentes en este proyecto.'
        );
      }
    } else {
      const [rows] = await pool.execute(
        `SELECT e.id FROM empleados e
         WHERE e.id IN (${ph}) AND e.activo = 1 AND IFNULL(e.es_consultor_cp, 0) = 1`,
        ids
      );
      if (rows.length !== ids.length) {
        throw new Error(
          'Uno o más consultores no están habilitados. Activa «Consultor en control de proyectos» en Administración de usuarios.'
        );
      }
    }
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
    await ControlProyecto.assertConsultoresPermitidos(uniq, null);
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
        await ControlProyecto.assertConsultoresPermitidos(uniq, id);
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

  static async eliminarProyecto(id) {
    const [r] = await pool.execute(`DELETE FROM cp_proyectos WHERE id = ?`, [id]);
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
    requerido_por_otros,
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
       (proyecto_id, requerido_por, requerido_por_otros, consultor_asignado_id, descripcion_actividad, prioridad,
        fecha_hora_inicio, fecha_hora_fin, horas_trabajadas, estado, comentarios, situacion_pago)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        proyecto_id,
        requerido_por,
        requerido_por_otros ?? null,
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
      requerido_por_otros: patch.requerido_por_otros,
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

  /**
   * Lista de proyectos y agregados para vista «Proyectos» (consumidas vs bolsa, horas por empresa, consultores).
   * Mismo alcance que reporteDashboard (gestión = todos; colaborador = asignaciones en cp_proyecto_consultores).
   */
  static async reporteProyectosVistaBi({ verTodo, empleadoId }) {
    const scope = verTodo ? 1 : 0;
    const emp = empleadoId;

    const filtroProyecto = `(
      ? = 1 OR EXISTS (
        SELECT 1 FROM cp_proyecto_consultores pc
        WHERE pc.proyecto_id = p.id AND pc.empleado_id = ?
      )
    )`;

    const [proyectosRows] = await pool.execute(
      `SELECT
         p.id,
         p.empresa,
         p.proyecto,
         p.fecha_inicio,
         p.fecha_fin,
         p.estado,
         CAST(p.horas_asignadas AS DECIMAL(14, 4)) AS horas_asignadas,
         CAST(COALESCE(ac.horas_consumidas, 0) AS DECIMAL(14, 4)) AS horas_consumidas,
         COALESCE(pa.num_actividades, 0) AS num_actividades,
         cns.consultores_nombres AS consultores_nombres
       FROM cp_proyectos p
       LEFT JOIN (
         SELECT proyecto_id, SUM(horas_trabajadas) AS horas_consumidas
         FROM cp_actividades
         GROUP BY proyecto_id
       ) ac ON ac.proyecto_id = p.id
       LEFT JOIN (
         SELECT proyecto_id, COUNT(*) AS num_actividades
         FROM cp_actividades
         GROUP BY proyecto_id
       ) pa ON pa.proyecto_id = p.id
       LEFT JOIN (
         SELECT
           pc.proyecto_id,
           GROUP_CONCAT(
             DISTINCT CONCAT(TRIM(e.nombres), ' ', TRIM(e.apellidos))
             SEPARATOR ', '
           ) AS consultores_nombres
         FROM cp_proyecto_consultores pc
         INNER JOIN empleados e ON e.id = pc.empleado_id
         GROUP BY pc.proyecto_id
       ) cns ON cns.proyecto_id = p.id
       WHERE ${filtroProyecto}
       ORDER BY p.empresa ASC, p.proyecto ASC`,
      [scope, emp]
    );

    const [avgRow] = await pool.execute(
      `SELECT CAST(AVG(a.horas_trabajadas) AS DECIMAL(14, 4)) AS horas_promedio_actividad
       FROM cp_actividades a
       INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
       WHERE ${filtroProyecto}`,
      [scope, emp]
    );

    const [consultoresRows] = await pool.execute(
      `SELECT CONCAT(TRIM(e.nombres), ' ', TRIM(e.apellidos)) AS nombre_completo
       FROM cp_proyecto_consultores pc
       INNER JOIN empleados e ON e.id = pc.empleado_id
       INNER JOIN cp_proyectos p ON p.id = pc.proyecto_id
       WHERE ${filtroProyecto}
       GROUP BY e.id, e.nombres, e.apellidos
       ORDER BY e.apellidos, e.nombres`,
      [scope, emp]
    );

    const proyectos = proyectosRows.map((row) => {
      const bolsa = Number(row.horas_asignadas) || 0;
      const cons = Number(row.horas_consumidas) || 0;
      const rest = bolsa - cons;
      return {
        ...row,
        horas_asignadas: bolsa,
        horas_consumidas: cons,
        horas_restantes: rest,
        num_actividades: Number(row.num_actividades) || 0,
        pct_consumido_bolsa:
          bolsa > 0 ? Math.round((cons / bolsa) * 10000) / 100 : cons > 0 ? 100 : 0,
        pct_restante_bolsa: bolsa > 0 ? Math.round((Math.max(rest, 0) / bolsa) * 10000) / 100 : 0
      };
    });

    const rawAvg = avgRow[0]?.horas_promedio_actividad;
    const horasProm = rawAvg != null ? Number(rawAvg) : 0;

    return {
      alcance: verTodo ? 'todos' : 'mis_proyectos_asignados',
      horas_promedio_actividad: Number.isFinite(horasProm) ? Math.round(horasProm * 100) / 100 : 0,
      consultores_catalogo: consultoresRows.map((r) => r.nombre_completo).filter(Boolean),
      proyectos
    };
  }

  /**
   * Reporte detallado de actividades (registro de horas).
   * Filtros: rango inclusivo sobre DATE(a.fecha_hora_fin); opcional proyecto, empresa y consultor asignado.
   * Alcance: gestión = todas las actividades de proyectos en alcance; colaborador = solo sus actividades en esos proyectos.
   * `consultorEmpleadoId` solo aplica cuando `verTodo` es verdadero (administración).
   */
  static async reporteActividadesVistaBi({
    verTodo,
    empleadoId,
    proyectoId,
    empresa,
    fechaFinDesde,
    fechaFinHasta,
    consultorEmpleadoId: consultorRaw
  }) {
    const scope = verTodo ? 1 : 0;
    const emp = empleadoId;
    let consultorFiltro = null;
    if (verTodo && consultorRaw != null && consultorRaw !== undefined) {
      const n = Number(consultorRaw);
      if (Number.isFinite(n) && n > 0) consultorFiltro = Math.trunc(n);
    }

    const filtroProyecto = `(
      ? = 1 OR EXISTS (
        SELECT 1 FROM cp_proyecto_consultores pc
        WHERE pc.proyecto_id = p.id AND pc.empleado_id = ?
      )
    )`;

    const proyectoIdSql = proyectoId && Number.isFinite(Number(proyectoId)) ? Number(proyectoId) : null;
    const empresaNorm = empresa && String(empresa).trim() ? String(empresa).trim() : null;

    const filtroExtraProySql = [];
    const filtroExtraProyParams = [];
    if (proyectoIdSql != null && proyectoIdSql > 0) {
      filtroExtraProySql.push('p.id = ?');
      filtroExtraProyParams.push(proyectoIdSql);
    }
    if (empresaNorm) {
      filtroExtraProySql.push('TRIM(p.empresa) = ?');
      filtroExtraProyParams.push(empresaNorm);
    }
    const filtroExtraProySuffix = filtroExtraProySql.length ? `AND ${filtroExtraProySql.join(' AND ')}` : '';

    let bolsaConsultorSuffix = '';
    const bolsaConsultorParams = [];
    if (consultorFiltro != null) {
      bolsaConsultorSuffix = ` AND EXISTS (
        SELECT 1 FROM cp_proyecto_consultores pcq
        WHERE pcq.proyecto_id = p.id AND pcq.empleado_id = ?
      )`;
      bolsaConsultorParams.push(consultorFiltro);
    }

    let clauseConsultorActs = '';
    if (!verTodo) {
      clauseConsultorActs = ' AND a.consultor_asignado_id = ?';
    } else if (consultorFiltro != null) {
      clauseConsultorActs = ' AND a.consultor_asignado_id = ?';
    }

    const condicionesActividades = `
      ${filtroProyecto}
      ${filtroExtraProySuffix}
      AND DATE(a.fecha_hora_fin) BETWEEN ? AND ?
      AND a.fecha_hora_fin IS NOT NULL
      ${clauseConsultorActs}
    `;

    const paramsBolsa = [scope, emp, ...filtroExtraProyParams];
    const paramsBolsaFull = [...paramsBolsa, ...bolsaConsultorParams];
    const paramsActs = [...paramsBolsa, fechaFinDesde, fechaFinHasta];
    if (!verTodo) {
      paramsActs.push(emp);
    } else if (consultorFiltro != null) {
      paramsActs.push(consultorFiltro);
    }

    /* Horas bolsa (proyectos en alcance; si hay filtro consultor: solo proyectos donde está en equipo) */
    const [bolsaRow] = await pool.execute(
      `SELECT CAST(COALESCE(SUM(p.horas_asignadas), 0) AS DECIMAL(16, 4)) AS horas_asignadas_total
       FROM cp_proyectos p
       WHERE ${filtroProyecto}
       ${filtroExtraProySuffix}
       ${bolsaConsultorSuffix}`,
      paramsBolsaFull
    );

    const [aggRow] = await pool.execute(
      `SELECT CAST(COALESCE(SUM(a.horas_trabajadas), 0) AS DECIMAL(16, 4)) AS horas_consumidas_total
       FROM cp_actividades a
       INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
       WHERE ${condicionesActividades.trim()}`,
      paramsActs
    );

    const [diasRow] = await pool.execute(
      `SELECT COUNT(DISTINCT DATE(a.fecha_hora_fin)) AS dias_distintos_fin
       FROM cp_actividades a
       INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
       WHERE ${condicionesActividades.trim()}`,
      paramsActs
    );

    const [listaRows] = await pool.execute(
      `SELECT
         a.id,
         a.proyecto_id,
         p.empresa AS empresa_nombre,
         p.proyecto AS proyecto_nombre,
         a.requerido_por,
         a.requerido_por_otros,
         a.descripcion_actividad,
         a.prioridad,
         a.fecha_hora_inicio,
         a.fecha_hora_fin,
         CAST(a.horas_trabajadas AS DECIMAL(14, 4)) AS horas_trabajadas,
         a.estado AS estado_actividad,
         CONCAT(TRIM(ec.nombres), ' ', TRIM(ec.apellidos)) AS consultor_nombre
       FROM cp_actividades a
       INNER JOIN cp_proyectos p ON p.id = a.proyecto_id
       INNER JOIN empleados ec ON ec.id = a.consultor_asignado_id
       WHERE ${condicionesActividades.trim()}
       ORDER BY a.fecha_hora_fin DESC, a.id DESC`,
      paramsActs
    );

    const [proyectosOpt] = await pool.execute(
      `SELECT p.id, p.empresa, p.proyecto
       FROM cp_proyectos p
       WHERE ${filtroProyecto}
       ORDER BY p.empresa ASC, p.proyecto ASC`,
      [scope, emp]
    );

    let consultorNombreFiltro = null;
    if (consultorFiltro != null) {
      const [cn] = await pool.execute(
        `SELECT CONCAT(TRIM(nombres), ' ', TRIM(apellidos)) AS nombre FROM empleados WHERE id = ?`,
        [consultorFiltro]
      );
      consultorNombreFiltro = cn[0]?.nombre ? String(cn[0].nombre).trim() : null;
    }

    const bolsaTotal = bolsaRow[0] != null ? Number(bolsaRow[0].horas_asignadas_total) || 0 : 0;
    const consTotal = aggRow[0] != null ? Number(aggRow[0].horas_consumidas_total) || 0 : 0;
    const diasConActividad =
      diasRow[0] != null ? parseInt(String(diasRow[0].dias_distintos_fin), 10) || 0 : 0;
    const horasPromDia =
      diasConActividad > 0 ? Math.round((consTotal / diasConActividad) * 100) / 100 : 0;

    return {
      alcance: verTodo ? 'todos' : 'mis_proyectos_asignados',
      filtros: {
        fecha_fin_desde: fechaFinDesde,
        fecha_fin_hasta: fechaFinHasta,
        proyecto_id: proyectoIdSql,
        empresa: empresaNorm,
        consultor_empleado_id: consultorFiltro,
        consultor_nombre: consultorNombreFiltro
      },
      kpis: {
        horas_asignadas_total: bolsaTotal,
        horas_consumidas_total: consTotal,
        horas_restantes_total: Math.round((bolsaTotal - consTotal) * 100) / 100,
        horas_promedio_trabajadas_por_dia: horasPromDia,
        dias_con_actividad_en_rango: diasConActividad
      },
      proyectos_opciones: proyectosOpt,
      actividades: listaRows
    };
  }
}

module.exports = ControlProyecto;
