const { pool } = require('../config/database');

/** Mensaje claro para errores SQL al registrar rendiciones. */
function mensajeErrorSqlRendicion(error) {
  const msg = String(error?.sqlMessage || error?.message || '');
  const errno = error?.errno;

  if (errno === 1146 || /doesn't exist/i.test(msg)) {
    if (/tokens_rendicion_presupuesto/i.test(msg)) {
      return 'Falta la tabla tokens_rendicion_presupuesto. Ejecute backend/sql/rendiciones_presupuesto.sql en MySQL.';
    }
    if (/rendicion_caja_periodos/i.test(msg)) {
      return 'Falta la tabla rendicion_caja_periodos. Ejecute backend/sql/rendicion_caja_periodos.sql en MySQL.';
    }
    return 'Falta la tabla rendiciones_presupuesto. Ejecute backend/sql/setup_rendiciones_presupuesto_produccion.sql en MySQL.';
  }

  if (errno === 1054 || /Unknown column/i.test(msg)) {
    return `Base de datos desactualizada (${msg}). Ejecute backend/sql/setup_rendiciones_presupuesto_produccion.sql en el servidor.`;
  }

  if (errno === 1265 || /Data truncated/i.test(msg)) {
    return 'Datos no válidos para el área o la moneda. Revise el formulario e intente de nuevo.';
  }

  if (errno === 1452 || /foreign key constraint/i.test(msg)) {
    return 'No se pudo vincular el registro al usuario. Cierre sesión y vuelva a entrar.';
  }

  return null;
}

async function diagnosticoBdRendicion() {
  const out = {
    tabla_rendiciones: false,
    tabla_tokens: false,
    columnas: {}
  };
  try {
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rendiciones_presupuesto'`
    );
    out.tabla_rendiciones = cols.length > 0;
    const names = new Set(cols.map((c) => c.COLUMN_NAME));
    for (const col of ['area', 'moneda', 'monto', 'fecha_solicitud_usuario']) {
      out.columnas[col] = names.has(col);
    }
  } catch (_) {
    out.tabla_rendiciones = false;
  }
  try {
    await pool.execute('SELECT 1 FROM tokens_rendicion_presupuesto LIMIT 1');
    out.tabla_tokens = true;
  } catch (_) {
    out.tabla_tokens = false;
  }
  out.listo =
    out.tabla_rendiciones &&
    out.tabla_tokens &&
    out.columnas.area &&
    out.columnas.moneda;
  return out;
}

module.exports = { mensajeErrorSqlRendicion, diagnosticoBdRendicion };
