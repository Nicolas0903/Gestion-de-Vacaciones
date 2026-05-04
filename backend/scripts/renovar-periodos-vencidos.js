/**
 * Una pasada sobre todos los empleados activos: crea períodos de vacaciones
 * nuevos cuando fecha_fin_periodo < CURDATE() (misma regla que el backend).
 *
 * Desde la carpeta backend:
 *   node scripts/renovar-periodos-vencidos.js
 */
require('dotenv').config();

const { pool } = require('../src/config/database');
const PeriodoVacaciones = require('../src/models/PeriodoVacaciones');

async function main() {
  const [emps] = await pool.execute(
    'SELECT id, nombres, apellidos FROM empleados WHERE activo = 1 ORDER BY id'
  );
  console.log(`Renovación de períodos: ${emps.length} empleados activos\n`);
  for (const e of emps) {
    await PeriodoVacaciones.renovarSiVencido(e.id);
  }
  await pool.end();
  console.log('Hecho.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
