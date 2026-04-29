-- Acceso granular a módulos del portal (Administración de usuarios)
USE gestor_vacaciones;

ALTER TABLE empleados
  ADD COLUMN modulos_portal JSON NULL
    COMMENT 'Mapa id_modulo -> boolean; null = sin restricción granular'
  AFTER avatar_url;
