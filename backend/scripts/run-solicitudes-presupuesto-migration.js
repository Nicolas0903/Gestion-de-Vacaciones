#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
    multipleStatements: true
  });

  const sqlPath = path.join(__dirname, '../sql/solicitudes_presupuesto.sql');
  let sql = fs.readFileSync(sqlPath, 'utf8');

  const alterBlock = sql.match(/ALTER TABLE rendiciones_presupuesto[\s\S]*?idx_rp_solicitud_presupuesto[^;]*;/);
  sql = sql.replace(/ALTER TABLE rendiciones_presupuesto[\s\S]*?idx_rp_solicitud_presupuesto[^;]*;/, '');

  await conn.query(sql);

  if (alterBlock && (await tableExists(conn, 'rendiciones_presupuesto'))) {
    if (!(await columnExists(conn, 'rendiciones_presupuesto', 'solicitud_presupuesto_id'))) {
      await conn.query(alterBlock[0]);
    }
  } else if (alterBlock) {
    console.warn('Tabla rendiciones_presupuesto no existe; omitiendo ALTER (ejecute setup rendiciones primero).');
  }

  console.log('Migración solicitudes_presupuesto OK');
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
