-- =====================================================
-- TABLA PARA BOLETAS DE PAGO
-- =====================================================

CREATE TABLE IF NOT EXISTS boletas_pago (
  id INT PRIMARY KEY AUTO_INCREMENT,
  empleado_id INT NOT NULL,
  mes INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio INT NOT NULL,
  archivo_nombre VARCHAR(255) NOT NULL,
  archivo_path VARCHAR(500) NOT NULL,
  fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subido_por INT NOT NULL,
  firmada BOOLEAN DEFAULT FALSE,
  fecha_firma TIMESTAMP NULL,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
  FOREIGN KEY (subido_por) REFERENCES empleados(id),
  
  -- Un empleado solo puede tener una boleta por mes/año
  UNIQUE KEY unique_boleta_mes (empleado_id, mes, anio)
);

-- Índices para mejor rendimiento
CREATE INDEX idx_boleta_empleado ON boletas_pago(empleado_id);
CREATE INDEX idx_boleta_fecha ON boletas_pago(anio, mes);
CREATE INDEX idx_boleta_firmada ON boletas_pago(firmada);
