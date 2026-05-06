/**
 * Genera backend/sql/seed_data_proyectos_excel.sql desde el Excel del usuario.
 * Uso: node backend/scripts/generate-seed-proyectos-excel.js [ruta/al/archivo.xlsx]
 */
const fs = require('fs');
const path = require('path');

const xlsxPathArg = process.argv[2];
const XLSX = require(path.join(__dirname, '../../frontend/node_modules/xlsx'));

function serialToYMD(s) {
  if (s === '' || s == null || typeof s !== 'number') return null;
  const d = new Date(Math.round((s - 25569) * 86400 * 1000));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYMD(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str).trim());
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3] };
}

function addYears(ymd, years) {
  const p = parseYMD(ymd);
  if (!p) return ymd;
  const dt = new Date(Date.UTC(p.y, p.mo - 1, p.d));
  dt.setUTCFullYear(dt.getUTCFullYear() + years);
  const y = dt.getUTCFullYear();
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
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

const EST = {
  finalizado: 'finalizado',
  'en curso': 'en_curso',
  pendiente: 'pendiente',
  perdido: 'perdido'
};

const defaultExcel = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'Data Proyectos.xlsx');
const xlsxPath = xlsxPathArg || defaultExcel;

if (!fs.existsSync(xlsxPath)) {
  console.error('No existe el archivo:', xlsxPath);
  process.exit(1);
}

const wb = XLSX.readFile(xlsxPath);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

const header = [
  '-- Importación desde Data Proyectos.xlsx',
  '-- Sin consultores: asignar en la app (cp_proyecto_consultores) o por SQL.',
  '-- Fecha fin vacía: estado Finalizado → misma fecha que inicio; En curso (u otro) → inicio + 1 año.',
  'USE gestor_vacaciones;',
  'SET NAMES utf8mb4;',
  ''
];

const values = [];
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const empresa = String(r.Empresa || '').trim();
  const proyecto = String(r['Proyecto / Nombre de solicitud'] || '').trim();
  let fi = serialToYMD(r['Fecha inicio']);
  if (!fi) {
    console.error(`Fila ${i + 1}: falta fecha inicio`);
    process.exit(1);
  }
  let ff = serialToYMD(r['Fecha fin']);
  const estRaw = String(r.Estado || '')
    .trim()
    .toLowerCase();
  const estado = EST[estRaw] || 'pendiente';
  if (!ff) {
    if (estado === 'finalizado') ff = fi;
    else ff = addYears(fi, 1);
  }
  let horas = r['Horas asignadas (bolsa de horas)'];
  if (horas === '' || horas == null) horas = 0;
  else horas = Number(String(horas).replace(',', '.'));
  if (!Number.isFinite(horas)) horas = 0;
  horas = Math.round(horas * 100) / 100;
  const detRaw = r.Comentarios;
  const det = detRaw != null && String(detRaw).trim() !== '' ? String(detRaw) : null;

  const parts = [
    sqlStr(empresa),
    sqlStr(proyecto),
    sqlStr(fi),
    sqlStr(ff),
    horas.toFixed(2),
    sqlStr(estado),
    det == null ? 'NULL' : sqlStr(det)
  ];
  values.push(`(${parts.join(', ')})`);
}

const sql =
  header.join('\n') +
  'INSERT INTO cp_proyectos (empresa, proyecto, fecha_inicio, fecha_fin, horas_asignadas, estado, detalles) VALUES\n' +
  values.join(',\n') +
  ';\n';

const dest = path.join(__dirname, '../sql/seed_data_proyectos_excel.sql');
fs.writeFileSync(dest, sql, 'utf8');
console.log('Generado:', dest, `(${rows.length} proyectos)`);
