-- Solicitud de presupuesto previa a rendiciones de gasto (Rendición de Presupuesto)
CREATE TABLE IF NOT EXISTS solicitudes_presupuesto (
  id INT PRIMARY KEY AUTO_INCREMENT,
  codigo VARCHAR(32) NOT NULL UNIQUE,
  empleado_id INT NOT NULL,
  area ENUM(
    'gerencia_general',
    'consultoria',
    'administracion',
    'operaciones',
    'marketing',
    'comercial'
  ) NOT NULL,
  concepto VARCHAR(500) NOT NULL COMMENT 'Título / motivo del presupuesto',
  justificacion TEXT NULL,
  monto_solicitado DECIMAL(12, 2) NOT NULL,
  monto_aprobado DECIMAL(12, 2) NULL COMMENT 'Monto autorizado por gerencia (puede diferir del solicitado)',
  moneda ENUM('PEN', 'USD') NOT NULL DEFAULT 'PEN',
  estado ENUM('borrador', 'pendiente', 'aprobada', 'rechazada', 'cancelada') NOT NULL DEFAULT 'borrador',
  aprobado_por INT NULL,
  comentarios_resolucion TEXT NULL,
  fecha_resolucion TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
  FOREIGN KEY (aprobado_por) REFERENCES empleados(id),
  INDEX idx_sp_empleado (empleado_id),
  INDEX idx_sp_estado (estado),
  INDEX idx_sp_area (area)
);

-- Vínculo opcional en rendiciones (NULL = registros históricos)
ALTER TABLE rendiciones_presupuesto
  ADD COLUMN solicitud_presupuesto_id INT NULL AFTER empleado_id,
  ADD CONSTRAINT fk_rp_solicitud_presupuesto
    FOREIGN KEY (solicitud_presupuesto_id) REFERENCES solicitudes_presupuesto(id)
    ON DELETE SET NULL;

CREATE INDEX idx_rp_solicitud_presupuesto ON rendiciones_presupuesto (solicitud_presupuesto_id);
