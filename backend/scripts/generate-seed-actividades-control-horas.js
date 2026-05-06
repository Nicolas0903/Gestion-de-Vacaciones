/**
 * Lee "Control de Horas.xlsx" (lista SharePoint exportada) y genera
 * backend/sql/seed_actividades_control_horas.sql para cp_actividades.
 *
 * Uso: node backend/scripts/generate-seed-actividades-control-horas.js [ruta.xlsx]
 */
const fs = require('fs');
const path = require('path');

const XLSX = require(path.join(__dirname, '../../frontend/node_modules/xlsx'));

function excelSerialToMysqlDateTime(serial) {
  if (serial === '' || serial == null) return null;
  if (typeof serial !== 'number') return null;
  const ms = (serial - 25569) * 86400000;
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

function sqlEscape(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sqlStr(s) {
  if (s == null || s === '') return 'NULL';
  return `'${sqlEscape(s)}'`;
}

function proyectoLikeClause(excelProyecto) {
  const p = String(excelProyecto || '').trim();
  if (!p) return null;
  if (p.includes('Migración') && p.includes('MSTR')) {
    return sqlEscape('%Migración de tableros de control de MSTR a Power BI%');
  }
  if (p.includes('Modificaciones en los reportes')) {
    return sqlEscape('%Modificaciones en los reportes de Power BI%');
  }
  if (p.includes('FOPESA')) {
    return sqlEscape('%Tablero FOPESA en Power BI%');
  }
  if (p.includes('SENATI')) {
    return sqlEscape('%Tablero Power BI-SENATI%');
  }
  if (p.includes('Tareas de Preventa')) {
    return sqlEscape('%Tareas de Preventa%');
  }
  if (p.includes('CELEPSA') && p.includes('Bolsa Horas') && p.includes('Base Maestra')) {
    return sqlEscape('%CELEPSA - Bolsa Horas Soporte Base Maestra RRHH 2025-26%');
  }
  return sqlEscape(`%${p.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`);
}

/** Expresión (SELECT id ... LIMIT 1) para usar dentro de INSERT ... VALUES (...) */
function consultorIdSubquery(displayName) {
  const raw = String(displayName || '').trim();
  const m = {
    'Nicolas Valdivia':
      "(SELECT id FROM empleados WHERE apellidos LIKE '%Valdivia%' AND (nombres LIKE '%Nicolas%' OR nombres LIKE '%Nicolás%') LIMIT 1)",
    'María Fernanda':
      "(SELECT id FROM empleados WHERE (nombres LIKE '%María%' AND apellidos LIKE '%Fernanda%') OR (nombres LIKE '%Maria%' AND apellidos LIKE '%Fernanda%') OR CONCAT(TRIM(nombres),' ',TRIM(apellidos)) LIKE '%María Fernanda%' LIMIT 1)",
    'Francisco Perez':
      "(SELECT id FROM empleados WHERE nombres LIKE '%Francisco%' AND (apellidos LIKE '%Perez%' OR apellidos LIKE '%Pérez%') LIMIT 1)",
    'Luis Miguel Francia':
      "(SELECT id FROM empleados WHERE apellidos LIKE '%Francia%' AND nombres LIKE '%Luis%' AND nombres LIKE '%Miguel%' LIMIT 1)",
    'Oscar Luis Llanca Huamán':
      "(SELECT id FROM empleados WHERE apellidos LIKE '%Llanca%' AND (nombres LIKE '%Oscar%' OR nombres LIKE '%Óscar%') LIMIT 1)",
    'Jeff Peña':
      "(SELECT id FROM empleados WHERE (nombres LIKE '%Jeff%' OR nombres LIKE '%Jefferson%') AND (apellidos LIKE '%Peña%' OR apellidos LIKE '%Pena%') LIMIT 1)"
  };
  if (m[raw]) return m[raw];
  const esc = sqlEscape(raw);
  return `(SELECT id FROM empleados WHERE CONCAT(TRIM(nombres),' ',TRIM(apellidos)) LIKE '%${esc.replace(/''/g, "'")}%' LIMIT 1)`;
}

const REQUERIDO = {
  'ricardo martinez': 'ricardo_martinez',
  'rodrigo loayza': 'rodrigo_loayza',
  'juan peña': 'juan_pena',
  'juan pena': 'juan_pena',
  'magali sevillano': 'magali_sevillano',
  'enrique agapito': 'enrique_agapito'
};

function mapRequerido(s) {
  const k = String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const simple = k.replace(/ñ/g, 'n');
  return REQUERIDO[k] || REQUERIDO[simple] || null;
}

function mapPrioridad(s) {
  const x = String(s || '')
    .trim()
    .toLowerCase();
  if (x === 'alta') return 'alta';
  if (x === 'medio' || x === 'media') return 'media';
  if (x === 'baja') return 'baja';
  return 'media';
}

function mapEstado(s) {
  const x = String(s || '')
    .trim()
    .toLowerCase();
  if (x === 'cerrado') return 'cerrado';
  if (x === 'en progreso' || x === 'en_progreso') return 'en_progreso';
  if (x === 'no iniciado') return 'no_iniciado';
  return 'cerrado';
}

function mapPago(s) {
  const x = String(s || '')
    .trim()
    .toLowerCase();
  if (x === 'pagado') return 'pagado';
  if (x === 'pendiente') return 'pendiente';
  return 'pendiente';
}

const defaultXlsx = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'Control de Horas.xlsx');
const xlsxPath = process.argv[2] || defaultXlsx;

if (!fs.existsSync(xlsxPath)) {
  console.error('No existe:', xlsxPath);
  process.exit(1);
}

const wb = XLSX.readFile(xlsxPath);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

const valueRows = [];

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const proyectoPat = proyectoLikeClause(r.Proyecto);
  if (!proyectoPat) {
    console.error(`Fila ${i + 1}: proyecto vacío`);
    process.exit(1);
  }

  const req = mapRequerido(r['Requerido por']);
  if (!req) {
    console.error(`Fila ${i + 1}: «Requerido por» no mapeado:`, r['Requerido por']);
    process.exit(1);
  }

  const consultor = consultorIdSubquery(r['Consultor asignado']);

  const desc = String(r['Descripción de actividad'] || '').trim();
  if (!desc) {
    console.error(`Fila ${i + 1}: falta descripción`);
    process.exit(1);
  }

  const fi = excelSerialToMysqlDateTime(r['Fecha de actividad']);
  const ff = excelSerialToMysqlDateTime(r['Fecha y Hora de Fin']);
  if (!fi || !ff) {
    console.error(`Fila ${i + 1}: fechas inválidas`);
    process.exit(1);
  }

  let horas = Number(r['Horas trabajadas']);
  if (!Number.isFinite(horas)) horas = 0;
  horas = Math.round(horas * 100) / 100;

  const prioridad = mapPrioridad(r.Prioridad);
  const estado = mapEstado(r.Estado);
  const pago = mapPago(r['Situación de Pago']);
  const com = r.Comentarios != null && String(r.Comentarios).trim() !== '' ? String(r.Comentarios) : null;

  const proyectoSub = `(SELECT id FROM cp_proyectos WHERE proyecto LIKE '${proyectoPat}' ORDER BY id DESC LIMIT 1)`;

  valueRows.push(
    `(${proyectoSub}, '${req}', ${consultor}, ${sqlStr(desc)}, '${prioridad}', '${fi}', '${ff}', ${horas.toFixed(
      2
    )}, '${estado}', ${com == null ? 'NULL' : sqlStr(com)}, '${pago}')`
  );
}

const header = [
  '-- Importación desde Control de Horas.xlsx → cp_actividades',
  '-- Requisitos: proyectos ya existentes en cp_proyectos (p. ej. seed Data Proyectos) y empleados consultores cargados.',
  '-- Si falta proyecto o empleado, la fila fallará por FK/subconsulta NULL.',
  'USE gestor_vacaciones;',
  'SET NAMES utf8mb4;',
  ''
];

const sql =
  header.join('\n') +
  'INSERT INTO cp_actividades (proyecto_id, requerido_por, consultor_asignado_id, descripcion_actividad, prioridad, fecha_hora_inicio, fecha_hora_fin, horas_trabajadas, estado, comentarios, situacion_pago) VALUES\n' +
  valueRows.join(',\n') +
  ';\n';

const dest = path.join(__dirname, '../sql/seed_actividades_control_horas.sql');
fs.writeFileSync(dest, sql, 'utf8');
console.log('Generado:', dest, `(${rows.length} actividades)`);
