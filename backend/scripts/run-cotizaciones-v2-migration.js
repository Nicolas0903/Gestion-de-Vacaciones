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

  await tryQuery(conn, `ALTER TABLE cotizaciones ADD COLUMN tipo_proyecto VARCHAR(120) NULL AFTER proyecto`);
  await tryQuery(conn, `ALTER TABLE cotizaciones ADD COLUMN tipo_proyecto_codigo VARCHAR(16) NULL AFTER tipo_proyecto`);
  await tryQuery(conn, `ALTER TABLE cotizaciones ADD COLUMN notas_internas TEXT NULL AFTER tipo_proyecto_codigo`);
  await tryQuery(conn, `ALTER TABLE cotizacion_tipos_proyecto ADD COLUMN codigo_sap VARCHAR(16) NULL AFTER id`);

  const sql = fs.readFileSync(path.join(__dirname, '../sql/cotizaciones_v2.sql'), 'utf8');
  const parts = sql.split(';').filter((p) => p.trim() && !p.trim().startsWith('--'));
  for (const part of parts) {
    const stmt = part.trim();
    if (!stmt || stmt.startsWith('ALTER')) continue;
    await conn.query(stmt);
  }

  await conn.end();
  console.log('Migración cotizaciones v2 OK');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
