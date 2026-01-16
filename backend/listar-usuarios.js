// Script para listar todos los usuarios
require('dotenv').config();
const mysql = require('mysql2/promise');

async function listarUsuarios() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    console.log('\n📋 LISTADO DE USUARIOS EN EL SISTEMA\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    const [empleados] = await pool.execute(`
      SELECT 
        e.id,
        e.codigo_empleado,
        e.nombres,
        e.apellidos,
        e.email,
        e.cargo,
        e.fecha_ingreso,
        r.nombre as rol,
        jefe.nombres as jefe_nombres,
        jefe.apellidos as jefe_apellidos,
        jefe.cargo as jefe_cargo
      FROM empleados e
      LEFT JOIN roles r ON e.rol_id = r.id
      LEFT JOIN empleados jefe ON e.jefe_id = jefe.id
      WHERE e.activo = 1
      ORDER BY e.id
    `);

    empleados.forEach((emp, index) => {
      console.log(`${index + 1}. ${emp.nombres} ${emp.apellidos}`);
      console.log(`   📧 Email: ${emp.email}`);
      console.log(`   👔 Cargo: ${emp.cargo}`);
      console.log(`   🏷️  Rol: ${emp.rol}`);
      console.log(`   📅 Fecha ingreso: ${emp.fecha_ingreso}`);
      
      if (emp.jefe_nombres) {
        console.log(`   👤 Jefe directo: ${emp.jefe_nombres} ${emp.jefe_apellidos} (${emp.jefe_cargo})`);
      } else {
        console.log(`   👤 Jefe directo: Sin jefe asignado`);
      }
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`\n📊 TOTAL DE USUARIOS ACTIVOS: ${empleados.length}\n`);

    // Obtener resumen de vacaciones para cada empleado
    console.log('📈 RESUMEN DE VACACIONES:\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    for (const emp of empleados) {
      const [periodos] = await pool.execute(`
        SELECT 
          SUM(dias_correspondientes) as total_ganados,
          SUM(dias_gozados) as total_gozados,
          SUM(dias_correspondientes - dias_gozados) as total_pendientes
        FROM periodos_vacaciones
        WHERE empleado_id = ?
      `, [emp.id]);

      const vacaciones = periodos[0];
      const ganados = vacaciones.total_ganados || 0;
      const gozados = vacaciones.total_gozados || 0;
      const pendientes = vacaciones.total_pendientes || 0;

      console.log(`${emp.nombres} ${emp.apellidos}:`);
      console.log(`   Ganados: ${ganados} días | Gozados: ${gozados} días | Pendientes: ${pendientes} días`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listarUsuarios();
