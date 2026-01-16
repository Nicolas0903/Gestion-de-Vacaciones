// Script para actualizar la contraseña del admin
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function fixAdmin() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestor_vacaciones',
  });

  try {
    // Generar hash correcto para admin123
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('Nuevo hash generado:', hashedPassword);

    // Actualizar contraseña del admin
    const [result] = await pool.execute(
      'UPDATE empleados SET password = ? WHERE email = ?',
      [hashedPassword, 'admin@prayaga.com']
    );

    if (result.affectedRows > 0) {
      console.log('✅ Contraseña del admin actualizada correctamente');
    } else {
      console.log('⚠️ Usuario admin no encontrado, creándolo...');
      
      // Crear usuario admin si no existe
      await pool.execute(
        `INSERT INTO empleados (codigo_empleado, nombres, apellidos, dni, email, password, cargo, fecha_ingreso, rol_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['ADMIN001', 'Administrador', 'Sistema', '00000000', 'admin@prayaga.com', hashedPassword, 'Administrador', '2020-01-01', 1]
      );
      console.log('✅ Usuario admin creado correctamente');
    }

    // Verificar usuario
    const [users] = await pool.execute('SELECT id, email, nombres FROM empleados WHERE email = ?', ['admin@prayaga.com']);
    console.log('Usuario admin:', users[0]);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

fixAdmin();


