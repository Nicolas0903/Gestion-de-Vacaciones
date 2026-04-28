-- Añade estado 'observado' a solicitudes de reembolso (ejecutar en servidores ya desplegados)
ALTER TABLE solicitudes_reembolso
  MODIFY COLUMN estado ENUM('pendiente', 'aprobado', 'rechazado', 'observado') NOT NULL DEFAULT 'pendiente';
