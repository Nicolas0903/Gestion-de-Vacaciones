require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones'
  });
  try {
    await conn.query(
      `ALTER TABLE cotizacion_versiones ADD COLUMN cambios_json JSON NULL AFTER comentario_cambio`
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  await conn.end();
  console.log('Migración cambios_json en versiones OK');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
