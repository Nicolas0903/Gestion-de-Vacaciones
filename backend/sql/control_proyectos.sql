-- Módulo Control de Proyectos (MySQL 8+)
-- Ejecutar sobre la misma BD que el resto del gestor.
-- Varios consultores por proyecto: tabla puente cp_proyecto_consultores.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS cp_proyectos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  empresa VARCHAR(255) NOT NULL,
  proyecto VARCHAR(500) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  horas_asignadas DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado ENUM('finalizado','en_curso','pendiente','perdido') NOT NULL DEFAULT 'pendiente',
  detalles TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cp_proyecto_consultores (
  proyecto_id INT NOT NULL,
  empleado_id INT NOT NULL,
  PRIMARY KEY (proyecto_id, empleado_id),
  CONSTRAINT fk_cp_pc_proyecto FOREIGN KEY (proyecto_id) REFERENCES cp_proyectos(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_pc_empleado FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cp_actividades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proyecto_id INT NOT NULL,
  requerido_por ENUM(
    'ricardo_martinez',
    'rodrigo_loayza',
    'juan_pena',
    'magali_sevillano',
    'enrique_agapito'
  ) NOT NULL,
  consultor_asignado_id INT NOT NULL,
  descripcion_actividad TEXT NOT NULL,
  prioridad ENUM('baja','media','alta') NOT NULL DEFAULT 'media',
  fecha_hora_inicio DATETIME NOT NULL,
  fecha_hora_fin DATETIME NOT NULL,
  horas_trabajadas DECIMAL(10,2) NOT NULL,
  estado ENUM('no_iniciado','en_progreso','cerrado') NOT NULL DEFAULT 'no_iniciado',
  comentarios TEXT NULL,
  situacion_pago ENUM('pagado','pendiente') NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cp_act_proyecto FOREIGN KEY (proyecto_id) REFERENCES cp_proyectos(id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_act_consultor FOREIGN KEY (consultor_asignado_id) REFERENCES empleados(id),
  CONSTRAINT chk_cp_act_fechas CHECK (fecha_hora_fin >= fecha_hora_inicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cp_costo_hora (
  empleado_id INT NOT NULL PRIMARY KEY,
  costo_por_hora DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cp_costo_empleado FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
