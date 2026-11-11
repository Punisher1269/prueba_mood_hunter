-- =====================================================================
-- Datos de prueba (ejecutar sobre las tablas recién creadas y vacías)
-- =====================================================================

-- Los ids de estado se buscan por código, nunca se escriben a mano
SET @created     = (SELECT id FROM statuses WHERE code = 'created');
SET @in_review   = (SELECT id FROM statuses WHERE code = 'in_review');
SET @in_progress = (SELECT id FROM statuses WHERE code = 'in_progress');
SET @done        = (SELECT id FROM statuses WHERE code = 'done');
SET @paused      = (SELECT id FROM statuses WHERE code = 'paused');

-- Solicitudes: updated_at coincide con su último evento
INSERT INTO requests (id, title, description, status_id, created_at, updated_at) VALUES
  (1, 'Acceso a VPN',                        'Nuevo ingreso del área de soporte',                  @created,     NOW() - INTERVAL 2 DAY,  NOW() - INTERVAL 2 DAY),
  (2, 'Licencia de Office',                  'Equipo de ventas',                                   @in_progress, NOW() - INTERVAL 8 DAY,  NOW() - INTERVAL 5 DAY),
  (3, 'Cambio de equipo portátil',           'El equipo actual no enciende de forma intermitente', @in_review,   NOW() - INTERVAL 4 DAY,  NOW() - INTERVAL 3 DAY),
  (4, 'Acceso a base de datos de clientes',  'Pendiente aprobación del área de seguridad',         @paused,      NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 6 DAY),
  (5, 'Instalación de impresora',            'Piso 3, sala de reuniones',                          @done,        NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 9 DAY),
  (6, 'Correo corporativo para practicante', 'Ingreso el lunes, área de marketing',                @in_progress, NOW() - INTERVAL 6 DAY,  NOW() - INTERVAL 1 DAY);

-- Historial: cada recorrido respeta el flujo de estados
INSERT INTO request_events (request_id, event_type, from_status_id, to_status_id, old_value, new_value, created_at) VALUES
  -- 1) Creada, sin movimientos
  (1, 'created',             NULL,         NULL,         NULL, NULL, NOW() - INTERVAL 2 DAY),

  -- 2) Camino normal hasta En progreso
  (2, 'created',             NULL,         NULL,         NULL, NULL, NOW() - INTERVAL 8 DAY),
  (2, 'status_changed',      @created,     @in_review,   NULL, NULL, NOW() - INTERVAL 7 DAY),
  (2, 'status_changed',      @in_review,   @in_progress, NULL, NULL, NOW() - INTERVAL 5 DAY),

  -- 3) En revisión, con cambio de título
  (3, 'created',             NULL,         NULL,         NULL, NULL, NOW() - INTERVAL 4 DAY),
  (3, 'title_changed',       NULL,         NULL,         'Cambio de equipo', 'Cambio de equipo portátil', NOW() - INTERVAL 3 DAY - INTERVAL 2 HOUR),
  (3, 'status_changed',      @created,     @in_review,   NULL, NULL, NOW() - INTERVAL 3 DAY),

  -- 4) Pausada mientras estaba en progreso
  (4, 'created',             NULL,         NULL,         NULL, NULL, NOW() - INTERVAL 10 DAY),
  (4, 'status_changed',      @created,     @in_review,   NULL, NULL, NOW() - INTERVAL 9 DAY),
  (4, 'status_changed',      @in_review,   @in_progress, NULL, NULL, NOW() - INTERVAL 7 DAY),
  (4, 'status_changed',      @in_progress, @paused,      NULL, NULL, NOW() - INTERVAL 6 DAY),

  -- 5) Recorrido completo hasta Terminada
  (5, 'created',             NULL,         NULL,         NULL, NULL, NOW() - INTERVAL 12 DAY),
  (5, 'status_changed',      @created,     @in_review,   NULL, NULL, NOW() - INTERVAL 11 DAY),
  (5, 'status_changed',      @in_review,   @in_progress, NULL, NULL, NOW() - INTERVAL 10 DAY),
  (5, 'status_changed',      @in_progress, @done,        NULL, NULL, NOW() - INTERVAL 9 DAY),

  -- 6) Se pausó, volvió a revisión y siguió a En progreso
  (6, 'created',             NULL,         NULL,         NULL, NULL, NOW() - INTERVAL 6 DAY),
  (6, 'status_changed',      @created,     @in_review,   NULL, NULL, NOW() - INTERVAL 5 DAY),
  (6, 'status_changed',      @in_review,   @paused,      NULL, NULL, NOW() - INTERVAL 4 DAY),
  (6, 'description_changed', NULL,         NULL,         'Ingreso el lunes', 'Ingreso el lunes, área de marketing', NOW() - INTERVAL 3 DAY),
  (6, 'status_changed',      @paused,      @in_review,   NULL, NULL, NOW() - INTERVAL 2 DAY),
  (6, 'status_changed',      @in_review,   @in_progress, NULL, NULL, NOW() - INTERVAL 1 DAY);