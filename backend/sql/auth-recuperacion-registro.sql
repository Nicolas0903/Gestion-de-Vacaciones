-- Tabla para tokens de recuperación de contraseña
CREATE TABLE IF NOT EXISTS tokens_recuperacion (
    id INT PRIMARY KEY AUTO_INCREMENT,
    empleado_id INT NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    usado BOOLEAN DEFAULT FALSE,
    expira_en TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
    INDEX idx_token_recuperacion (token)
);

-- Tabla para solicitudes de registro pendientes
CREATE TABLE IF NOT EXISTS solicitudes_registro (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    dni VARCHAR(20),
    telefono VARCHAR(20),
    cargo_solicitado VARCHAR(100),
    motivo TEXT,
    estado ENUM('pendiente', 'aprobada', 'rechazada') DEFAULT 'pendiente',
    revisado_por INT NULL,
    fecha_revision TIMESTAMP NULL,
    comentarios_revision TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (revisado_por) REFERENCES empleados(id),
    INDEX idx_estado_solicitud (estado)
);
