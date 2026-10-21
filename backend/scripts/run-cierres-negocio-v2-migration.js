require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '../sql/cierres_negocio_v2.sql'), 'utf8');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
    multipleStatements: true
  });
  await conn.query(sql);
  await conn.end();
  console.log('Migración cierres_negocio_v2 OK');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
