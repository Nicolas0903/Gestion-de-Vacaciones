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

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
    multipleStatements: true
  });

  if (await columnExists(conn, 'empleados', 'dias_vacaciones_contrato')) {
    console.log('Columna dias_vacaciones_contrato ya existe; omitiendo.');
    await conn.end();
    return;
  }

  const sqlPath = path.join(__dirname, '../sql/empleados_dias_vacaciones_contrato.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await conn.query(sql);
  console.log('Migración dias_vacaciones_contrato OK');
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
