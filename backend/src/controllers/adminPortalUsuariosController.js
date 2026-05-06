const bcrypt = require('bcryptjs');
const { Empleado, PeriodoVacaciones } = require('../models');
const { pool } = require('../config/database');
const { MODULOS_PORTAL, MODULO_IDS } = require('../constants/portalModulos');
const { tieneAccesoEfectivoModulo, accesoPortalDetalleCompleto } = require('../utils/portalAcceso');

function sinPassword(empleado) {
  if (!empleado) return null;
  const { password: _, ...rest } = empleado;
  return rest;
}

function construirModulosPortalDesdeBody(empleado, incoming) {
  const body = incoming && typeof incoming === 'object' ? incoming : {};
  const out = {};
  for (const mod of MODULOS_PORTAL) {
    out[mod.id] = body[mod.id] === undefined ? true : !!body[mod.id];
  }
  return out;
}

const listarCatalogoModulos = async (req, res) => {
  res.json({ success: true, data: MODULOS_PORTAL });
};

const listarRoles = async (req, res) => {
  try {
    const [roles] = await pool.execute('SELECT * FROM roles ORDER BY id');
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('listarRoles admin portal:', error);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
};

const listarEmpleados = async (req, res) => {
  try {
    const { activo, rol_id, busqueda } = req.query;
    const filtros = {};
    if (activo !== undefined) filtros.activo = activo === 'true';
    if (rol_id) filtros.rol_id = parseInt(rol_id, 10);
    if (busqueda) filtros.busqueda = busqueda;

    const empleados = await Empleado.listarTodos(filtros);
    const data = empleados.map((e) => ({
      ...e,
      acceso_portal_detalle: accesoPortalDetalleCompleto(e)
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('listarEmpleados admin portal:', error);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
};

const obtenerEmpleado = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const empleado = await Empleado.buscarPorId(id);
    if (!empleado) {
      return res.status(404).json({ success: false, mensaje: 'Empleado no encontrado' });
    }

    const modulos_editor = MODULOS_PORTAL.map((mod) => ({
      id: mod.id,
      etiqueta: mod.etiqueta,
      descripcion: mod.descripcion,
      asignado: tieneAccesoEfectivoModulo(empleado, mod.id)
    }));

    res.json({
      success: true,
      data: {
        empleado: sinPassword(empleado),
        modulos_editor
      }
    });
  } catch (error) {
    console.error('obtenerEmpleado admin portal:', error);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
};

const crearEmpleado = async (req, res) => {
  try {
    const {
      codigo_empleado,
      nombres,
      apellidos,
      dni,
      email,
      password,
      cargo,
      fecha_ingreso,
      rol_id,
      jefe_id,
      modulos_portal
    } = req.body;

    if (
      !codigo_empleado ||
      !nombres ||
      !apellidos ||
      !dni ||
      !email ||
      !password ||
      !fecha_ingreso ||
      !rol_id
    ) {
      return res.status(400).json({ success: false, mensaje: 'Faltan campos requeridos' });
    }

    if (await Empleado.buscarPorEmail(email)) {
      return res.status(400).json({ success: false, mensaje: 'Ya existe un empleado con ese email' });
    }
    if (await Empleado.buscarPorCodigo(codigo_empleado)) {
      return res.status(400).json({ success: false, mensaje: 'Ya existe un empleado con ese código' });
    }

    let modulosJson = null;
    if (modulos_portal && typeof modulos_portal === 'object') {
      const [rolesRows] = await pool.execute('SELECT nombre FROM roles WHERE id = ?', [rol_id]);
      const rol_nombre = rolesRows[0]?.nombre;
      if (!rol_nombre) {
        return res.status(400).json({ success: false, mensaje: 'Rol no válido' });
      }
      const fake = { rol_nombre, email, modulos_portal: null };
      modulosJson = construirModulosPortalDesdeBody(fake, modulos_portal);
    }

    const nuevoId = await Empleado.crear({
      codigo_empleado,
      nombres,
      apellidos,
      dni,
      email,
      password,
      cargo,
      fecha_ingreso,
      rol_id,
      jefe_id,
      modulos_portal: modulosJson
    });

    await PeriodoVacaciones.generarPeriodos(nuevoId, fecha_ingreso);

    const creado = await Empleado.buscarPorId(nuevoId);
    res.status(201).json({
      success: true,
      mensaje: 'Usuario creado correctamente',
      data: sinPassword(creado)
    });
  } catch (error) {
    console.error('crearEmpleado admin portal:', error);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
};

const actualizarModulosPortal = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const empleado = await Empleado.buscarPorId(id);
    if (!empleado) {
      return res.status(404).json({ success: false, mensaje: 'Empleado no encontrado' });
    }

    const incoming = req.body.modulos_portal;
    if (!incoming || typeof incoming !== 'object') {
      return res.status(400).json({ success: false, mensaje: 'modulos_portal es requerido' });
    }

    for (const key of Object.keys(incoming)) {
      if (!MODULO_IDS.has(key)) {
        return res.status(400).json({ success: false, mensaje: `Módulo desconocido: ${key}` });
      }
    }

    const modulos_portal = construirModulosPortalDesdeBody(empleado, incoming);
    await Empleado.actualizar(id, { modulos_portal });

    const actualizado = await Empleado.buscarPorId(id);
    res.json({
      success: true,
      mensaje: 'Acceso actualizado',
      data: sinPassword(actualizado)
    });
  } catch (error) {
    console.error('actualizarModulosPortal:', error);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
};

const eliminarPermanentemente = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.usuario.id) {
      return res.status(400).json({ success: false, mensaje: 'No puedes eliminar tu propia cuenta' });
    }
    const ok = await Empleado.eliminarPermanentemente(id);
    if (!ok) {
      return res.status(404).json({ success: false, mensaje: 'Empleado no encontrado' });
    }
    res.json({ success: true, mensaje: 'Usuario eliminado definitivamente' });
  } catch (error) {
    console.error('eliminarPermanentemente:', error);
    const ref = error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451;
    res.status(400).json({
      success: false,
      mensaje: ref
        ? 'No se pudo eliminar: existen registros vinculados que no se pudieron borrar automáticamente.'
        : error.message || 'Error al eliminar usuario'
    });
  }
};

const bloquearEmpleado = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.usuario.id) {
      return res.status(400).json({ success: false, mensaje: 'No puedes bloquear tu propia cuenta' });
    }
    const empleado = await Empleado.buscarPorId(id);
    if (!empleado) {
      return res.status(404).json({ success: false, mensaje: 'Empleado no encontrado' });
    }
    await Empleado.desactivar(id);
    res.json({ success: true, mensaje: 'Usuario desactivado (bloqueado)' });
  } catch (error) {
    console.error('bloquearEmpleado:', error);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
};

const actualizarCuenta = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const empleado = await Empleado.buscarPorId(id);
    if (!empleado) {
      return res.status(404).json({ success: false, mensaje: 'Empleado no encontrado' });
    }

    const permitidos = [
      'nombres',
      'apellidos',
      'email',
      'dni',
      'cargo',
      'fecha_ingreso',
      'codigo_empleado',
      'rol_id',
      'es_consultor_cp'
    ];
    const datos = {};
    for (const k of permitidos) {
      if (req.body[k] === undefined) continue;
      if (k === 'cargo') {
        datos.cargo = req.body[k] === '' || req.body[k] == null ? null : String(req.body[k]).trim();
        continue;
      }
      if (k === 'es_consultor_cp') {
        const v = req.body[k];
        datos.es_consultor_cp = v === true || v === 1 || v === '1' ? 1 : 0;
        continue;
      }
      const v = req.body[k];
      datos[k] = typeof v === 'string' ? v.trim() : v;
    }

    if (datos.rol_id !== undefined) {
      datos.rol_id = parseInt(datos.rol_id, 10);
      if (Number.isNaN(datos.rol_id)) {
        return res.status(400).json({ success: false, mensaje: 'rol_id no válido' });
      }
      const [r0] = await pool.execute('SELECT id FROM roles WHERE id = ?', [datos.rol_id]);
      if (!r0.length) {
        return res.status(400).json({ success: false, mensaje: 'Rol no existe' });
      }
    }

    if (datos.email && datos.email !== empleado.email) {
      const ex = await Empleado.buscarPorEmail(datos.email);
      if (ex) {
        return res.status(400).json({ success: false, mensaje: 'Ya existe un empleado con ese email' });
      }
    }
    if (datos.codigo_empleado && datos.codigo_empleado !== empleado.codigo_empleado) {
      const ex = await Empleado.buscarPorCodigo(datos.codigo_empleado);
      if (ex) {
        return res.status(400).json({ success: false, mensaje: 'Ya existe ese código de empleado' });
      }
    }
    if (datos.dni && datos.dni !== empleado.dni) {
      const ex = await Empleado.buscarPorDni(datos.dni);
      if (ex) {
        return res.status(400).json({ success: false, mensaje: 'Ya existe un empleado con ese DNI' });
      }
    }

    if (Object.keys(datos).length === 0) {
      return res.status(400).json({ success: false, mensaje: 'No hay datos para actualizar' });
    }

    await Empleado.actualizar(id, datos);
    const actualizado = await Empleado.buscarPorId(id);
    res.json({
      success: true,
      mensaje: 'Cuenta actualizada',
      data: sinPassword(actualizado)
    });
  } catch (error) {
    console.error('actualizarCuenta admin portal:', error);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
};

const vacacionesEmpleado = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ success: false, mensaje: 'ID inválido' });
    }
    const empleado = await Empleado.buscarPorId(id);
    if (!empleado) {
      return res.status(404).json({ success: false, mensaje: 'Empleado no encontrado' });
    }
    /* Misma regla que el portal empleado: tope operativo (sin períodos auto-renovados futuros hasta que RRHH cargue período empresa). */
    const periodos = await PeriodoVacaciones.listarPorEmpleado(id, { vistaEmpleado: true });
    const rawResumen = await PeriodoVacaciones.obtenerResumen(id, { vistaEmpleado: true });
    const resumen = {
      total_ganados: Number(rawResumen?.total_ganados) || 0,
      total_gozados: Number(rawResumen?.total_gozados) || 0,
      total_pendientes: Number(rawResumen?.total_pendientes) || 0
    };
    res.json({
      success: true,
      data: { periodos, resumen }
    });
  } catch (error) {
    console.error('vacacionesEmpleado admin portal:', error);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
};

const restablecerPassword = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { password_nueva } = req.body;
    if (!password_nueva || password_nueva.length < 6) {
      return res.status(400).json({
        success: false,
        mensaje: 'password_nueva es requerida (mínimo 6 caracteres)'
      });
    }
    const empleado = await Empleado.buscarPorId(id);
    if (!empleado) {
      return res.status(404).json({ success: false, mensaje: 'Empleado no encontrado' });
    }
    const hash = await bcrypt.hash(password_nueva, 10);
    await Empleado.actualizarPassword(id, hash);
    res.json({ success: true, mensaje: 'Contraseña actualizada' });
  } catch (error) {
    console.error('restablecerPassword admin portal:', error);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
};

module.exports = {
  listarCatalogoModulos,
  listarRoles,
  listarEmpleados,
  obtenerEmpleado,
  vacacionesEmpleado,
  crearEmpleado,
  actualizarCuenta,
  actualizarModulosPortal,
  eliminarPermanentemente,
  bloquearEmpleado,
  restablecerPassword
};
