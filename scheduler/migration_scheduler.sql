-- ================================================================
-- DepartmOS Scheduler — Migración de BD
-- Ejecutar UNA SOLA VEZ antes de arrancar el scheduler
-- ================================================================

-- ── Tabla de logs de notificaciones ─────────────────────────────
-- Registra cada intento de envío — permite auditoría y anti-duplicados
CREATE TABLE IF NOT EXISTS logs_notificacion (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  cuota_id     UUID        NOT NULL REFERENCES cuotas_departamento(id) ON DELETE CASCADE,
  canal        VARCHAR(20) NOT NULL,         -- 'email' | 'push' | 'whatsapp'
  destinatario VARCHAR(200) NOT NULL,        -- email, número, endpoint
  estado       VARCHAR(20) NOT NULL,         -- 'enviado' | 'error' | 'omitido'
  detalle      TEXT,                         -- mensaje de error o info adicional
  enviado_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_notif_cuota   ON logs_notificacion(cuota_id);
CREATE INDEX IF NOT EXISTS idx_logs_notif_fecha    ON logs_notificacion(DATE(enviado_at));
CREATE INDEX IF NOT EXISTS idx_logs_notif_canal    ON logs_notificacion(canal);

-- ── Tabla de suscripciones push (para cuando se implemente la PWA) ──
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_user    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT        NOT NULL,
  p256dh     TEXT        NOT NULL,
  auth_key   TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(id_user, endpoint)
);

-- ── Vista útil para monitorear el scheduler ──────────────────────
CREATE OR REPLACE VIEW v_scheduler_resumen_hoy AS
SELECT
  canal,
  estado,
  COUNT(*)                                     AS cantidad,
  MAX(enviado_at)                              AS ultimo_envio
FROM   logs_notificacion
WHERE  DATE(enviado_at) = CURRENT_DATE
GROUP  BY canal, estado
ORDER  BY canal, estado;

-- ── Vista de cuotas pendientes con datos de contacto ─────────────
-- La misma consulta que usa el scheduler internamente, útil para debug
CREATE OR REPLACE VIEW v_cuotas_pendientes_contacto AS
SELECT
  c.id                           AS cuota_id,
  e.nombre                       AS edificio,
  d.nr_departamento              AS departamento,
  c.periodo_mes,
  c.periodo_anio,
  c.monto_total,
  c.fecha_vencimiento,
  c.status_pago,
  p.nombre                       AS propietario,
  p.correo,
  p.telefono,
  CURRENT_DATE - c.fecha_vencimiento::DATE AS dias_vencido
FROM   cuotas_departamento c
JOIN   departamentos d  ON d.id = c.id_departamento
JOIN   edificios     e  ON e.id = d.id_edificio
LEFT JOIN propietarios p ON p.id = d.id_propietario
WHERE  c.status_pago IN ('pendiente', 'parcial', 'vencido')
AND    d.status = 'activo'
ORDER  BY e.nombre, d.nr_departamento;

-- Verificar que todo se creó bien
SELECT 'logs_notificacion' AS tabla, COUNT(*) AS registros FROM logs_notificacion
UNION ALL
SELECT 'push_subscriptions', COUNT(*) FROM push_subscriptions;
