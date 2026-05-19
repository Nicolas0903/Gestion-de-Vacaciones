-- Períodos mensuales para seguimiento de depósitos de rendiciones de presupuesto aprobadas.
-- No hay tabla de ingresos: solo organiza el mes y el estado borrador/cerrado.
CREATE TABLE IF NOT EXISTS rendicion_caja_periodos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  anio INT NOT NULL,
  mes INT NOT NULL,
  estado ENUM('borrador', 'cerrado') NOT NULL DEFAULT 'borrador',
  total_cierre DECIMAL(12, 2) NULL COMMENT 'Suma de montos de rendiciones del mes al cerrar',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rendicion_caja_anio_mes (anio, mes)
);
