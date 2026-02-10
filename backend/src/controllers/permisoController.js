const PermisoDescanso = require('../models/PermisoDescanso');
const Empleado = require('../models/Empleado');
const path = require('path');
const fs = require('fs').promises;

// ============================================
// FUNCIONES PARA EMPLEADOS
// ============================================

// Obtener mis permisos/descansos
const misPermisos = async (req, res) => {
  try {
    const { tipo, estado, anio } = req.query;
    const filtros = {};
    if (tipo) filtros.tipo = tipo;
    if (estado) filtros.estado = estado;
    if (anio) filtros.anio = parseInt(anio);
    
    const permisos = await PermisoDescanso.listarPorEmpleado(req.usuario.id, filtros);
    
    res.json({
      success: true,
      data: permisos
    });
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Crear nuevo permiso/descanso
const crear = async (req, res) => {
  try {
    const { tipo, fecha_inicio, fecha_fin, motivo, observaciones } = req.body;
    
    if (!tipo || !fecha_inicio || !fecha_fin || !motivo) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        mensaje: 'Tipo, fechas y motivo son requeridos'
      });
    }

    // Calcular días
    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);
    const dias_totales = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;

    if (dias_totales < 1) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        mensaje: 'La fecha de fin debe ser igual o posterior a la fecha de inicio'
      });
    }

    // Para descanso médico, el documento es obligatorio
    if (tipo === 'descanso_medico' && !req.file) {
      return res.status(400).json({
        success: false,
        mensaje: 'El documento médico es obligatorio para descansos médicos'
      });
    }

    const permisoId = await PermisoDescanso.crear({
      empleado_id: req.usuario.id,
      tipo,
      fecha_inicio,
      fecha_fin,
      dias_totales,
      motivo,
      observaciones,
      archivo_nombre: req.file?.originalname || null,
      archivo_path: req.file?.filename || null
    });

    // TODO: Enviar notificación/correo a Rocío si es descanso médico

    res.json({
      success: true,
      mensaje: tipo === 'descanso_medico' 
        ? 'Descanso médico registrado correctamente' 
        : 'Solicitud de permiso creada correctamente',
      data: { id: permisoId }
    });
  } catch (error) {
    console.error('Error al crear permiso:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener detalle de un permiso
const obtener = async (req, res) => {
  try {
    const { id } = req.params;
    
    const permiso = await PermisoDescanso.buscarPorId(parseInt(id));
    if (!permiso) {
      return res.status(404).json({
        success: false,
        mensaje: 'Permiso no encontrado'
      });
    }

    // Verificar que sea del empleado o sea admin/contadora
    const esAdmin = req.usuario.rol_nombre === 'admin' || req.usuario.rol_nombre === 'contadora';
    if (permiso.empleado_id !== req.usuario.id && !esAdmin) {
      return res.status(403).json({
        success: false,
        mensaje: 'No tienes permisos para ver este registro'
      });
    }

    res.json({
      success: true,
      data: permiso
    });
  } catch (error) {
    console.error('Error al obtener permiso:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Eliminar permiso (solo si está pendiente)
const eliminar = async (req, res) => {
  try {
    const { id } = req.params;
    
    const permiso = await PermisoDescanso.buscarPorId(parseInt(id));
    if (!permiso) {
      return res.status(404).json({
        success: false,
        mensaje: 'Permiso no encontrado'
      });
    }

    // Solo el dueño puede eliminar y solo si está pendiente
    const esAdmin = req.usuario.rol_nombre === 'admin' || req.usuario.rol_nombre === 'contadora';
    if (permiso.empleado_id !== req.usuario.id && !esAdmin) {
      return res.status(403).json({
        success: false,
        mensaje: 'No tienes permisos para eliminar este registro'
      });
    }

    if (permiso.estado !== 'pendiente' && !esAdmin) {
      return res.status(400).json({
        success: false,
        mensaje: 'Solo se pueden eliminar registros pendientes'
      });
    }

    // Eliminar archivo si existe
    if (permiso.archivo_path) {
      const filePath = path.join(__dirname, '../../uploads/permisos', permiso.archivo_path);
      await fs.unlink(filePath).catch(() => {});
    }

    await PermisoDescanso.eliminar(parseInt(id));
    
    res.json({
      success: true,
      mensaje: 'Registro eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar permiso:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Descargar documento adjunto
const descargarDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    
    const permiso = await PermisoDescanso.buscarPorId(parseInt(id));
    if (!permiso) {
      return res.status(404).json({
        success: false,
        mensaje: 'Permiso no encontrado'
      });
    }

    // Verificar permisos
    const esAdmin = req.usuario.rol_nombre === 'admin' || req.usuario.rol_nombre === 'contadora';
    if (permiso.empleado_id !== req.usuario.id && !esAdmin) {
      return res.status(403).json({
        success: false,
        mensaje: 'No tienes permisos para descargar este documento'
      });
    }

    if (!permiso.archivo_path) {
      return res.status(404).json({
        success: false,
        mensaje: 'Este registro no tiene documento adjunto'
      });
    }

    const filePath = path.join(__dirname, '../../uploads/permisos', permiso.archivo_path);
    
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        success: false,
        mensaje: 'Archivo no encontrado'
      });
    }

    res.download(filePath, permiso.archivo_nombre);
  } catch (error) {
    console.error('Error al descargar documento:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener mi resumen de permisos
const miResumen = async (req, res) => {
  try {
    const { anio } = req.query;
    const resumen = await PermisoDescanso.obtenerResumen(req.usuario.id, anio ? parseInt(anio) : null);
    
    res.json({
      success: true,
      data: resumen
    });
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// ============================================
// FUNCIONES ADMIN (Rocío)
// ============================================

// Listar todos los permisos
const listarTodos = async (req, res) => {
  try {
    const { empleado_id, tipo, estado, fecha_inicio, fecha_fin } = req.query;
    
    const filtros = {};
    if (empleado_id) filtros.empleado_id = parseInt(empleado_id);
    if (tipo) filtros.tipo = tipo;
    if (estado) filtros.estado = estado;
    if (fecha_inicio && fecha_fin) {
      filtros.fecha_inicio = fecha_inicio;
      filtros.fecha_fin = fecha_fin;
    }
    
    const permisos = await PermisoDescanso.listarTodos(filtros);
    
    res.json({
      success: true,
      data: permisos
    });
  } catch (error) {
    console.error('Error al listar permisos:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Listar permisos pendientes
const listarPendientes = async (req, res) => {
  try {
    const permisos = await PermisoDescanso.listarPendientes();
    
    res.json({
      success: true,
      data: permisos
    });
  } catch (error) {
    console.error('Error al listar pendientes:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Aprobar permiso/descanso
const aprobar = async (req, res) => {
  try {
    const { id } = req.params;
    const { comentarios } = req.body;
    
    const permiso = await PermisoDescanso.buscarPorId(parseInt(id));
    if (!permiso) {
      return res.status(404).json({
        success: false,
        mensaje: 'Permiso no encontrado'
      });
    }

    if (permiso.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        mensaje: 'Este registro ya fue procesado'
      });
    }

    await PermisoDescanso.aprobar(parseInt(id), req.usuario.id, comentarios);
    
    res.json({
      success: true,
      mensaje: 'Permiso aprobado correctamente'
    });
  } catch (error) {
    console.error('Error al aprobar permiso:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Rechazar permiso/descanso
const rechazar = async (req, res) => {
  try {
    const { id } = req.params;
    const { comentarios } = req.body;
    
    if (!comentarios) {
      return res.status(400).json({
        success: false,
        mensaje: 'Debe indicar el motivo del rechazo'
      });
    }

    const permiso = await PermisoDescanso.buscarPorId(parseInt(id));
    if (!permiso) {
      return res.status(404).json({
        success: false,
        mensaje: 'Permiso no encontrado'
      });
    }

    if (permiso.estado !== 'pendiente') {
      return res.status(400).json({
        success: false,
        mensaje: 'Este registro ya fue procesado'
      });
    }

    await PermisoDescanso.rechazar(parseInt(id), req.usuario.id, comentarios);
    
    res.json({
      success: true,
      mensaje: 'Permiso rechazado'
    });
  } catch (error) {
    console.error('Error al rechazar permiso:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Obtener permisos para el calendario
const calendario = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, empleado_id } = req.query;
    
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        success: false,
        mensaje: 'Fechas de inicio y fin son requeridas'
      });
    }
    
    const permisos = await PermisoDescanso.obtenerParaCalendario(
      fecha_inicio, 
      fecha_fin, 
      empleado_id ? parseInt(empleado_id) : null
    );
    
    res.json({
      success: true,
      data: permisos
    });
  } catch (error) {
    console.error('Error al obtener calendario:', error);
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

// Crear permiso desde admin (para otro empleado)
const crearDesdeAdmin = async (req, res) => {
  try {
    const { empleado_id, tipo, fecha_inicio, fecha_fin, motivo, observaciones, estado } = req.body;
    
    if (!empleado_id || !tipo || !fecha_inicio || !fecha_fin || !motivo) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        mensaje: 'Empleado, tipo, fechas y motivo son requeridos'
      });
    }

    // Verificar que el empleado existe
    const empleado = await Empleado.buscarPorId(parseInt(empleado_id));
    if (!empleado) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(404).json({
        success: false,
        mensaje: 'Empleado no encontrado'
      });
    }

    // Calcular días
    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);
    const dias_totales = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;

    const permisoId = await PermisoDescanso.crear({
      empleado_id: parseInt(empleado_id),
      tipo,
      fecha_inicio,
      fecha_fin,
      dias_totales,
      motivo,
      observaciones,
      archivo_nombre: req.file?.originalname || null,
      archivo_path: req.file?.filename || null
    });

    // Si el admin lo crea como aprobado directamente
    if (estado === 'aprobado') {
      await PermisoDescanso.aprobar(permisoId, req.usuario.id, 'Aprobado al registrar');
    }

    res.json({
      success: true,
      mensaje: 'Registro creado correctamente',
      data: { id: permisoId }
    });
  } catch (error) {
    console.error('Error al crear permiso:', error);
    if (req.file) await fs.unlink(req.file.path).catch(() => {});
    res.status(500).json({
      success: false,
      mensaje: 'Error interno del servidor'
    });
  }
};

module.exports = {
  misPermisos,
  crear,
  obtener,
  eliminar,
  descargarDocumento,
  miResumen,
  listarTodos,
  listarPendientes,
  aprobar,
  rechazar,
  calendario,
  crearDesdeAdmin
};
