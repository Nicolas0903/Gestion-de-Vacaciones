const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class Empleado {
  static normalizarModulosPortal(empleado) {
    if (!empleado) return empleado;
    let m = empleado.modulos_portal;
    if (m == null) return empleado;
    if (Buffer.isBuffer(m)) m = m.toString('utf8');
    if (typeof m === 'string') {
      try {
        m = JSON.parse(m);
      } catch {
        m = null;
      }
    }
    return { ...empleado, modulos_portal: m };
  }

  // Crear nuevo empleado
  static async crear(datos) {
    const {
      codigo_empleado, nombres, apellidos, dni, email, password,
      cargo, fecha_ingreso, rol_id, jefe_id, modulos_portal
    } = datos;

    const hashedPassword = await bcrypt.hash(password, 10);
    const modulosJson =
      modulos_portal != null && typeof modulos_portal === 'object'
        ? JSON.stringify(modulos_portal)
        : null;

    const [result] = await pool.execute(
      `INSERT INTO empleados 
       (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id, jefe_id, modulos_portal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        codigo_empleado,
        nombres,
        apellidos,
        dni,
        email,
        hashedPassword,
        cargo,
        fecha_ingreso,
        rol_id,
        jefe_id || null,
        modulosJson
      ]
    );

    return result.insertId;
  }

  // Buscar por ID
  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT e.*, r.nombre as rol_nombre, r.nivel_aprobacion,
              j.nombres as jefe_nombres, j.apellidos as jefe_apellidos
       FROM empleados e
       LEFT JOIN roles r ON e.rol_id = r.id
       LEFT JOIN empleados j ON e.jefe_id = j.id
       WHERE e.id = ?`,
      [id]
    );
    return rows[0] ? this.normalizarModulosPortal(rows[0]) : null;
  }

  // Buscar por email
  static async buscarPorEmail(email) {
    const [rows] = await pool.execute(
      `SELECT e.*, r.nombre as rol_nombre, r.nivel_aprobacion
       FROM empleados e
       LEFT JOIN roles r ON e.rol_id = r.id
       WHERE e.email = ?`,
      [email]
    );
    return rows[0] ? this.normalizarModulosPortal(rows[0]) : null;
  }

  // Buscar por código de empleado
  static async buscarPorCodigo(codigo) {
    const [rows] = await pool.execute(
      `SELECT e.*, r.nombre as rol_nombre, r.nivel_aprobacion
       FROM empleados e
       LEFT JOIN roles r ON e.rol_id = r.id
       WHERE e.codigo_empleado = ?`,
      [codigo]
    );
    return rows[0] ? this.normalizarModulosPortal(rows[0]) : null;
  }

  static async buscarPorDni(dni) {
    const [rows] = await pool.execute(
      `SELECT e.*, r.nombre as rol_nombre, r.nivel_aprobacion
       FROM empleados e
       LEFT JOIN roles r ON e.rol_id = r.id
       WHERE e.dni = ?`,
      [dni]
    );
    return rows[0] ? this.normalizarModulosPortal(rows[0]) : null;
  }

  /**
   * Aprobador único de reembolsos: siempre un empleado activo del sistema.
   * 1) Opcional: REEMBOLSOS_APROBADOR_EMPLEADO_ID en .env
   * 2) Si no: primer registro que coincida con el correo histórico del proyecto o nombre Enrique + Agapito
   * El correo al que se envían las solicitudes es el de esta fila (empleados.email).
   */
  static async obtenerAprobadorReembolsos() {
    const idOverride = process.env.REEMBOLSOS_APROBADOR_EMPLEADO_ID;
    if (idOverride) {
      const e = await this.buscarPorId(parseInt(idOverride, 10));
      if (e && e.activo) return e;
    }

    const emailProyecto = 'enrique.agapito@prayaga.biz';
    const [rows] = await pool.execute(
      `SELECT e.*, r.nombre as rol_nombre, r.nivel_aprobacion,
              j.nombres as jefe_nombres, j.apellidos as jefe_apellidos
       FROM empleados e
       LEFT JOIN roles r ON e.rol_id = r.id
       LEFT JOIN empleados j ON e.jefe_id = j.id
       WHERE e.activo = 1
         AND (
           LOWER(TRIM(e.email)) = LOWER(TRIM(?))
           OR (
             LOWER(TRIM(e.nombres)) LIKE 'enrique%'
             AND LOWER(TRIM(e.apellidos)) LIKE '%agapito%'
           )
         )
       ORDER BY CASE WHEN LOWER(TRIM(e.email)) = LOWER(TRIM(?)) THEN 0 ELSE 1 END, e.id ASC
       LIMIT 1`,
      [emailProyecto, emailProyecto]
    );
    return rows[0] || null;
  }

  // Listar todos los empleados
  static async listarTodos(filtros = {}) {
    let query = `
      SELECT e.id, e.codigo_empleado, e.nombres, e.apellidos, e.dni, e.email,
             e.cargo, e.fecha_ingreso, e.activo, e.avatar_url, e.modulos_portal,
             r.nombre as rol_nombre, r.id as rol_id,
             j.nombres as jefe_nombres, j.apellidos as jefe_apellidos
      FROM empleados e
      LEFT JOIN roles r ON e.rol_id = r.id
      LEFT JOIN empleados j ON e.jefe_id = j.id
      WHERE 1=1
    `;
    const params = [];

    if (filtros.activo !== undefined) {
      query += ' AND e.activo = ?';
      params.push(filtros.activo);
    }

    if (filtros.rol_id) {
      query += ' AND e.rol_id = ?';
      params.push(filtros.rol_id);
    }

    if (filtros.busqueda) {
      query +=
        ' AND (e.nombres LIKE ? OR e.apellidos LIKE ? OR e.dni LIKE ? OR e.codigo_empleado LIKE ? OR e.email LIKE ?)';
      const busqueda = `%${filtros.busqueda}%`;
      params.push(busqueda, busqueda, busqueda, busqueda, busqueda);
    }

    query += ' ORDER BY e.apellidos, e.nombres';

    const [rows] = await pool.execute(query, params);
    return rows.map((row) => this.normalizarModulosPortal(row));
  }

  // Actualizar empleado
  static async actualizar(id, datos) {
    const campos = [];
    const valores = [];

    Object.keys(datos).forEach(key => {
      if (datos[key] !== undefined && key !== 'id' && key !== 'password') {
        campos.push(`${key} = ?`);
        let val = datos[key];
        if (key === 'modulos_portal' && val !== null && typeof val === 'object') {
          val = JSON.stringify(val);
        }
        valores.push(val);
      }
    });

    if (datos.password) {
      campos.push('password = ?');
      valores.push(await bcrypt.hash(datos.password, 10));
    }

    valores.push(id);

    const [result] = await pool.execute(
      `UPDATE empleados SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    return result.affectedRows > 0;
  }

  // Verificar contraseña
  static async verificarPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  // Obtener subordinados de un jefe
  static async obtenerSubordinados(jefeId) {
    const [rows] = await pool.execute(
      `SELECT id, codigo_empleado, nombres, apellidos, email, cargo
       FROM empleados
       WHERE jefe_id = ? AND activo = TRUE`,
      [jefeId]
    );
    return rows;
  }

  // Obtener empleados por rol
  static async obtenerPorRol(rolNombre) {
    const [rows] = await pool.execute(
      `SELECT e.id, e.codigo_empleado, e.nombres, e.apellidos, e.email, e.cargo
       FROM empleados e
       JOIN roles r ON e.rol_id = r.id
       WHERE r.nombre = ? AND e.activo = TRUE`,
      [rolNombre]
    );
    return rows;
  }

  // Desactivar empleado (soft delete)
  static async desactivar(id) {
    const [result] = await pool.execute(
      'UPDATE empleados SET activo = FALSE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Reactivar empleado
  static async reactivar(id) {
    const [result] = await pool.execute(
      'UPDATE empleados SET activo = TRUE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Actualizar contraseña
  static async actualizarPassword(id, passwordHash) {
    const [result] = await pool.execute(
      'UPDATE empleados SET password = ? WHERE id = ?',
      [passwordHash, id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = Empleado;


