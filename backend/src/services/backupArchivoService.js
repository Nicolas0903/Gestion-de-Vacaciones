const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ExcelJS = require('exceljs');
const { pool } = require('../config/database');
const BackupSnapshot = require('../models/BackupSnapshot');
const emailService = require('./emailService');

const BACKUP_ROOT = path.join(__dirname, '../../backups');
const TIMEZONE = process.env.BACKUP_TIMEZONE || 'America/Lima';
const RETENTION_DAYS = Math.max(Number(process.env.BACKUP_RETENTION_DAYS) || 90, 7);
const MAX_EMAIL_MB = Math.max(Number(process.env.BACKUP_MAX_EMAIL_ATTACHMENT_MB) || 8, 1);

let ejecutando = false;

const EXPORT_SHEETS = [
  {
    name: 'Empleados',
    sql: `
      SELECT e.id, e.nombres, e.apellidos, e.email, e.dni, e.cargo, e.area, e.activo,
             r.nombre AS rol, e.nivel_aprobacion, e.fecha_ingreso, e.fecha_nacimiento,
             e.created_at, e.updated_at
      FROM empleados e
      LEFT JOIN roles r ON r.id = e.rol_id
      ORDER BY e.apellidos, e.nombres`
  },
  {
    name: 'Periodos vacaciones',
    sql: `
      SELECT pv.*, CONCAT(e.nombres, ' ', e.apellidos) AS empleado, e.email AS email_empleado
      FROM periodos_vacaciones pv
      JOIN empleados e ON e.id = pv.empleado_id
      ORDER BY pv.fecha_inicio_periodo DESC`
  },
  {
    name: 'Solicitudes vacaciones',
    sql: `
      SELECT sv.*, CONCAT(e.nombres, ' ', e.apellidos) AS empleado, e.email AS email_empleado
      FROM solicitudes_vacaciones sv
      JOIN empleados e ON e.id = sv.empleado_id
      ORDER BY sv.created_at DESC`
  },
  {
    name: 'Permisos descansos',
    sql: `
      SELECT pd.*, CONCAT(e.nombres, ' ', e.apellidos) AS empleado, e.email AS email_empleado
      FROM permisos_descansos pd
      JOIN empleados e ON e.id = pd.empleado_id
      ORDER BY pd.created_at DESC`
  },
  {
    name: 'Reintegros',
    sql: `
      SELECT sr.*, CONCAT(e.nombres, ' ', e.apellidos) AS empleado, e.email AS email_empleado
      FROM solicitudes_reembolso sr
      JOIN empleados e ON e.id = sr.empleado_id
      ORDER BY sr.created_at DESC`
  },
  {
    name: 'Rendicion presupuesto',
    sql: `
      SELECT rp.*, CONCAT(e.nombres, ' ', e.apellidos) AS empleado, e.email AS email_empleado
      FROM rendiciones_presupuesto rp
      JOIN empleados e ON e.id = rp.empleado_id
      ORDER BY rp.created_at DESC`
  },
  {
    name: 'Caja chica periodos',
    sql: `SELECT * FROM caja_chica_periodos ORDER BY anio DESC, mes DESC`
  },
  {
    name: 'Caja chica ingresos',
    sql: `
      SELECT ci.*, cp.anio, cp.mes
      FROM caja_chica_ingresos ci
      JOIN caja_chica_periodos cp ON cp.id = ci.periodo_id
      ORDER BY cp.anio DESC, cp.mes DESC, ci.id`
  },
  {
    name: 'Rendicion caja',
    sql: `SELECT * FROM rendicion_caja_periodos ORDER BY created_at DESC`
  },
  {
    name: 'Proveedores',
    sql: `SELECT * FROM proveedores ORDER BY razon_social`
  },
  {
    name: 'Evaluaciones proveedor',
    sql: `SELECT * FROM evaluaciones_proveedor ORDER BY created_at DESC`
  },
  {
    name: 'Reevaluaciones proveedor',
    sql: `SELECT * FROM reevaluaciones_proveedor ORDER BY created_at DESC`
  },
  {
    name: 'Bolsa horas proyectos',
    sql: `SELECT * FROM cp_proyectos ORDER BY created_at DESC`
  },
  {
    name: 'Bolsa horas actividades',
    sql: `
      SELECT a.*, p.proyecto AS nombre_proyecto,
             CONCAT(e.nombres, ' ', e.apellidos) AS consultor
      FROM cp_actividades a
      LEFT JOIN cp_proyectos p ON p.id = a.proyecto_id
      LEFT JOIN empleados e ON e.id = a.consultor_id
      ORDER BY a.fecha_inicio DESC`
  },
  {
    name: 'Boletas pago',
    sql: `
      SELECT b.*, CONCAT(e.nombres, ' ', e.apellidos) AS empleado
      FROM boletas_pago b
      JOIN empleados e ON e.id = b.empleado_id
      ORDER BY b.anio DESC, b.mes DESC`
  },
  {
    name: 'Solicitudes registro',
    sql: `SELECT * FROM solicitudes_registro ORDER BY created_at DESC`
  }
];

function asegurarDirectorio(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fechaHoraPeru() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return {
    fecha: `${get('year')}-${get('month')}-${get('day')}`,
    hora: `${get('hour')}:${get('minute')}`,
    etiqueta: `${get('day')}/${get('month')}/${get('year')} ${get('hour')}:${get('minute')}`
  };
}

function restarDiasFecha(isoDate, dias) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

function etiquetaTurno(turno) {
  return turno === 'manana' ? '08:30 (inicio jornada)' : '17:30 (fin jornada)';
}

function destinatariosBackup() {
  const raw =
    process.env.BACKUP_EMAILS ||
    'rocio.picon@prayaga.biz,nicolas.valdivia@prayaga.biz';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function tablaExiste(nombreTabla) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [nombreTabla]
  );
  return rows.length > 0;
}

async function agregarHojaDesdeQuery(workbook, sheetName, sql) {
  const nombre = sheetName.substring(0, 31);
  const ws = workbook.addWorksheet(nombre);
  try {
    const [rows] = await pool.query(sql);
    if (!rows.length) {
      ws.addRow(['Sin registros']);
      return;
    }
    const columnas = Object.keys(rows[0]);
    ws.addRow(columnas);
    ws.getRow(1).font = { bold: true };
    rows.forEach((row) => {
      ws.addRow(columnas.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object' && !(val instanceof Date)) {
          return JSON.stringify(val);
        }
        return val;
      }));
    });
    ws.columns.forEach((col) => {
      let max = 10;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const len = cell.value != null ? String(cell.value).length : 0;
        if (len > max) max = Math.min(len, 60);
      });
      col.width = max + 2;
    });
  } catch (err) {
    ws.addRow([`Error al exportar: ${err.message}`]);
  }
}

async function generarExcel(rutaDestino) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Gestor Vacaciones Prayaga';
  workbook.created = new Date();

  for (const sheet of EXPORT_SHEETS) {
    const match = sheet.sql.match(/FROM\s+([a-z0-9_]+)/i);
    const tabla = match ? match[1] : null;
    if (tabla && !(await tablaExiste(tabla))) {
      const ws = workbook.addWorksheet(sheet.name.substring(0, 31));
      ws.addRow(['Tabla no disponible en esta base de datos']);
      continue;
    }
    await agregarHojaDesdeQuery(workbook, sheet.name, sheet.sql);
  }

  await workbook.xlsx.writeFile(rutaDestino);
  return fs.statSync(rutaDestino).size;
}

function runMysqldump(rutaDestino) {
  return new Promise((resolve, reject) => {
    const args = [
      '-h',
      process.env.DB_HOST || 'localhost',
      '-P',
      String(process.env.DB_PORT || 3306),
      '-u',
      process.env.DB_USER || 'root',
      `--password=${process.env.DB_PASSWORD || ''}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--set-gtid-purged=OFF',
      process.env.DB_NAME || 'gestor_vacaciones'
    ];

    const proc = spawn('mysqldump', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const out = fs.createWriteStream(rutaDestino);
    let stderr = '';

    proc.stdout.pipe(out);
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('error', (err) => {
      out.destroy();
      reject(err);
    });

    proc.on('close', (code) => {
      out.end(() => {
        if (code !== 0) {
          try {
            fs.unlinkSync(rutaDestino);
          } catch (_) {
            /* ignore */
          }
          reject(new Error(stderr.trim() || `mysqldump salió con código ${code}`));
          return;
        }
        resolve(fs.statSync(rutaDestino).size);
      });
    });
  });
}

async function limpiarAntiguos() {
  const corte = restarDiasFecha(fechaHoraPeru().fecha, RETENTION_DAYS);
  const antiguos = await BackupSnapshot.listarAntiguos(corte);
  for (const snap of antiguos) {
    for (const p of [snap.excel_path, snap.sql_path]) {
      if (p && fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch (err) {
          console.warn('No se pudo borrar archivo de respaldo:', p, err.message);
        }
      }
    }
    await BackupSnapshot.eliminarPorId(snap.id);
  }
  if (antiguos.length) {
    console.log(`🗑️  Respaldos: eliminados ${antiguos.length} registros anteriores a ${corte}`);
  }
}

async function ejecutarRespaldo(turno) {
  if (ejecutando) {
    console.warn('⚠️  Ya hay un respaldo en curso; se omite esta ejecución.');
    return { ok: false, mensaje: 'Respaldo en curso' };
  }

  ejecutando = true;
  const { fecha, etiqueta: fechaEtiqueta } = fechaHoraPeru();
  const dirDia = path.join(BACKUP_ROOT, fecha);
  asegurarDirectorio(dirDia);

  const excelName = `archivo-prayaga-${fecha}-${turno}.xlsx`;
  const sqlName = `volcado-prayaga-${fecha}-${turno}.sql`;
  const excelPath = path.join(dirDia, excelName);
  const sqlPath = path.join(dirDia, sqlName);

  let excelBytes = 0;
  let sqlBytes = null;
  let emailEnviado = false;
  let emailAdjuntoSql = false;
  let estado = 'ok';
  const errores = [];

  try {
    console.log(`📦 Iniciando respaldo (${turno}, ${fecha})…`);
    excelBytes = await generarExcel(excelPath);
    console.log(`   Excel generado: ${(excelBytes / 1024).toFixed(1)} KB`);

    try {
      sqlBytes = await runMysqldump(sqlPath);
      console.log(`   SQL generado: ${(sqlBytes / 1024).toFixed(1)} KB`);
    } catch (err) {
      errores.push(`SQL: ${err.message}`);
      sqlBytes = null;
      if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
      estado = 'parcial';
    }

    const maxBytes = MAX_EMAIL_MB * 1024 * 1024;
    const totalAdjuntos = excelBytes + (sqlBytes || 0);
    const incluirSql = sqlBytes != null && totalAdjuntos <= maxBytes;

    try {
      emailEnviado = await emailService.enviarRespaldoArchivo({
        destinatarios: destinatariosBackup(),
        turno,
        fechaLabel: fechaEtiqueta,
        excelPath,
        sqlPath: incluirSql ? sqlPath : null,
        incluirSql,
        excelBytes,
        sqlBytes: incluirSql ? sqlBytes : null,
        maxEmailMb: MAX_EMAIL_MB
      });
      emailAdjuntoSql = incluirSql && emailEnviado;
    } catch (err) {
      errores.push(`Correo: ${err.message}`);
      estado = estado === 'ok' ? 'parcial' : estado;
    }

    if (!emailEnviado) {
      errores.push('No se pudo enviar el correo (revise SMTP y BACKUP_EMAILS).');
      estado = 'parcial';
    }

    const snapshot = await BackupSnapshot.crear({
      turno,
      fecha,
      excel_path: excelPath,
      sql_path: sqlBytes != null ? sqlPath : null,
      excel_bytes: excelBytes,
      sql_bytes: sqlBytes,
      email_enviado: emailEnviado,
      email_adjunto_sql: emailAdjuntoSql,
      estado: errores.length && excelBytes > 0 ? estado : errores.length ? 'error' : 'ok',
      mensaje_error: errores.length ? errores.join(' | ') : null
    });

    await limpiarAntiguos();

    console.log(`✅ Respaldo ${turno} completado (id ${snapshot.id}, estado ${snapshot.estado})`);
    return { ok: true, snapshot };
  } catch (err) {
    console.error('❌ Error en respaldo:', err);
    try {
      await BackupSnapshot.crear({
        turno,
        fecha,
        excel_path: excelPath,
        sql_path: null,
        excel_bytes: excelBytes,
        sql_bytes: null,
        email_enviado: false,
        email_adjunto_sql: false,
        estado: 'error',
        mensaje_error: err.message
      });
    } catch (_) {
      /* ignore */
    }
    return { ok: false, mensaje: err.message };
  } finally {
    ejecutando = false;
  }
}

function resolverRutaSegura(baseName) {
  const resolved = path.resolve(baseName);
  const rootResolved = path.resolve(BACKUP_ROOT);
  if (!resolved.startsWith(rootResolved)) {
    throw new Error('Ruta de archivo no permitida');
  }
  return resolved;
}

module.exports = {
  BACKUP_ROOT,
  ejecutarRespaldo,
  listarSnapshots: () => BackupSnapshot.listar(),
  obtenerSnapshot: (id) => BackupSnapshot.buscarPorId(id),
  resolverRutaSegura,
  etiquetaTurno,
  destinatariosBackup
};
