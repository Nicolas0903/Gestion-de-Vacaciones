// Script para crear usuario Nicolas Valdivia con sus vacaciones
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function crearNicolas() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    // 1. Generar hash de contraseña
    const hashedPassword = await bcrypt.hash('Nicolasv19', 10);
    console.log('🔐 Hash generado para Nicolasv19');

    // 2. Crear empleado Nicolas Valdivia
    const [empleadoResult] = await pool.execute(
      `INSERT INTO empleados 
       (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id, jefe_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      ['EMP001', 'Nicolas', 'Valdivia Cardenas', '75464668', 'nicolas.valdivia@prayaga.biz', 
       hashedPassword, 'Practicante', '2024-01-06', 5, 1] // rol 5 = practicante, jefe = admin
    );

    let empleadoId;
    if (empleadoResult.insertId) {
      empleadoId = empleadoResult.insertId;
      console.log('✅ Empleado Nicolas creado con ID:', empleadoId);
    } else {
      // Si ya existe, obtener su ID
      const [existing] = await pool.execute('SELECT id FROM empleados WHERE email = ?', ['nicolas.valdivia@prayaga.biz']);
      empleadoId = existing[0].id;
      console.log('✅ Empleado Nicolas ya existía, ID:', empleadoId);
    }

    // 3. Crear período de vacaciones 2024-2025
    // 15 días correspondientes, 4 gozados, 11 pendientes
    const [periodoResult] = await pool.execute(
      `INSERT INTO periodos_vacaciones 
       (empleado_id, fecha_inicio_periodo, fecha_fin_periodo, dias_correspondientes, dias_gozados, tiempo_trabajado, estado, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE dias_gozados = VALUES(dias_gozados), estado = VALUES(estado)`,
      [empleadoId, '2024-01-06', '2025-01-05', 15, 4, '12 meses', 'parcial', 'Período 2024-2025']
    );

    console.log('✅ Período de vacaciones creado/actualizado');

    // 4. Crear un registro histórico de las vacaciones tomadas (4 días)
    // Primero obtener el ID del período
    const [periodos] = await pool.execute(
      'SELECT id FROM periodos_vacaciones WHERE empleado_id = ? ORDER BY id DESC LIMIT 1',
      [empleadoId]
    );
    const periodoId = periodos[0].id;

    // Crear solicitud aprobada de los 4 días ya tomados
    const [solicitudResult] = await pool.execute(
      `INSERT INTO solicitudes_vacaciones 
       (empleado_id, periodo_id, fecha_inicio_vacaciones, fecha_fin_vacaciones, dias_solicitados, 
        fecha_efectiva_salida, fecha_efectiva_regreso, observaciones, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [empleadoId, periodoId, '2024-11-11', '2024-08-14', 4, 
       '2024-11-11', '2024-08-18', 'Vacaciones tomadas periodo 2024-2025', 'aprobada']
    );

    console.log('✅ Solicitud histórica de 4 días creada');

    // 5. Crear Jefe de Operaciones para flujo de aprobación
    const jefePassword = await bcrypt.hash('Jefe2024', 10);
    await pool.execute(
      `INSERT INTO empleados 
       (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      ['JEF001', 'Enrique', 'Agapito Sevillano', '45678901', 'enrique.agapito@prayaga.biz', 
       jefePassword, 'Jefe de Operaciones', '2017-08-01', 3] // rol 3 = jefe_operaciones
    );
    console.log('✅ Jefe de Operaciones creado (enrique.agapito@prayaga.biz / Jefe2024)');

    // 6. Crear Contadora para flujo de aprobación
    const contadoraPassword = await bcrypt.hash('Conta2024', 10);
    await pool.execute(
      `INSERT INTO empleados 
       (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      ['CONT001', 'Rocio', 'Picon Ruiz', '87654321', 'rocio.picon@prayaga.biz', 
       contadoraPassword, 'Contadora', '2019-01-01', 2] // rol 2 = contadora
    );
    console.log('✅ Contadora creada (rocio.picon@prayaga.biz / Conta2024)');

    // 7. Actualizar jefe de Nicolas
    const [jefes] = await pool.execute('SELECT id FROM empleados WHERE email = ?', ['enrique.agapito@prayaga.biz']);
    if (jefes.length > 0) {
      await pool.execute('UPDATE empleados SET jefe_id = ? WHERE id = ?', [jefes[0].id, empleadoId]);
      console.log('✅ Jefe asignado a Nicolas');
    }

    // Mostrar resumen
    console.log('\n========================================');
    console.log('📋 RESUMEN DE USUARIOS CREADOS:');
    console.log('========================================');
    console.log('');
    console.log('👤 EMPLEADO:');
    console.log('   Email: nicolas.valdivia@prayaga.biz');
    console.log('   Contraseña: Nicolasv19');
    console.log('   Días totales: 15');
    console.log('   Días gozados: 4');
    console.log('   Días disponibles: 11');
    console.log('');
    console.log('👔 JEFE DE OPERACIONES:');
    console.log('   Email: enrique.agapito@prayaga.biz');
    console.log('   Contraseña: Jefe2024');
    console.log('');
    console.log('💼 CONTADORA:');
    console.log('   Email: rocio.picon@prayaga.biz');
    console.log('   Contraseña: Conta2024');
    console.log('');
    console.log('🔑 ADMINISTRADOR:');
    console.log('   Email: admin@prayaga.com');
    console.log('   Contraseña: admin123');
    console.log('========================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

crearNicolas();


