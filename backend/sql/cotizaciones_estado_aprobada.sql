-- Estado tras aprobación Magali/Enrique
ALTER TABLE cotizaciones
  MODIFY COLUMN estado ENUM('borrador', 'en_revision', 'aprobada', 'enviada', 'ganada', 'perdida')
  NOT NULL DEFAULT 'borrador';
