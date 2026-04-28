-- Módulo Caja Chica: períodos mensuales, ingresos manuales; egresos desde solicitudes_reembolso aprobadas
CREATE TABLE IF NOT EXISTS caja_chica_periodos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  anio INT NOT NULL,
  mes INT NOT NULL,
  estado ENUM('borrador', 'cerrado') NOT NULL DEFAULT 'borrador',
  saldo_cierre DECIMAL(12, 2) NULL COMMENT 'Total ingresos - total egresos al cerrar; arrastra al mes siguiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_caja_chica_anio_mes (anio, mes)
);

CREATE TABLE IF NOT EXISTS caja_chica_ingresos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  periodo_id INT NOT NULL,
  tipo_motivo ENUM('caja_chica', 'deposito_adicional', 'saldo_anterior') NOT NULL,
  monto DECIMAL(12, 2) NOT NULL,
  orden INT NOT NULL DEFAULT 0,
  FOREIGN KEY (periodo_id) REFERENCES caja_chica_periodos(id) ON DELETE CASCADE,
  INDEX idx_caja_ingreso_periodo (periodo_id)
);
