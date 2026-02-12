const { 
  SolicitudVacaciones, 
  PeriodoVacaciones, 
  Aprobacion, 
  Notificacion,
  Empleado 
} = require('../models');
const moment = require('moment');
const { calcularDiasVacaciones } = require('../utils/calcularDiasVacaciones');
const emailService = require('../services/emailService');

// Crear solicitud
const crear = async (req, res) => {
  try {
    const {
      periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones,
      fecha_efectiva_salida, fecha_efectiva_regreso, observaciones,
      dias_solicitados: diasDelFrontend // Opcional: días calculados en frontend
    } = req.body;

    const empleadoId = req.usuario.id;

    // Validar período
    const periodo = await PeriodoVacaciones.buscarPorId(periodo_id);
    if (!periodo || periodo.empleado_id !== empleadoId) {
      return res.status(400).json({
        success: false,
        mensaje: 'Período de vacaciones inválido'
      });
    }

    // Calcular días solicitados según política de la empresa
    // Si el frontend envía los días, los usamos; si no, calculamos aquí
    const calculoDias = calcularDiasVacaciones(fecha_inicio_vacaciones, fecha_fin_vacaciones);
    const diasSolicitados = diasDelFrontend || calculoDias.diasTotales;

    // Verificar días disponibles
    if (diasSolicitados > periodo.dias_pendientes) {
      return res.status(400).json({
        success: false,
        mensaje: `Solo tienes ${periodo.dias_pendientes} días disponibles en este período. Solicitaste ${diasSolicitados} días.`
      });
    }

    // Verificar conflictos de fechas
    const conflictos = await SolicitudVacaciones.verificarConflictos(
      empleadoId, fecha_inicio_vacaciones, fecha_fin_vacaciones
    );
    if (conflictos.length > 0) {
      return res.status(400).json({
        success: false,
        mensaje: 'Ya tienes una solicitud en esas fechas'
      });
    }

    const id = await SolicitudVacaciones.crear({
      empleado_id: empleadoId,
      periodo_id,
      fecha_inicio_vacaciones,
      fecha_fin_vacaciones,
      dias_solicitados: diasSolicitados,
      fecha_efectiva_salida,
      fecha_efectiva_regreso,
      observaciones
    });

    const solicitud = await SolicitudVacaciones.buscarPorId(id);

    res.status(201).json({
      success: true,
      mensaje: 'Solicitud creada como borrador',
      data: solicitud
    });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Enviar solicitud (pasar de borrador a pendiente)
const enviar = async (req, res) => {
  try {
    const { id } = req.params;
    const solicitud = await SolicitudVacaciones.buscarPorId(parseInt(id));

    if (!solicitud) {
      return res.status(404).json({
        success: false,
        mensaje: 'Solicitud no encontrada'
      });
    }

    if (solicitud.empleado_id !== req.usuario.id) {
      return res.status(403).json({
        success: false,
        mensaje: 'No puedes enviar esta solicitud'
      });
    }

    if (solicitud.estado !== 'borrador') {
      return res.status(400).json({
        success: false,
        mensaje: 'La solicitud ya fue enviada'
      });
    }

    // Determinar flujo de aprobación según si tiene jefe directo
    const empleado = await Empleado.buscarPorId(req.usuario.id);
    
    if (empleado.jefe_id) {
      // Tiene jefe directo: pasar a pendiente_jefe
      await SolicitudVacaciones.actualizarEstado(parseInt(id), 'pendiente_jefe');
      
      await Aprobacion.crear({
        solicitud_id: parseInt(id),
        aprobador_id: empleado.jefe_id,
        tipo_aprobacion: 'jefe'
      });

      // Notificar al jefe (sistema interno)
      await Notificacion.notificarSolicitudEnviada(parseInt(id), req.usuario.id, empleado.jefe_id);
      
      // Enviar email al jefe
      const jefe = await Empleado.buscarPorId(empleado.jefe_id);
      if (jefe) {
        emailService.notificarNuevaSolicitud(solicitud, empleado, jefe)
          .catch(err => console.error('Error enviando email:', err));
      }
    } else {
      // NO tiene jefe directo: ir directo a contadora (Rocío)
      await SolicitudVacaciones.actualizarEstado(parseInt(id), 'pendiente_contadora');
      
      const contadoras = await Empleado.obtenerPorRol('contadora');
      if (contadoras.length > 0) {
        await Aprobacion.crear({
          solicitud_id: parseInt(id),
          aprobador_id: contadoras[0].id,
          tipo_aprobacion: 'contadora'
        });

        // Notificar a la contadora (sistema interno)
        await Notificacion.notificarSolicitudEnviada(parseInt(id), req.usuario.id, contadoras[0].id);
        
        // Enviar email a la contadora
        emailService.notificarNuevaSolicitud(solicitud, empleado, contadoras[0])
          .catch(err => console.error('Error enviando email:', err));
      }
    }

    res.json({
      success: true,
      mensaje: 'Solicitud enviada correctamente'
    });
  } catch (error) {
    console.error('Error al enviar solicitud:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Aprobar solicitud
const aprobar = async (req, res) => {
  try {
    const { id } = req.params;
    const { comentarios } = req.body;
    const aprobadorId = req.usuario.id;

    const solicitud = await SolicitudVacaciones.buscarPorId(parseInt(id));
    if (!solicitud) {
      return res.status(404).json({
        success: false,
        mensaje: 'Solicitud no encontrada'
      });
    }

    // Admin o Contadora pueden aprobar directamente cualquier solicitud pendiente
    const esContadoraOAdmin = req.usuario.rol_nombre === 'admin' || req.usuario.rol_nombre === 'contadora';

    // Determinar tipo de aprobación según estado actual
    let tipoAprobacion;
    let siguienteEstado;

    if (solicitud.estado === 'pendiente_jefe') {
      // Si es contadora/admin, puede aprobar directamente y pasar a aprobada
      if (esContadoraOAdmin) {
        tipoAprobacion = 'contadora';
        siguienteEstado = 'aprobada';
        
        // Aprobar primero como jefe si existe la aprobación pendiente
        const aprobacionJefe = await Aprobacion.obtenerPendientePorTipo(parseInt(id), 'jefe');
        if (aprobacionJefe) {
          await Aprobacion.aprobar(aprobacionJefe.id, 'Aprobado por contadora');
        }
      } else {
        tipoAprobacion = 'jefe';
        siguienteEstado = 'pendiente_contadora';
      }
    } else if (solicitud.estado === 'pendiente_contadora') {
      tipoAprobacion = 'contadora';
      siguienteEstado = 'aprobada';
    } else {
      return res.status(400).json({
        success: false,
        mensaje: 'La solicitud no está en estado de aprobación'
      });
    }

    // Verificar que el usuario tenga permisos
    const aprobacion = await Aprobacion.obtenerPendientePorTipo(parseInt(id), tipoAprobacion);
    if (!aprobacion) {
      // Si no existe, verificar que tenga el rol adecuado
      if (!esContadoraOAdmin) {
        if (tipoAprobacion === 'jefe' && req.usuario.nivel_aprobacion < 1) {
          return res.status(403).json({
            success: false,
            mensaje: 'No tienes permisos para aprobar'
          });
        }
        if (tipoAprobacion === 'contadora' && req.usuario.nivel_aprobacion < 2) {
          return res.status(403).json({
            success: false,
            mensaje: 'No tienes permisos para aprobar'
          });
        }
      }

      // Crear el registro de aprobación
      const nuevaAprobacionId = await Aprobacion.crear({
        solicitud_id: parseInt(id),
        aprobador_id: aprobadorId,
        tipo_aprobacion: tipoAprobacion
      });
      await Aprobacion.aprobar(nuevaAprobacionId, comentarios);
    } else {
      await Aprobacion.aprobar(aprobacion.id, comentarios);
    }

    // Actualizar estado de solicitud
    await SolicitudVacaciones.actualizarEstado(parseInt(id), siguienteEstado);

    // Obtener datos del empleado y aprobador para emails
    const empleadoSolicitud = await Empleado.buscarPorId(solicitud.empleado_id);
    const aprobador = await Empleado.buscarPorId(aprobadorId);

    // Notificaciones
    if (tipoAprobacion === 'jefe' && !esContadoraOAdmin) {
      // Buscar contadora para siguiente aprobación
      const contadoras = await Empleado.obtenerPorRol('contadora');
      if (contadoras.length > 0) {
        await Aprobacion.crear({
          solicitud_id: parseInt(id),
          aprobador_id: contadoras[0].id,
          tipo_aprobacion: 'contadora'
        });
        await Notificacion.notificarAprobacionJefe(parseInt(id), solicitud.empleado_id, contadoras[0].id);
        
        // Enviar emails: al empleado y a la contadora
        emailService.notificarAprobacionJefe(solicitud, empleadoSolicitud, aprobador, contadoras[0])
          .catch(err => console.error('Error enviando email:', err));
      }
    }
    
    // Si llegamos a aprobada (sea por contadora directamente o después del jefe)
    if (siguienteEstado === 'aprobada') {
      // Aprobación final - actualizar días gozados
      await PeriodoVacaciones.actualizarDiasGozados(solicitud.periodo_id, solicitud.dias_solicitados);
      await Notificacion.notificarAprobacionFinal(parseInt(id), solicitud.empleado_id);
      
      // Enviar email de aprobación final al empleado
      emailService.notificarAprobacionFinal(solicitud, empleadoSolicitud, aprobador)
        .catch(err => console.error('Error enviando email:', err));
    }

    res.json({
      success: true,
      mensaje: 'Solicitud aprobada correctamente'
    });
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Rechazar solicitud
const rechazar = async (req, res) => {
  try {
    const { id } = req.params;
    const { comentarios } = req.body;

    if (!comentarios) {
      return res.status(400).json({
        success: false,
        mensaje: 'Debes proporcionar un motivo de rechazo'
      });
    }

    const solicitud = await SolicitudVacaciones.buscarPorId(parseInt(id));
    if (!solicitud) {
      return res.status(404).json({
        success: false,
        mensaje: 'Solicitud no encontrada'
      });
    }

    // Determinar tipo de aprobación según estado
    let tipoAprobacion;
    if (solicitud.estado === 'pendiente_jefe') {
      tipoAprobacion = 'jefe';
    } else if (solicitud.estado === 'pendiente_contadora') {
      tipoAprobacion = 'contadora';
    } else {
      return res.status(400).json({
        success: false,
        mensaje: 'La solicitud no puede ser rechazada'
      });
    }

    // Actualizar aprobación
    const aprobacion = await Aprobacion.obtenerPendientePorTipo(parseInt(id), tipoAprobacion);
    if (aprobacion) {
      await Aprobacion.rechazar(aprobacion.id, comentarios);
    }

    // Actualizar estado de solicitud
    await SolicitudVacaciones.actualizarEstado(parseInt(id), 'rechazada');

    // Notificar al empleado (sistema interno)
    await Notificacion.notificarRechazo(parseInt(id), solicitud.empleado_id, comentarios);

    // Enviar email de rechazo al empleado
    const empleadoSolicitud = await Empleado.buscarPorId(solicitud.empleado_id);
    const rechazadoPor = await Empleado.buscarPorId(req.usuario.id);
    emailService.notificarRechazo(solicitud, empleadoSolicitud, rechazadoPor, comentarios)
      .catch(err => console.error('Error enviando email:', err));

    res.json({
      success: true,
      mensaje: 'Solicitud rechazada'
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Listar mis solicitudes
const listarMias = async (req, res) => {
  try {
    const { estado, anio } = req.query;
    const filtros = {};
    if (estado) filtros.estado = estado;
    if (anio) filtros.anio = parseInt(anio);

    const solicitudes = await SolicitudVacaciones.listarPorEmpleado(req.usuario.id, filtros);

    res.json({
      success: true,
      data: solicitudes
    });
  } catch (error) {
    console.error('Error al listar solicitudes:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Listar pendientes de aprobación
const listarPendientesAprobacion = async (req, res) => {
  try {
    // Admin o Contadora pueden ver TODAS las solicitudes pendientes (tanto pendiente_jefe como pendiente_contadora)
    if (req.usuario.rol_nombre === 'admin' || req.usuario.rol_nombre === 'contadora') {
      const solicitudes = await SolicitudVacaciones.listarTodasPendientes();
      return res.json({ success: true, data: solicitudes });
    }

    // Determinar tipo de aprobación según rol
    let tipoAprobacion;
    if (req.usuario.nivel_aprobacion >= 2) {
      tipoAprobacion = 'contadora';
    } else if (req.usuario.nivel_aprobacion === 1 || req.usuario.rol_nombre === 'jefe_operaciones') {
      tipoAprobacion = 'jefe';
    } else {
      return res.json({ success: true, data: [] });
    }

    // IMPORTANTE: Solo mostrar solicitudes donde este usuario es el aprobador asignado
    const solicitudes = await SolicitudVacaciones.listarPendientesAprobacion(
      req.usuario.id, tipoAprobacion
    );

    res.json({
      success: true,
      data: solicitudes
    });
  } catch (error) {
    console.error('Error al listar pendientes:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Listar todas (admin)
const listarTodas = async (req, res) => {
  try {
    const { estado, empleado_id, fecha_desde, fecha_hasta, limite } = req.query;
    const filtros = {};
    if (estado) filtros.estado = estado;
    if (empleado_id) filtros.empleado_id = parseInt(empleado_id);
    if (fecha_desde) filtros.fecha_desde = fecha_desde;
    if (fecha_hasta) filtros.fecha_hasta = fecha_hasta;
    if (limite) filtros.limite = limite;

    const solicitudes = await SolicitudVacaciones.listarTodas(filtros);

    res.json({
      success: true,
      data: solicitudes
    });
  } catch (error) {
    console.error('Error al listar todas las solicitudes:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener solicitud por ID
const obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const solicitud = await SolicitudVacaciones.buscarPorId(parseInt(id));

    if (!solicitud) {
      return res.status(404).json({
        success: false,
        mensaje: 'Solicitud no encontrada'
      });
    }

    // Obtener aprobaciones
    const aprobaciones = await Aprobacion.listarPorSolicitud(parseInt(id));

    res.json({
      success: true,
      data: {
        ...solicitud,
        aprobaciones
      }
    });
  } catch (error) {
    console.error('Error al obtener solicitud:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener para calendario
const obtenerCalendario = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, empleado_id } = req.query;

    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        mensaje: 'Fechas de inicio y fin son requeridas'
      });
    }

    const solicitudes = await SolicitudVacaciones.obtenerParaCalendario(
      fecha_inicio, fecha_fin, empleado_id ? parseInt(empleado_id) : null
    );

    res.json({
      success: true,
      data: solicitudes
    });
  } catch (error) {
    console.error('Error al obtener calendario:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Cancelar solicitud
const cancelar = async (req, res) => {
  try {
    const { id } = req.params;
    const solicitud = await SolicitudVacaciones.buscarPorId(parseInt(id));

    if (!solicitud) {
      return res.status(404).json({
        success: false,
        mensaje: 'Solicitud no encontrada'
      });
    }

    if (solicitud.empleado_id !== req.usuario.id && req.usuario.rol_nombre !== 'admin') {
      return res.status(403).json({
        success: false,
        mensaje: 'No puedes cancelar esta solicitud'
      });
    }

    if (solicitud.estado === 'aprobada') {
      return res.status(400).json({
        success: false,
        mensaje: 'No se puede cancelar una solicitud aprobada'
      });
    }

    await SolicitudVacaciones.cancelar(parseInt(id));

    res.json({
      success: true,
      mensaje: 'Solicitud cancelada'
    });
  } catch (error) {
    console.error('Error al cancelar solicitud:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Eliminar solicitud
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    const solicitud = await SolicitudVacaciones.buscarPorId(parseInt(id));

    if (!solicitud) {
      return res.status(404).json({
        success: false,
        mensaje: 'Solicitud no encontrada'
      });
    }

    // Verificar permisos: solo el dueño, admin o contadora pueden eliminar
    const esAdmin = req.usuario.rol_nombre === 'admin';
    const esContadora = req.usuario.rol_nombre === 'contadora';
    const esDueno = solicitud.empleado_id === req.usuario.id;

    if (!esDueno && !esAdmin && !esContadora) {
      return res.status(403).json({
        success: false,
        mensaje: 'No tienes permisos para eliminar esta solicitud'
      });
    }

    // Si la solicitud está aprobada, revertir los días gozados
    if (solicitud.estado === 'aprobada') {
      await PeriodoVacaciones.revertirDiasGozados(solicitud.periodo_id, solicitud.dias_solicitados);
    }

    await SolicitudVacaciones.eliminar(parseInt(id));

    res.json({
      success: true,
      mensaje: 'Solicitud eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar solicitud:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener salidas gozadas por período
const obtenerSalidasPorPeriodo = async (req, res) => {
  try {
    const { periodoId } = req.params;
    
    const salidas = await SolicitudVacaciones.listarSalidasPorPeriodo(parseInt(periodoId));

    res.json({
      success: true,
      data: salidas
    });
  } catch (error) {
    console.error('Error al obtener salidas por período:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

module.exports = {
  crear,
  enviar,
  aprobar,
  rechazar,
  listarMias,
  listarPendientesAprobacion,
  listarTodas,
  obtener,
  obtenerCalendario,
  cancelar,
  eliminar,
  obtenerSalidasPorPeriodo
};

