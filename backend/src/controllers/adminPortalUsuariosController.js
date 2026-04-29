const bcrypt = require('bcryptjs');
const { Empleado, PeriodoVacaciones } = require('../models');
const { pool } = require('../config/database');
const { MODULOS_PORTAL, MODULO_IDS } = require('../constants/portalModulos');
const { rolPuedeModuloBase, etiquetasAccesoResumen } = require('../utils/portalAcceso');

function sinPassword(empleado) {
  if (!empleado) return null;
  const { password: _, ...rest } = empleado;
  return rest;
}

function modulosAsignado(empleado, moduloId) {
  if (!rolPuedeModuloBase(empleado.rol_nombre, moduloId, empleado.email)) return false;
  const m = empleado.modulos_portal;
  if (m == null || typeof m !== 'object') return true;
  return m[moduloId] !== false;
}

function construirModulosPortalDesdeBody(empleado, incoming) {
  const body = incoming && typeof incoming === 'object' ? incoming : {};
  const out = {};
  for (const mod of MODULOS_PORTAL) {
    if (!rolPuedeModuloBase(empleado.rol_nombre, mod.id, empleado.email)) continue;
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
      acceso_portal: etiquetasAccesoResumen(e)
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

    const modulos_editor = MODULOS_PORTAL.filter((mod) =>
      rolPuedeModuloBase(empleado.rol_nombre, mod.id, empleado.email)
    ).map((mod) => ({
      id: mod.id,
      etiqueta: mod.etiqueta,
      descripcion: mod.descripcion,
      asignado: modulosAsignado(empleado, mod.id)
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
  crearEmpleado,
  actualizarModulosPortal,
  bloquearEmpleado,
  restablecerPassword
};
