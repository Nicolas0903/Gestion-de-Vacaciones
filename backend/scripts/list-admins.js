require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../src/config/database');

pool
  .query(
    `SELECT e.email, e.nombres, e.apellidos, r.nombre AS rol
     FROM empleados e
     JOIN roles r ON r.id = e.rol_id
     WHERE r.nombre = 'admin' AND e.activo = 1
     ORDER BY e.email`
  )
  .then(([rows]) => {
    rows.forEach((r) => console.log(`${r.email} (${r.nombres} ${r.apellidos})`));
    return pool.end();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
