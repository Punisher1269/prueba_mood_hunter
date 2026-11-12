-- =====================================================================
-- Tablero de solicitudes con flujo de estados
-- Esquema y datos de prueba (MySQL 8.0+)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS mood_board
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE mood_board;

-- Se borran en orden inverso a sus dependencias
DROP TABLE IF EXISTS request_events;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS statuses;

-- ---------------------------------------------------------------------
-- Catálogo de estados
--   id   : uso interno (llaves foráneas). Nunca sale por la API.
--   code : identificador público y estable que usa la API.
-- ---------------------------------------------------------------------
CREATE TABLE statuses (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code        VARCHAR(30)      NOT NULL,
  label       VARCHAR(50)      NOT NULL,
  sort_order  TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_statuses_code UNIQUE (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Solicitudes
--   updated_at NO usa ON UPDATE CURRENT_TIMESTAMP a propósito: guardar el
--   resumen de IA no debe contar como cambio de la solicitud. El back lo
--   actualiza explícitamente al editar o transicionar.
-- ---------------------------------------------------------------------
CREATE TABLE requests (
  id                       INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  title                    VARCHAR(150)     NOT NULL,
  description              VARCHAR(2000)    NOT NULL DEFAULT '',
  status_id                TINYINT UNSIGNED NOT NULL,
  ai_summary               TEXT             NULL,
  ai_summary_generated_at  DATETIME         NULL,
  created_at               DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_requests_status
    FOREIGN KEY (status_id) REFERENCES statuses (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT chk_requests_title_not_blank
    CHECK (CHAR_LENGTH(TRIM(title)) > 0),
  INDEX idx_requests_status (status_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Historial de eventos (auditoría). Solo lo escribe el back, en la misma
-- transacción que modifica la solicitud.
--   status_changed       -> from_status_id / to_status_id
--   title_changed        -> old_value / new_value
--   description_changed  -> old_value / new_value
--   created              -> todo en NULL
-- ---------------------------------------------------------------------
CREATE TABLE request_events (
  id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  request_id      INT UNSIGNED     NOT NULL,
  event_type      ENUM('created', 'status_changed', 'title_changed', 'description_changed') NOT NULL,
  from_status_id  TINYINT UNSIGNED NULL,
  to_status_id    TINYINT UNSIGNED NULL,
  old_value       TEXT             NULL,
  new_value       TEXT             NULL,
  created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_events_request
    FOREIGN KEY (request_id) REFERENCES requests (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_events_from_status
    FOREIGN KEY (from_status_id) REFERENCES statuses (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_events_to_status
    FOREIGN KEY (to_status_id) REFERENCES statuses (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  INDEX idx_events_request_date (request_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Catálogo. sort_order define el orden de las columnas del tablero
INSERT INTO statuses (code, label, sort_order) VALUES
  ('created',     'Creada',      1),
  ('in_review',   'En revisión', 2),
  ('in_progress', 'En progreso', 3),
  ('done',        'Terminada',   4),
  ('paused',      'Pausada',     5);