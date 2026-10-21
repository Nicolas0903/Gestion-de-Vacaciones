require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mysql = require('mysql2/promise');

const alters = [
  `ALTER TABLE cierres_negocio ADD COLUMN direccion TEXT NULL`,
  `ALTER TABLE cierres_negocio ADD COLUMN atencion VARCHAR(255) NULL`,
  `ALTER TABLE cierres_negocio ADD COLUMN cargo_atencion VARCHAR(255) NULL`,
  `ALTER TABLE cierres_negocio ADD COLUMN email_cliente VARCHAR(255) NULL`,
  `ALTER TABLE cierres_negocio ADD COLUMN telefono_cliente VARCHAR(80) NULL`,
  `ALTER TABLE cierres_negocio ADD COLUMN solicitante VARCHAR(255) NULL`,
  `ALTER TABLE cierres_negocio ADD COLUMN email_solicitante VARCHAR(255) NULL`,
  `ALTER TABLE cierres_negocio ADD COLUMN tipo_cambio DECIMAL(10, 4) NULL`,
  `ALTER TABLE cierres_negocio ADD COLUMN hojas_costo_var JSON NULL`,
  `ALTER TABLE cierre_facturacion ADD COLUMN item_num INT NULL`,
  `ALTER TABLE cierre_facturacion ADD COLUMN observaciones TEXT NULL`,
  `ALTER TABLE cierre_facturacion ADD COLUMN estado_linea VARCHAR(50) NULL`,
  `ALTER TABLE cierre_costos MODIFY COLUMN fase VARCHAR(30) NOT NULL DEFAULT 'reporte'`,
  `ALTER TABLE cierre_costos ADD COLUMN hoja_nombre VARCHAR(120) NULL`,
  `ALTER TABLE cierre_costos ADD COLUMN referencia_rhe VARCHAR(80) NULL`,
  `ALTER TABLE cierre_costos ADD COLUMN monto_adicional DECIMAL(14, 2) NULL`,
  `ALTER TABLE cierre_costos ADD COLUMN dias DECIMAL(10, 2) NULL`
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones'
  });

  for (const sql of alters) {
    try {
      await conn.query(sql);
      console.log('OK:', sql.slice(0, 70));
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('SKIP (exists):', sql.slice(0, 70));
      } else {
        throw e;
      }
    }
  }

  await conn.end();
  console.log('Migración cierres_negocio_v3 OK');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
