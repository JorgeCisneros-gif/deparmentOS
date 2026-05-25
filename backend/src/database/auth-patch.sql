-- ============================================================
--  EDIFY CORE - Patch de autenticación
--  Ejecutar DESPUÉS del init.sql principal
-- ============================================================

CREATE TYPE user_role AS ENUM ('supervisor', 'propietario');

CREATE TABLE users (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(150)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    role            user_role     NOT NULL DEFAULT 'propietario',
    -- El supervisor puede gestionar varios edificios
    id_edificio     UUID          REFERENCES edificios(id) ON DELETE SET NULL,
    -- El propietario está vinculado a un departamento específico
    id_departamento UUID          REFERENCES departamentos(id) ON DELETE SET NULL,
    -- Referencia al propietario (para obtener nombre, teléfono, etc.)
    id_propietario  UUID          REFERENCES propietarios(id) ON DELETE SET NULL,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    refresh_token   TEXT,         -- hashed refresh token
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_users_edificio   ON users(id_edificio);
CREATE INDEX idx_users_depto      ON users(id_departamento);

CREATE TRIGGER set_updated_at_users
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
--  Tabla para imágenes de medidores (housekeeping 1 año)
-- ============================================================

CREATE TABLE meter_images (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_departamento UUID          NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
    id_recibo       UUID          REFERENCES recibos_servicio(id) ON DELETE SET NULL,
    filename        VARCHAR(255)  NOT NULL,
    filepath        TEXT          NOT NULL,
    file_size_kb    INTEGER,
    -- Resultado del OCR
    ocr_raw_value   VARCHAR(20),          -- lectura cruda del OCR (ej: "01452")
    ocr_confidence  NUMERIC(5,2),         -- confianza del OCR 0-100
    ocr_used_red    BOOLEAN DEFAULT FALSE, -- TRUE si usó dígitos rojos como fallback
    lectura_final   NUMERIC(10,3),         -- valor final aceptado (puede ser editado)
    ocr_metadata    JSONB DEFAULT '{}'::JSONB, -- respuesta completa del modelo
    -- Housekeeping: eliminar después de 1 año
    expires_at      DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
    created_by      UUID  REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meter_images_depto    ON meter_images(id_departamento);
CREATE INDEX idx_meter_images_expires  ON meter_images(expires_at);
CREATE INDEX idx_meter_images_recibo   ON meter_images(id_recibo);

COMMENT ON TABLE  meter_images                IS 'Imágenes de medidores con resultado OCR. Se eliminan al año.';
COMMENT ON COLUMN meter_images.ocr_used_red   IS 'TRUE cuando los dígitos negros no eran legibles y se usó .999 como fallback';
COMMENT ON COLUMN meter_images.expires_at     IS 'Fecha de expiración para housekeeping (1 año desde creación)';

-- ============================================================
--  Usuario supervisor por defecto (cambiar password en producción)
--  Password: Admin@1234  (bcrypt hash)
-- ============================================================
-- INSERT INTO users (email, password_hash, role)
-- VALUES ('supervisor@edify.com',
--         '$2b$10$K.0HwpsoPDlmqGfJ3fMkU.0PxQ.6B9L7R9XqJlFJOhQKH2.FPzTrS',
--         'supervisor');

COMMENT ON TABLE users IS 'Usuarios del sistema: supervisores (admin de edificio) y propietarios';

-- ============================================================
--  Patch v2: tracking de envío de mensajes en cuotas
-- ============================================================

-- Nuevas columnas en cuotas_departamento
ALTER TABLE cuotas_departamento
  ADD COLUMN IF NOT EXISTS mensaje_enviado      BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fecha_mensaje_enviado TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS mensaje_enviado_por   UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_cuotas_mensaje ON cuotas_departamento(mensaje_enviado);

COMMENT ON COLUMN cuotas_departamento.mensaje_enviado       IS 'TRUE cuando el supervisor confirmó que envió el mensaje al propietario';
COMMENT ON COLUMN cuotas_departamento.fecha_mensaje_enviado IS 'Timestamp de cuando se confirmó el envío';
COMMENT ON COLUMN cuotas_departamento.mensaje_enviado_por   IS 'Usuario supervisor que confirmó el envío';

-- ============================================================
--  Patch v3: Módulo de limpieza
-- ============================================================

-- Tipos de cuenta bancaria para proveedores
CREATE TYPE tipo_cuenta AS ENUM ('ahorros', 'corriente', 'yape', 'plin', 'efectivo');

-- ── Tabla: proveedores_limpieza ───────────────────────────────
-- Persona que realiza la limpieza del edificio

CREATE TABLE proveedores_limpieza (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_edificio     UUID          NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
    nombre          VARCHAR(150)  NOT NULL,
    telefono        VARCHAR(20),
    banco           banco_tipo,
    tipo_cuenta     tipo_cuenta   NOT NULL DEFAULT 'ahorros',
    nro_cuenta      VARCHAR(30),
    costo_por_dia   NUMERIC(10,2) NOT NULL DEFAULT 0,
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proveedor_limpieza_edificio ON proveedores_limpieza(id_edificio);

CREATE TRIGGER set_updated_at_prov_limpieza
    BEFORE UPDATE ON proveedores_limpieza
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TABLE proveedores_limpieza IS 'Persona que realiza la limpieza. Tiene su propia cuenta para el pago.';
COMMENT ON COLUMN proveedores_limpieza.costo_por_dia IS 'Costo base por día de limpieza (puede variar por ambiente)';

-- ── Tabla: ambientes_limpieza ─────────────────────────────────
-- Ambientes del edificio que se limpian (lobby, cochera, escaleras, etc.)
-- Cada edificio puede tener diferente cantidad y costos

CREATE TABLE ambientes_limpieza (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_edificio     UUID          NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
    nombre          VARCHAR(100)  NOT NULL,   -- Ej: 'Lobby', 'Cochera', 'Escaleras'
    descripcion     TEXT,
    costo_extra     NUMERIC(10,2) NOT NULL DEFAULT 0,  -- Costo adicional si aplica
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    orden           SMALLINT      DEFAULT 1,  -- Para mostrar ordenado en UI
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (id_edificio, nombre)
);

CREATE INDEX idx_ambientes_edificio ON ambientes_limpieza(id_edificio);

CREATE TRIGGER set_updated_at_ambientes
    BEFORE UPDATE ON ambientes_limpieza
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TABLE ambientes_limpieza IS 'Áreas del edificio que se limpian con sus costos específicos';

-- ── Tabla: registros_limpieza ─────────────────────────────────
-- Registro mensual de días trabajados y ambientes limpiados

CREATE TABLE registros_limpieza (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_edificio         UUID          NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
    id_proveedor        UUID          NOT NULL REFERENCES proveedores_limpieza(id),
    periodo_mes         SMALLINT      NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
    periodo_anio        SMALLINT      NOT NULL,
    dias_trabajados     SMALLINT      NOT NULL DEFAULT 0,
    -- Ambientes limpiados este mes (array de IDs)
    ambientes_ids       UUID[]        DEFAULT '{}',
    -- Detalle de días con fechas específicas (opcional, para auditoría)
    detalle_dias        JSONB         DEFAULT '[]'::JSONB,
    -- Costos calculados
    costo_base          NUMERIC(10,2) NOT NULL DEFAULT 0,  -- dias × costo_por_dia
    costo_ambientes     NUMERIC(10,2) NOT NULL DEFAULT 0,  -- suma de costos_extra de ambientes
    monto_total         NUMERIC(10,2) NOT NULL DEFAULT 0,  -- costo_base + costo_ambientes
    -- Control de pago AL PROVEEDOR (diferente al cobro a los deptos)
    pago_proveedor_status   VARCHAR(20) DEFAULT 'pendiente',  -- pendiente | pagado
    pago_proveedor_fecha    DATE,
    pago_proveedor_ref      VARCHAR(100),  -- nro de operación
    -- Mensaje de cobro a propietarios
    mensaje_enviado         BOOLEAN       NOT NULL DEFAULT FALSE,
    fecha_mensaje_enviado   TIMESTAMPTZ,
    mensaje_enviado_por     UUID REFERENCES users(id),
    observaciones           TEXT,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (id_edificio, periodo_mes, periodo_anio)
);

CREATE INDEX idx_registro_limpieza_edificio ON registros_limpieza(id_edificio);
CREATE INDEX idx_registro_limpieza_periodo  ON registros_limpieza(periodo_anio, periodo_mes);
CREATE INDEX idx_registro_limpieza_proveedor ON registros_limpieza(id_proveedor);

CREATE TRIGGER set_updated_at_reg_limpieza
    BEFORE UPDATE ON registros_limpieza
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TABLE registros_limpieza IS 'Registro mensual de limpieza: días trabajados, ambientes y costos';
COMMENT ON COLUMN registros_limpieza.detalle_dias IS 'JSON con fechas específicas: [{"fecha":"2024-03-05","ambientes":["Lobby","Cochera"]}]';
COMMENT ON COLUMN registros_limpieza.pago_proveedor_status IS 'Estado del pago al proveedor (independiente del cobro a vecinos)';

-- ── Seed: ambientes del Edificio Carlos Izaguirre ─────────────
-- (Los 2 ambientes mencionados)
-- Se ejecuta si ya existe el edificio en la BD

DO $$
DECLARE v_edificio UUID;
BEGIN
    SELECT id INTO v_edificio FROM edificios WHERE nombre ILIKE '%Carlos Izaguirre%' LIMIT 1;
    IF v_edificio IS NOT NULL THEN
        INSERT INTO ambientes_limpieza (id_edificio, nombre, descripcion, costo_extra, orden)
        VALUES
            (v_edificio, 'Edificio Principal', 'Escaleras, pasillos y áreas comunes del edificio', 0, 1),
            (v_edificio, 'Cochera',            'Limpieza de la cochera y acceso vehicular',         0, 2)
        ON CONFLICT (id_edificio, nombre) DO NOTHING;

        -- Proveedor de ejemplo (datos ficticios)
        INSERT INTO proveedores_limpieza
            (id_edificio, nombre, telefono, banco, tipo_cuenta, nro_cuenta, costo_por_dia)
        VALUES
            (v_edificio, 'María García', '51999888777', 'bcp', 'ahorros', '191-12345678-0-01', 40.00)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ============================================================
--  Patch v4: Plantillas de mensajes personalizables
-- ============================================================

CREATE TYPE template_tipo AS ENUM (
  'cuota_servicios',    -- mensaje principal agua+luz+internet
  'limpieza',           -- mensaje cuota de limpieza
  'recordatorio_pago',  -- recordatorio de pago pendiente
  'bienvenida',         -- mensaje de bienvenida a nuevo propietario
  'aviso_general'       -- comunicado general del edificio
);

CREATE TABLE message_templates (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_edificio     UUID            NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
    tipo            template_tipo   NOT NULL,
    nombre          VARCHAR(100)    NOT NULL,   -- Ej: "Cuota mensual estándar"
    descripcion     TEXT,
    -- El cuerpo con variables entre llaves: {{propietario}}, {{depto}}, etc.
    cuerpo          TEXT            NOT NULL,
    activo          BOOLEAN         NOT NULL DEFAULT TRUE,
    es_default      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_by      UUID            REFERENCES users(id),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- Solo una plantilla default por tipo por edificio
    UNIQUE NULLS NOT DISTINCT (id_edificio, tipo, es_default)
);

CREATE INDEX idx_templates_edificio ON message_templates(id_edificio);
CREATE INDEX idx_templates_tipo     ON message_templates(tipo);

CREATE TRIGGER set_updated_at_templates
    BEFORE UPDATE ON message_templates
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

COMMENT ON TABLE message_templates IS 'Plantillas personalizables de mensajes por edificio';
COMMENT ON COLUMN message_templates.cuerpo IS 'Texto con variables: {{propietario}}, {{depto}}, {{periodo}}, {{m3}}, {{monto_agua}}, etc.';
COMMENT ON COLUMN message_templates.es_default IS 'Si TRUE, se usa automáticamente para ese tipo al generar mensajes';

-- ── Plantillas por defecto (seeds) ───────────────────────────
-- Se insertan condicionalmente si ya existe el edificio seed

DO $$
DECLARE v_edificio UUID;
BEGIN
    SELECT id INTO v_edificio FROM edificios WHERE nombre ILIKE '%Carlos Izaguirre%' LIMIT 1;
    IF v_edificio IS NOT NULL THEN

        INSERT INTO message_templates (id_edificio, tipo, nombre, descripcion, cuerpo, es_default) VALUES

        -- Cuota de servicios
        (v_edificio, 'cuota_servicios', 'Cuota mensual estándar',
         'Plantilla principal para el cobro mensual de servicios',
         E'🏢 *{{edificio}}* — Depto *{{depto}}*\n\nHola {{propietario}}, le comunicamos su cuota de *{{periodo}}*:\n\n💧 Agua ({{m3}} m³): S/. {{monto_agua}}\n💡 Luz áreas comunes: S/. {{monto_luz}}\n📡 Internet/cámaras: S/. {{monto_internet}}\n\n*TOTAL: S/. {{monto_total}}*\n📅 Vence: {{fecha_vencimiento}}\n\nPor favor envíe su comprobante al confirmar. ¡Gracias! 🙏',
         TRUE),

        -- Limpieza
        (v_edificio, 'limpieza', 'Cuota de limpieza estándar',
         'Plantilla para el cobro mensual de limpieza',
         E'🧹 *Cuota de Limpieza — {{periodo}}*\n\nHola {{propietario}} (Depto {{depto}}), el detalle de limpieza de este mes:\n\n📋 Días trabajados: {{dias_trabajados}}\n🏠 Ambientes: {{ambientes}}\n💰 Total edificio: S/. {{monto_total_limpieza}}\n\n*Su cuota: S/. {{cuota_depto}}*\n\n¡Gracias por su pago puntual! 🙏',
         TRUE),

        -- Recordatorio
        (v_edificio, 'recordatorio_pago', 'Recordatorio de pago',
         'Para propietarios con pago pendiente',
         E'⏰ *Recordatorio de Pago — {{periodo}}*\n\nHola {{propietario}}, le recordamos que tiene una cuota pendiente del Depto *{{depto}}*:\n\n*Monto: S/. {{monto_total}}*\n📅 Venció: {{fecha_vencimiento}}\n\nPor favor regularice su pago a la brevedad. ¡Gracias!',
         TRUE),

        -- Bienvenida
        (v_edificio, 'bienvenida', 'Bienvenida a nuevo propietario',
         'Se envía cuando ingresa un nuevo residente',
         E'🏠 *Bienvenido/a al {{edificio}}*\n\nHola {{propietario}}, le damos la bienvenida al Depto *{{depto}}*.\n\nEste sistema le permitirá consultar sus cuotas mensuales e historial de consumo de agua.\n\nAnte cualquier consulta no dude en contactarnos. ¡Bienvenido/a! 😊',
         TRUE),

        -- Aviso general
        (v_edificio, 'aviso_general', 'Comunicado general',
         'Para comunicaciones generales a todos los propietarios',
         E'📢 *Comunicado — {{edificio}}*\n\nEstimado/a {{propietario}} (Depto {{depto}}):\n\n{{mensaje_libre}}\n\nQuedamos atentos a sus consultas.',
         TRUE);

    END IF;
END $$;
