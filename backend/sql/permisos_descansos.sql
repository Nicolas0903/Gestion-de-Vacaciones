-- =====================================================
-- TABLA PARA PERMISOS Y DESCANSOS MÉDICOS
-- =====================================================

CREATE TABLE IF NOT EXISTS permisos_descansos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  empleado_id INT NOT NULL,
  
  -- Tipo: 'descanso_medico', 'permiso_personal', 'permiso_sin_goce', 'otro'
  tipo ENUM('descanso_medico', 'permiso_personal', 'permiso_sin_goce', 'otro') NOT NULL,
  
  -- Fechas
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_totales INT NOT NULL,
  
  -- Detalles
  motivo TEXT NOT NULL,
  observaciones TEXT,
  
  -- Documento adjunto (para descansos médicos)
  archivo_nombre VARCHAR(255),
  archivo_path VARCHAR(500),
  
  -- Estado: 'pendiente', 'aprobado', 'rechazado'
  estado ENUM('pendiente', 'aprobado', 'rechazado') DEFAULT 'pendiente',
  
  -- Aprobación
  aprobado_por INT,
  fecha_aprobacion TIMESTAMP NULL,
  comentarios_aprobacion TEXT,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
  FOREIGN KEY (aprobado_por) REFERENCES empleados(id)
);

-- Índices para mejor rendimiento
CREATE INDEX idx_permiso_empleado ON permisos_descansos(empleado_id);
CREATE INDEX idx_permiso_tipo ON permisos_descansos(tipo);
CREATE INDEX idx_permiso_estado ON permisos_descansos(estado);
CREATE INDEX idx_permiso_fechas ON permisos_descansos(fecha_inicio, fecha_fin);
