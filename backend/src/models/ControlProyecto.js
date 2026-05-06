const { pool } = require('../config/database');

function horasDesdeDatetime(inicio, fin) {
  const a = new Date(inicio);
  const b = new Date(fin);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return null;
  return Math.round(((b - a) / (1000 * 60 * 60)) * 100) / 100;
}

class ControlProyecto {
  static async listarConsultoresActivos() {    const [rows] = await pool.execute(
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
      `SELECT p.*,
        CONCAT(TRIM(ev.nombres), ' ', TRIM(ev.apellidos)) AS consultor_nombre,
        ev.email AS consultor_email
       FROM cp_proyectos p
       INNER JOIN empleados ev ON ev.id = p.consultor_asignado_id
       ORDER BY p.fecha_inicio DESC, p.id DESC`
    );
    return rows;
  }

  static async listarProyectosPorConsultor(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT p.*,
        CONCAT(TRIM(ev.nombres), ' ', TRIM(ev.apellidos)) AS consultor_nombre,
        ev.email AS consultor_email
       FROM cp_proyectos p
       INNER JOIN empleados ev ON ev.id = p.consultor_asignado_id
       WHERE p.consultor_asignado_id = ?
       ORDER BY p.fecha_inicio DESC, p.id DESC`,
      [empleadoId]
    );
    return rows;
  }

  static async obtenerProyecto(id) {
    const [rows] = await pool.execute(
      `SELECT p.*,
        CONCAT(TRIM(ev.nombres), ' ', TRIM(ev.apellidos)) AS consultor_nombre,
        ev.email AS consultor_email
       FROM cp_proyectos p
       INNER JOIN empleados ev ON ev.id = p.consultor_asignado_id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0];
  }

  static async crearProyecto({
    empresa,
    proyecto,
    fecha_inicio,
    fecha_fin,
    consultor_asignado_id,
    horas_asignadas,
    estado,
    detalles
  }) {
    const [r] = await pool.execute(
      `INSERT INTO cp_proyectos
       (empresa, proyecto, fecha_inicio, fecha_fin, consultor_asignado_id, horas_asignadas, estado, detalles)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empresa,
        proyecto,
        fecha_inicio,
        fecha_fin,
        consultor_asignado_id,
        horas_asignadas,
        estado,
        detalles || null
      ]
    );
    return r.insertId;
  }

  static async actualizarProyecto(id, patch) {
    const allowed = [
      'empresa',
      'proyecto',
      'fecha_inicio',
      'fecha_fin',
      'consultor_asignado_id',
      'horas_asignadas',
      'estado',
      'detalles'
    ];
    const keys = allowed.filter((k) => patch[k] !== undefined);
    if (!keys.length) return false;
    const sets = keys.map((k) => `${k} = ?`).join(', ');
    const vals = keys.map((k) => patch[k]);
    const [r] = await pool.execute(`UPDATE cp_proyectos SET ${sets} WHERE id = ?`, [...vals, id]);
    return r.affectedRows > 0;
  }

  /** consultant: solo sus registros; admin o Veronica: todas (opcional filtro proyecto_id). */
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
        p.consultor_asignado_id AS proyecto_consultor_id,
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
}

module.exports = ControlProyecto;
