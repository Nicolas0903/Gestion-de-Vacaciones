const { pool } = require('../config/database');

class Notificacion {
  // Crear notificación
  static async crear(datos) {
    const { empleado_id, titulo, mensaje, tipo = 'info', enlace } = datos;

    const [result] = await pool.execute(
      `INSERT INTO notificaciones (empleado_id, titulo, mensaje, tipo, enlace)
       VALUES (?, ?, ?, ?, ?)`,
      [empleado_id, titulo, mensaje, tipo, enlace || null]
    );

    return result.insertId;
  }

  // Listar notificaciones de un empleado
  static async listarPorEmpleado(empleadoId, soloNoLeidas = false) {
    let query = `
      SELECT * FROM notificaciones
      WHERE empleado_id = ?
    `;

    if (soloNoLeidas) {
      query += ' AND leida = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const [rows] = await pool.execute(query, [empleadoId]);
    return rows;
  }

  // Contar notificaciones no leídas
  static async contarNoLeidas(empleadoId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as total FROM notificaciones WHERE empleado_id = ? AND leida = FALSE',
      [empleadoId]
    );
    return rows[0].total;
  }

  // Marcar como leída
  static async marcarLeida(id) {
    const [result] = await pool.execute(
      'UPDATE notificaciones SET leida = TRUE WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Marcar todas como leídas
  static async marcarTodasLeidas(empleadoId) {
    const [result] = await pool.execute(
      'UPDATE notificaciones SET leida = TRUE WHERE empleado_id = ?',
      [empleadoId]
    );
    return result.affectedRows;
  }

  // Eliminar notificación
  static async eliminar(id) {
    const [result] = await pool.execute(
      'DELETE FROM notificaciones WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  // Eliminar notificaciones antiguas (más de 30 días)
  static async limpiarAntiguas() {
    const [result] = await pool.execute(
      'DELETE FROM notificaciones WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) AND leida = TRUE'
    );
    return result.affectedRows;
  }

  // Notificaciones predefinidas
  static async notificarSolicitudEnviada(solicitudId, empleadoId, jefeId) {
    // Notificar al jefe
    await this.crear({
      empleado_id: jefeId,
      titulo: 'Nueva solicitud de vacaciones',
      mensaje: 'Tienes una nueva solicitud de vacaciones pendiente de aprobación.',
      tipo: 'info',
      enlace: `/solicitudes/${solicitudId}`
    });
  }

  static async notificarAprobacionJefe(solicitudId, empleadoId, contadoraId) {
    // Notificar al empleado
    await this.crear({
      empleado_id: empleadoId,
      titulo: 'Solicitud aprobada por jefe',
      mensaje: 'Tu solicitud de vacaciones ha sido aprobada por tu jefe. Pendiente de aprobación de contaduría.',
      tipo: 'success',
      enlace: `/solicitudes/${solicitudId}`
    });

    // Notificar a contadora
    await this.crear({
      empleado_id: contadoraId,
      titulo: 'Solicitud pendiente de aprobación',
      mensaje: 'Hay una solicitud de vacaciones pendiente de tu aprobación final.',
      tipo: 'info',
      enlace: `/solicitudes/${solicitudId}`
    });
  }

  static async notificarAprobacionFinal(solicitudId, empleadoId) {
    await this.crear({
      empleado_id: empleadoId,
      titulo: '¡Vacaciones aprobadas!',
      mensaje: 'Tu solicitud de vacaciones ha sido aprobada completamente. ¡Disfruta tu descanso!',
      tipo: 'success',
      enlace: `/solicitudes/${solicitudId}`
    });
  }

  static async notificarRechazo(solicitudId, empleadoId, motivo) {
    await this.crear({
      empleado_id: empleadoId,
      titulo: 'Solicitud rechazada',
      mensaje: `Tu solicitud de vacaciones ha sido rechazada. Motivo: ${motivo}`,
      tipo: 'error',
      enlace: `/solicitudes/${solicitudId}`
    });
  }
}

module.exports = Notificacion;


