require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function tryQuery(conn, sql) {
  try {
    await conn.query(sql);
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') return;
    throw e;
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
    multipleStatements: true
  });

  await tryQuery(conn, `ALTER TABLE cotizaciones ADD COLUMN solicitud_id INT NULL AFTER responsable_id`);

  const sql = fs.readFileSync(path.join(__dirname, '../sql/cotizacion_solicitudes.sql'), 'utf8');
  const parts = sql.split(';').filter((p) => p.trim() && !p.trim().startsWith('--'));
  for (const part of parts) {
    const stmt = part.trim();
    if (!stmt || stmt.startsWith('ALTER')) continue;
    await conn.query(stmt);
  }

  await conn.end();
  console.log('Migración solicitudes cotización OK');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
