-- ============================================================
-- MIGRACIÓN: Sistema de notificaciones v2
-- Ejecutar en orden en ambos ambientes (local y servidor)
-- ============================================================

-- 1. Eliminar tabla anterior (ya no se usa)
DROP TABLE IF EXISTS notificacion_config CASCADE;

-- 2. Crear tabla catálogo de tipos (solo supervisor crea/edita)
CREATE TABLE notificacion_tipo (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo        VARCHAR(50) NOT NULL UNIQUE,
  nombre        VARCHAR(100) NOT NULL,
  descripcion   TEXT,
  -- Destinatarios separados por coma: 'propietarios', 'gestion', 'admin'
  -- Ejemplos: 'propietarios' | 'gestion,admin' | 'propietarios,gestion,admin'
  destinatarios VARCHAR(100) NOT NULL DEFAULT 'propietarios',
  activo        BOOLEAN DEFAULT true,
  orden         INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. Seeds — los 4 tipos base
INSERT INTO notificacion_tipo (codigo, nombre, descripcion, destinatarios, orden) VALUES
(
  'vencimiento_pago',
  'Vencimiento de pago',
  'Notifica a propietarios con cuotas pendientes. Se envía N días después del envío del mensaje de cobro y se repite diariamente hasta que paguen.',
  'propietarios',
  1
),
(
  'gastos_generales',
  'Gastos generales',
  'Notifica a propietarios afectados cuando se registran gastos generales. Se envía N días después de la creación del gasto.',
  'propietarios',
  2
),
(
  'recoleccion_medicion',
  'Recolección de mediciones',
  'Recordatorio mensual para registrar las lecturas de medidores. Se envía el día del mes configurado.',
  'gestion,admin',
  3
),
(
  'vencimiento_servicio',
  'Vencimiento de servicio',
  'Notifica cuando vence la fecha de pago de un recibo de servicio (luz, agua, etc.).',
  'gestion,admin',
  4
);

-- 4. Crear nueva tabla de configuración por edificio
CREATE TABLE notificacion_config (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  id_edificio     UUID NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
  id_tipo         UUID NOT NULL REFERENCES notificacion_tipo(id) ON DELETE CASCADE,
  activo          BOOLEAN DEFAULT false,
  -- Expresión cron: '0 9 * * *' = todos los días 9am
  --                 '0 8 15 * *' = día 15 de cada mes 8am
  cron_expresion  VARCHAR(50) NOT NULL DEFAULT '0 9 * * *',
  -- Días de espera desde el evento base
  -- vencimiento_pago: días desde envío del mensaje
  -- gastos_generales: días desde creación del gasto
  -- recoleccion_medicion y vencimiento_servicio: no aplica (0)
  dias_offset     INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(id_edificio, id_tipo)
);

-- Índices para el scheduler
CREATE INDEX idx_notificacion_config_activo
  ON notificacion_config(activo) WHERE activo = true;

-- Trigger updated_at para notificacion_tipo
CREATE OR REPLACE FUNCTION update_notificacion_tipo_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notificacion_tipo_updated_at
  BEFORE UPDATE ON notificacion_tipo
  FOR EACH ROW EXECUTE FUNCTION update_notificacion_tipo_updated_at();

-- Trigger updated_at para notificacion_config
CREATE OR REPLACE FUNCTION update_notificacion_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notificacion_config_updated_at
  BEFORE UPDATE ON notificacion_config
  FOR EACH ROW EXECUTE FUNCTION update_notificacion_config_updated_at();

-- Verificar
SELECT codigo, nombre, destinatarios FROM notificacion_tipo ORDER BY orden;
