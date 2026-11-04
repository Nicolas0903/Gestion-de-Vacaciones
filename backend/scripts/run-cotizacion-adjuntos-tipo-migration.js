require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function tryQuery(conn, sql) {
  try {
    await conn.query(sql);
    return true;
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') return false;
    throw e;
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones'
  });
  await tryQuery(
    conn,
    `ALTER TABLE cotizacion_adjuntos ADD COLUMN tipo VARCHAR(32) NOT NULL DEFAULT 'general' COMMENT 'general|evidencia_criterio'`
  );
  await conn.end();
  console.log('Migración cotizacion_adjuntos.tipo OK');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
