require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
    multipleStatements: true
  });
  try {
    await conn.query(
      `ALTER TABLE cotizacion_solicitudes ADD COLUMN responsable_id INT NULL AFTER solicitante_id`
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME') throw e;
  }
  try {
    await conn.query(
      `ALTER TABLE cotizacion_solicitudes
       ADD CONSTRAINT fk_sol_cot_responsable FOREIGN KEY (responsable_id) REFERENCES empleados(id) ON DELETE SET NULL`
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_KEYNAME' && e.code !== 'ER_CANT_CREATE_TABLE') throw e;
  }
  await conn.end();
  console.log('Migración responsable_id en cotizacion_solicitudes OK');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
