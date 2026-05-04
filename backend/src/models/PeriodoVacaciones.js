const { pool } = require('../config/database');

class PeriodoVacaciones {
  // Crear nuevo período
  static async crear(datos) {
    const {
      empleado_id, fecha_inicio_periodo, fecha_fin_periodo,
      dias_correspondientes = 30, tiempo_trabajado, observaciones,
      renovacion_automatica = 0
    } = datos;

    const [result] = await pool.execute(
      `INSERT INTO periodos_vacaciones 
       (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, tiempo_trabajado, observaciones, renovacion_automatica)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        empleado_id,
        fecha_inicio_periodo,
        fecha_fin_periodo,
        dias_correspondientes,
        tiempo_trabajado || '12 meses',
        observaciones || null,
        renovacion_automatica ? 1 : 0
      ]
    );

    return result.insertId;
  }

  // Buscar por ID (con estado calculado)
  static async buscarPorId(id) {
    const [rows] = await pool.execute(
      `SELECT pv.*, e.nombres, e.apellidos, e.codigo_empleado
       FROM periodos_vacaciones pv
       JOIN empleados e ON pv.empleado_id = e.id
       WHERE pv.id = ?`,
      [id]
    );
    const p = rows[0];
    if (!p) return null;
    return {
      ...p,
      estado: this._calcularEstado(Number(p.dias_gozados || 0), Number(p.dias_correspondientes || 0))
    };
  }

  // Calcular estado correcto según días gozados/correspondientes
  static _calcularEstado(diasGozados, diasCorrespondientes) {
    if (diasGozados >= diasCorrespondientes) return 'gozadas';
    if (diasGozados > 0) return 'parcial';
    return 'pendiente';
  }

  /**
   * Renueva **solo después** del cierre: el siguiente período se calcula a partir del
   * último período ya **cerrado** (fecha_fin < CURDATE), no desde el período abierto.
   * Así, mientras sigas dentro del período vigente (p. ej. hasta el 01/05/2026 incl.),
   * NO se crea el bloque que termina el año siguiente civil (ej. fecha fin en 2027).
   *
   * Repite el loop por si hay varios años de atraso sin abrir la app.
   */
  static async renovarSiVencido(empleadoId) {
    try {
      for (let iter = 0; iter < 20; iter++) {
        const [cerrado] = await pool.execute(
          `SELECT fecha_fin_periodo, dias_correspondientes
           FROM periodos_vacaciones
           WHERE empleado_id = ? AND fecha_fin_periodo < CURDATE()
           ORDER BY fecha_fin_periodo DESC
           LIMIT 1`,
          [empleadoId]
        );
        if (!cerrado.length) break;

        const ref = cerrado[0];

        const [fechas] = await pool.execute(
          `SELECT
             DATE_FORMAT(DATE_ADD(?, INTERVAL 1 DAY), '%Y-%m-%d') AS fecha_inicio_nuevo,
             DATE_FORMAT(
               DATE_SUB(
                 DATE_ADD(DATE_ADD(?, INTERVAL 1 DAY), INTERVAL 1 YEAR),
                 INTERVAL 1 DAY
               ),
               '%Y-%m-%d'
             ) AS fecha_fin_nuevo`,
          [ref.fecha_fin_periodo, ref.fecha_fin_periodo]
        );
        const fechaInicioNuevo = fechas[0]?.fecha_inicio_nuevo;
        const fechaFinNuevo = fechas[0]?.fecha_fin_nuevo;
        if (!fechaInicioNuevo || !fechaFinNuevo) break;

        const [existe] = await pool.execute(
          `SELECT id FROM periodos_vacaciones
           WHERE empleado_id = ? AND fecha_inicio_periodo = ?`,
          [empleadoId, fechaInicioNuevo]
        );
        if (existe.length > 0) break;

        const diasCorrespondientes = Number(ref.dias_correspondientes) || 30;
        const yIni = String(fechaInicioNuevo).slice(0, 4);
        const yFin = String(fechaFinNuevo).slice(0, 4);
        await this.crear({
          empleado_id: empleadoId,
          fecha_inicio_periodo: fechaInicioNuevo,
          fecha_fin_periodo: fechaFinNuevo,
          dias_correspondientes: diasCorrespondientes,
          tiempo_trabajado: '12 meses',
          observaciones: `Período ${yIni}-${yFin} (renovación automática)`,
          renovacion_automatica: 1
        });
      }
    } catch (err) {
      console.error('Error renovarSiVencido:', err);
    }
  }

  /**
   * Fecha máxima de fin que el portal del empleado debe mostrar:
   * GREATER(período activo que NO viene de renovación automática del sistema,
   *          último período ya cerrado).
   * Los bloques creados solo por backend (campo renovacion_automatica) siguen guardados
   * para RRHH, pero no se cuentan en la vista hasta que exista período cargado como empresa (flag 0).
   */
  static async _fechaTopeVistaEmpleado(empleadoId) {
    const [rows] = await pool.execute(
      `SELECT GREATEST(
          COALESCE(
            (SELECT MAX(p.fecha_fin_periodo)
             FROM periodos_vacaciones p
             WHERE p.empleado_id = ?
               AND p.fecha_inicio_periodo <= CURDATE()
               AND p.fecha_fin_periodo >= CURDATE()
               AND COALESCE(p.renovacion_automatica, 0) = 0),
            '1000-01-01'),
          COALESCE(
            (SELECT MAX(p2.fecha_fin_periodo)
             FROM periodos_vacaciones p2
             WHERE p2.empleado_id = ?
                 AND p2.fecha_fin_periodo < CURDATE()),
            '1000-01-01')
       ) AS fecha_tope`,
      [empleadoId, empleadoId]
    );
    const raw = rows[0]?.fecha_tope;
    if (raw == null) return null;
    const s = typeof raw === 'string' ? raw.slice(0, 10) : String(raw).slice(0, 10);
    if (!s || s.startsWith('1000')) return null;
    return s;
  }

  static async _whereVistaEmpleado(empleadoId) {
    const tope = await this._fechaTopeVistaEmpleado(empleadoId);
    const base = ' AND fecha_inicio_periodo <= CURDATE()';
    if (!tope) return { clause: base, params: [] };
    return { clause: `${base} AND fecha_fin_periodo <= ?`, params: [tope] };
  }

  // Listar períodos de un empleado (con renovación automática y estado calculado)
  // options.vistaEmpleado: true desde portal del empleado (histórico + hasta el tope operativo empresa).
  static async listarPorEmpleado(empleadoId, options = {}) {
    const vistaEmpleado = options.vistaEmpleado === true;
    try {
      await this.renovarSiVencido(empleadoId);
    } catch (e) {
      console.error('renovarSiVencido:', e);
    }

    let sql = `SELECT * FROM periodos_vacaciones
       WHERE empleado_id = ?`;
    const execParams = [empleadoId];
    if (vistaEmpleado) {
      const { clause, params } = await this._whereVistaEmpleado(empleadoId);
      sql += clause;
      execParams.push(...params);
    }
    sql += ` ORDER BY fecha_inicio_periodo DESC`;

    const [rows] = await pool.execute(sql, execParams);

    return rows.map(p => ({
      ...p,
      estado: this._calcularEstado(Number(p.dias_gozados || 0), Number(p.dias_correspondientes || 0))
    }));
  }

  // Obtener períodos con días pendientes
  static async obtenerPendientes(empleadoId, options = {}) {
    const vistaEmpleado = options.vistaEmpleado === true;
    try {
      await this.renovarSiVencido(empleadoId);
    } catch (e) {
      console.error('renovarSiVencido obtenerPendientes:', e);
    }

    let sql = `SELECT * FROM periodos_vacaciones
       WHERE empleado_id = ? AND dias_pendientes > 0`;
    const execParams = [empleadoId];
    if (vistaEmpleado) {
      const { clause, params } = await this._whereVistaEmpleado(empleadoId);
      sql += clause;
      execParams.push(...params);
    }
    sql += ` ORDER BY fecha_inicio_periodo ASC`;

    const [rows] = await pool.execute(sql, execParams);
    return rows.map(p => ({
      ...p,
      estado: this._calcularEstado(Number(p.dias_gozados || 0), Number(p.dias_correspondientes || 0))
    }));
  }

  // Obtener resumen de vacaciones de un empleado
  static async obtenerResumen(empleadoId, options = {}) {
    const vistaEmpleado = options.vistaEmpleado === true;
    try {
      await this.renovarSiVencido(empleadoId);
    } catch (e) {
      console.error('renovarSiVencido obtenerResumen:', e);
    }

    let sql = `SELECT 
         SUM(dias_correspondientes) as total_ganados,
         SUM(dias_gozados) as total_gozados,
         SUM(dias_pendientes) as total_pendientes
       FROM periodos_vacaciones
       WHERE empleado_id = ?`;
    const execParams = [empleadoId];
    if (vistaEmpleado) {
      const { clause, params } = await this._whereVistaEmpleado(empleadoId);
      sql += clause;
      execParams.push(...params);
    }

    const [rows] = await pool.execute(sql, execParams);
    return rows[0];
  }

  // Actualizar días gozados
  static async actualizarDiasGozados(id, diasGozados) {
    const periodo = await this.buscarPorId(id);
    if (!periodo) return false;

    const nuevosDiasGozados = periodo.dias_gozados + diasGozados;
    let estado = 'pendiente';
    
    if (nuevosDiasGozados >= periodo.dias_correspondientes) {
      estado = 'gozadas';
    } else if (nuevosDiasGozados > 0) {
      estado = 'parcial';
    }

    const [result] = await pool.execute(
      `UPDATE periodos_vacaciones 
       SET dias_gozados = ?, estado = ?
       WHERE id = ?`,
      [nuevosDiasGozados, estado, id]
    );

    return result.affectedRows > 0;
  }

  // Revertir días gozados (cuando se elimina una solicitud aprobada)
  static async revertirDiasGozados(id, diasARevertir) {
    const periodo = await this.buscarPorId(id);
    if (!periodo) return false;

    const nuevosDiasGozados = Math.max(0, periodo.dias_gozados - diasARevertir);
    let estado = 'pendiente';
    
    if (nuevosDiasGozados >= periodo.dias_correspondientes) {
      estado = 'gozadas';
    } else if (nuevosDiasGozados > 0) {
      estado = 'parcial';
    }

    const [result] = await pool.execute(
      `UPDATE periodos_vacaciones 
       SET dias_gozados = ?, estado = ?
       WHERE id = ?`,
      [nuevosDiasGozados, estado, id]
    );

    return result.affectedRows > 0;
  }

  // Actualizar período
  static async actualizar(id, datos) {
    const campos = [];
    const valores = [];

    Object.keys(datos).forEach(key => {
      if (datos[key] !== undefined && key !== 'id') {
        campos.push(`${key} = ?`);
        valores.push(datos[key]);
      }
    });

    valores.push(id);

    const [result] = await pool.execute(
      `UPDATE periodos_vacaciones SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    return result.affectedRows > 0;
  }

  // Generar períodos automáticamente para un empleado
  static async generarPeriodos(empleadoId, fechaIngreso, anioHasta = new Date().getFullYear()) {
    const fechaInicio = new Date(fechaIngreso);
    const anioIngreso = fechaInicio.getFullYear();
    const periodos = [];

    for (let anio = anioIngreso; anio <= anioHasta; anio++) {
      const fechaInicioPeriodo = new Date(anio, fechaInicio.getMonth(), fechaInicio.getDate());
      const fechaFinPeriodo = new Date(anio + 1, fechaInicio.getMonth(), fechaInicio.getDate() - 1);

      // Verificar si ya existe el período
      const [existente] = await pool.execute(
        `SELECT id FROM periodos_vacaciones 
         WHERE empleado_id = ? AND YEAR(fecha_inicio_periodo) = ?`,
        [empleadoId, anio]
      );

      if (existente.length === 0) {
        const id = await this.crear({
          empleado_id: empleadoId,
          fecha_inicio_periodo: fechaInicioPeriodo.toISOString().split('T')[0],
          fecha_fin_periodo: fechaFinPeriodo.toISOString().split('T')[0],
          tiempo_trabajado: '12 meses',
          observaciones: `Período ${anio}-${anio + 1}`
        });
        periodos.push(id);
      }
    }

    return periodos;
  }

  // Eliminar período
  static async eliminar(id) {
    const [result] = await pool.execute(
      'DELETE FROM periodos_vacaciones WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = PeriodoVacaciones;


