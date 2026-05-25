-- ============================================================
--  EDIFY CORE - Script de inicialización v2
--  Basado en análisis del Edificio Carlos Izaguirre
--  Base de datos: edify_core  |  Motor: PostgreSQL 16
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
--  ENUM TYPES
-- ============================================================

CREATE TYPE status_general    AS ENUM ('activo', 'inactivo');
CREATE TYPE tipo_pago         AS ENUM ('efectivo', 'transferencia', 'yape', 'plin', 'otro');
CREATE TYPE status_pago       AS ENUM ('pendiente', 'pagado', 'vencido', 'parcial');
CREATE TYPE status_servicio   AS ENUM ('vigente', 'vencido', 'pagado', 'anulado');
CREATE TYPE tipo_servicio     AS ENUM ('agua', 'luz', 'internet', 'limpieza', 'mantenimiento', 'otro');
CREATE TYPE modo_calculo      AS ENUM ('por_consumo_m3', 'division_igualitaria', 'porcentaje_alicuota');
CREATE TYPE banco_tipo        AS ENUM ('bcp', 'bbva', 'interbank', 'scotiabank', 'otro');

-- ============================================================
--  TABLA: edificios
-- ============================================================

CREATE TABLE edificios (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(150)  NOT NULL,
    direccion       TEXT          NOT NULL,
    nro_depas       SMALLINT      NOT NULL DEFAULT 0,
    cuenta_bbva     VARCHAR(30),
    cuenta_bcp      VARCHAR(30),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE edificios IS 'Edificios multifamiliares registrados en Edify';

-- ============================================================
--  TABLA: propietarios
-- ============================================================

CREATE TABLE propietarios (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(150)  NOT NULL,
    correo          VARCHAR(150),
    telefono        VARCHAR(20),
    banco           banco_tipo,
    status          status_general NOT NULL DEFAULT 'activo',
    tipo_pago       tipo_pago      NOT NULL DEFAULT 'transferencia',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE propietarios IS 'Propietarios o residentes del edificio';

-- ============================================================
--  TABLA: departamentos
-- ============================================================

CREATE TABLE departamentos (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_edificio     UUID          NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
    id_propietario  UUID          REFERENCES propietarios(id) ON DELETE SET NULL,
    nr_departamento VARCHAR(10)   NOT NULL,
    piso            SMALLINT      NOT NULL,
    status          status_general NOT NULL DEFAULT 'activo',
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (id_edificio, nr_departamento)
);

COMMENT ON TABLE departamentos IS 'Unidades habitacionales dentro de un edificio';

-- ============================================================
--  TABLA: servicios
-- ============================================================

CREATE TABLE servicios (
    id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_edificio     UUID          NOT NULL REFERENCES edificios(id) ON DELETE CASCADE,
    nombre_servicio VARCHAR(100)  NOT NULL,
    tipo            tipo_servicio NOT NULL,
    modo_calculo    modo_calculo  NOT NULL,
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN servicios.modo_calculo IS 'agua=por_consumo_m3 | luz/internet/limpieza=division_igualitaria';

-- ============================================================
--  TABLA: recibos_servicio
-- ============================================================

CREATE TABLE recibos_servicio (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_servicio         UUID          NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
    nro_recibo          VARCHAR(60),
    periodo_mes         SMALLINT      NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
    periodo_anio        SMALLINT      NOT NULL,
    fecha_emision       DATE,
    fecha_vencimiento   DATE,
    monto_total_factura NUMERIC(10,2) NOT NULL DEFAULT 0,
    m3_lectura_actual   NUMERIC(10,3),
    m3_lectura_anterior NUMERIC(10,3),
    m3_consumo_total    NUMERIC(10,3) GENERATED ALWAYS AS (
                            CASE WHEN m3_lectura_actual IS NOT NULL
                                      AND m3_lectura_anterior IS NOT NULL
                                 THEN m3_lectura_actual - m3_lectura_anterior
                                 ELSE NULL END
                        ) STORED,
    precio_m3           NUMERIC(10,6) GENERATED ALWAYS AS (
                            CASE WHEN m3_lectura_actual IS NOT NULL
                                      AND m3_lectura_anterior IS NOT NULL
                                      AND (m3_lectura_actual - m3_lectura_anterior) > 0
                                 THEN monto_total_factura / (m3_lectura_actual - m3_lectura_anterior)
                                 ELSE NULL END
                        ) STORED,
    detalle_json        JSONB         DEFAULT '{}'::JSONB,
    status              status_servicio NOT NULL DEFAULT 'vigente',
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (id_servicio, periodo_mes, periodo_anio)
);

COMMENT ON COLUMN recibos_servicio.precio_m3        IS 'Auto: monto_total / m3_consumo_total';
COMMENT ON COLUMN recibos_servicio.m3_consumo_total IS 'Auto: lectura_actual - lectura_anterior';

-- ============================================================
--  TABLA: mediciones_departamento
-- ============================================================

CREATE TABLE mediciones_departamento (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_recibo           UUID          NOT NULL REFERENCES recibos_servicio(id) ON DELETE CASCADE,
    id_departamento     UUID          NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
    lectura_actual      NUMERIC(10,3) NOT NULL,
    lectura_anterior    NUMERIC(10,3) NOT NULL,
    m3_consumido        NUMERIC(10,3) GENERATED ALWAYS AS (lectura_actual - lectura_anterior) STORED,
    monto_calculado     NUMERIC(10,2) NOT NULL DEFAULT 0,
    es_zona_comun       BOOLEAN       NOT NULL DEFAULT FALSE,
    observacion         TEXT,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (id_recibo, id_departamento)
);

-- ============================================================
--  TABLA: cuotas_departamento
-- ============================================================

CREATE TABLE cuotas_departamento (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_departamento     UUID          NOT NULL REFERENCES departamentos(id) ON DELETE CASCADE,
    periodo_mes         SMALLINT      NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
    periodo_anio        SMALLINT      NOT NULL,
    monto_agua          NUMERIC(10,2) NOT NULL DEFAULT 0,
    monto_luz           NUMERIC(10,2) NOT NULL DEFAULT 0,
    monto_internet      NUMERIC(10,2) NOT NULL DEFAULT 0,
    monto_limpieza      NUMERIC(10,2) NOT NULL DEFAULT 0,
    monto_otros         NUMERIC(10,2) NOT NULL DEFAULT 0,
    ajuste_mes_anterior NUMERIC(10,2) NOT NULL DEFAULT 0,
    monto_total         NUMERIC(10,2) GENERATED ALWAYS AS (
                            monto_agua + monto_luz + monto_internet +
                            monto_limpieza + monto_otros + ajuste_mes_anterior
                        ) STORED,
    fecha_vencimiento   DATE,
    status_pago         status_pago   NOT NULL DEFAULT 'pendiente',
    detalle_json        JSONB         DEFAULT '{}'::JSONB,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (id_departamento, periodo_mes, periodo_anio)
);

-- ============================================================
--  TABLA: pagos
-- ============================================================

CREATE TABLE pagos (
    id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_cuota            UUID          NOT NULL REFERENCES cuotas_departamento(id) ON DELETE CASCADE,
    id_propietario      UUID          NOT NULL REFERENCES propietarios(id) ON DELETE CASCADE,
    fecha_pago          DATE          NOT NULL DEFAULT CURRENT_DATE,
    monto_cancelado     NUMERIC(10,2) NOT NULL,
    tipo_pago           tipo_pago     NOT NULL DEFAULT 'transferencia',
    banco               banco_tipo,
    referencia          VARCHAR(100),
    comprobante_url     TEXT,
    observacion         TEXT,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
--  ÍNDICES
-- ============================================================

CREATE INDEX idx_departamentos_edificio    ON departamentos(id_edificio);
CREATE INDEX idx_departamentos_propietario ON departamentos(id_propietario);
CREATE INDEX idx_servicios_edificio        ON servicios(id_edificio);
CREATE INDEX idx_recibos_servicio          ON recibos_servicio(id_servicio);
CREATE INDEX idx_recibos_periodo           ON recibos_servicio(periodo_anio, periodo_mes);
CREATE INDEX idx_recibos_vencimiento       ON recibos_servicio(fecha_vencimiento);
CREATE INDEX idx_mediciones_recibo         ON mediciones_departamento(id_recibo);
CREATE INDEX idx_mediciones_depto          ON mediciones_departamento(id_departamento);
CREATE INDEX idx_cuotas_depto              ON cuotas_departamento(id_departamento);
CREATE INDEX idx_cuotas_periodo            ON cuotas_departamento(periodo_anio, periodo_mes);
CREATE INDEX idx_cuotas_status             ON cuotas_departamento(status_pago);
CREATE INDEX idx_pagos_cuota               ON pagos(id_cuota);
CREATE INDEX idx_pagos_propietario         ON pagos(id_propietario);
CREATE INDEX idx_pagos_fecha               ON pagos(fecha_pago);

-- ============================================================
--  FUNCIÓN y TRIGGERS: auto updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'edificios','propietarios','departamentos','servicios',
        'recibos_servicio','mediciones_departamento','cuotas_departamento','pagos'
    ]
    LOOP
        EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
                        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();', t);
    END LOOP;
END; $$;

-- ============================================================
--  SEED: Edificio Carlos Izaguirre
-- ============================================================

DO $$
DECLARE
    v_edificio     UUID := uuid_generate_v4();
    v_angela       UUID := uuid_generate_v4();
    v_sergio       UUID := uuid_generate_v4();
    v_jorge        UUID := uuid_generate_v4();
    v_alberto      UUID := uuid_generate_v4();
    v_carolina     UUID := uuid_generate_v4();
    v_dilvia       UUID := uuid_generate_v4();
    v_naydu        UUID := uuid_generate_v4();
    v_eliza        UUID := uuid_generate_v4();
    v_cinthya      UUID := uuid_generate_v4();
    v_helen        UUID := uuid_generate_v4();
    v_d201 UUID := uuid_generate_v4(); v_d202 UUID := uuid_generate_v4();
    v_d301 UUID := uuid_generate_v4(); v_d302 UUID := uuid_generate_v4();
    v_d401 UUID := uuid_generate_v4(); v_d402 UUID := uuid_generate_v4();
    v_d501 UUID := uuid_generate_v4(); v_d502 UUID := uuid_generate_v4();
    v_d601 UUID := uuid_generate_v4(); v_d602 UUID := uuid_generate_v4();
    v_svc_agua     UUID := uuid_generate_v4();
    v_svc_luz      UUID := uuid_generate_v4();
    v_svc_internet UUID := uuid_generate_v4();
    v_svc_limpieza UUID := uuid_generate_v4();
    v_recibo_agua  UUID := uuid_generate_v4();
BEGIN

    INSERT INTO edificios (id, nombre, direccion, nro_depas)
    VALUES (v_edificio, 'Edificio Carlos Izaguirre', 'Jr. Carlos Izaguirre, Lima, Perú', 10);

    INSERT INTO propietarios (id, nombre, correo, telefono, banco, tipo_pago) VALUES
        (v_angela,  'Angela Felipa',       'leidy04.mac@gmail.com',        '51985274386', 'bbva', 'transferencia'),
        (v_sergio,  'Sergio',               NULL,                           '51946608251', 'bcp',  'yape'),
        (v_jorge,   'Jorge Cisneros',       'jorgeicb@hotmail.com',         '51946040444', 'bcp',  'transferencia'),
        (v_alberto, 'Alberto Lezana',       NULL,                           '51986949350', 'bcp',  'transferencia'),
        (v_carolina,'Carolina Aguirre',     'carolinaaguirref@hotmail.com', '51965395645', 'bbva', 'transferencia'),
        (v_dilvia,  'Dilvia Estela Diaz',   'dilvia15@hotmail.com',         '51943156512', 'bcp',  'transferencia'),
        (v_naydu,   'Naydu Blanco',         'naydubf@gmail.com',            '51997830926', 'bcp',  'yape'),
        (v_eliza,   'Eliza Yanina Fuentes', 'eliza.fuentesar@gmail.com',    '51999926771', 'bcp',  'transferencia'),
        (v_cinthya, 'Cinthya Ancieta',      'cinbri01@gmail.com',           '51924011033', 'bcp',  'transferencia'),
        (v_helen,   'Helen Bardales',       'helenbardales2020@gmail.com',  '51949030763', 'bbva', 'transferencia');

    INSERT INTO departamentos (id, id_edificio, id_propietario, nr_departamento, piso) VALUES
        (v_d201, v_edificio, v_angela,   '201', 2),
        (v_d202, v_edificio, v_sergio,   '202', 2),
        (v_d301, v_edificio, v_jorge,    '301', 3),
        (v_d302, v_edificio, v_alberto,  '302', 3),
        (v_d401, v_edificio, v_carolina, '401', 4),
        (v_d402, v_edificio, v_dilvia,   '402', 4),
        (v_d501, v_edificio, v_naydu,    '501', 5),
        (v_d502, v_edificio, v_eliza,    '502', 5),
        (v_d601, v_edificio, v_cinthya,  '601', 6),
        (v_d602, v_edificio, v_helen,    '602', 6);

    INSERT INTO servicios (id, id_edificio, nombre_servicio, tipo, modo_calculo) VALUES
        (v_svc_agua,     v_edificio, 'Agua Sedapal',        'agua',     'por_consumo_m3'),
        (v_svc_luz,      v_edificio, 'Luz áreas comunes',   'luz',      'division_igualitaria'),
        (v_svc_internet, v_edificio, 'Internet edificio',   'internet', 'division_igualitaria'),
        (v_svc_limpieza, v_edificio, 'Limpieza edificio',   'limpieza', 'division_igualitaria');

    INSERT INTO recibos_servicio (
        id, id_servicio, periodo_mes, periodo_anio,
        fecha_emision, fecha_vencimiento, monto_total_factura,
        m3_lectura_actual, m3_lectura_anterior
    ) VALUES (
        v_recibo_agua, v_svc_agua, 1, 2024,
        '2024-01-01', '2024-01-24', 270.00,
        924.940, 908.563
    );

    INSERT INTO mediciones_departamento (id_recibo, id_departamento, lectura_actual, lectura_anterior, monto_calculado) VALUES
        (v_recibo_agua, v_d201, 924.940, 908.563, 59.12),
        (v_recibo_agua, v_d202, 616.652, 608.343, 29.99),
        (v_recibo_agua, v_d301, 340.258, 330.196, 36.32),
        (v_recibo_agua, v_d302, 583.797, 574.328, 34.27),
        (v_recibo_agua, v_d401, 110.034, 108.429,  5.81),
        (v_recibo_agua, v_d402, 471.409, 460.644, 38.96),
        (v_recibo_agua, v_d501,  26.613,  24.987,  5.88),
        (v_recibo_agua, v_d502, 471.409, 460.300, 40.16),
        (v_recibo_agua, v_d601, 108.429, 108.236,  0.70),
        (v_recibo_agua, v_d602, 471.409, 453.759, 63.71);

    INSERT INTO cuotas_departamento (
        id_departamento, periodo_mes, periodo_anio,
        monto_agua, monto_luz, fecha_vencimiento, status_pago
    ) VALUES
        (v_d201, 1, 2024, 59.12, 4.75, '2024-01-24', 'pagado'),
        (v_d202, 1, 2024, 29.99, 4.75, '2024-01-24', 'pagado'),
        (v_d301, 1, 2024, 36.32, 4.75, '2024-01-24', 'pagado'),
        (v_d302, 1, 2024, 34.27, 4.75, '2024-01-24', 'pagado'),
        (v_d401, 1, 2024,  5.81, 4.75, '2024-01-24', 'pagado'),
        (v_d402, 1, 2024, 38.96, 4.75, '2024-01-24', 'pagado'),
        (v_d501, 1, 2024,  5.88, 4.75, '2024-01-24', 'pagado'),
        (v_d502, 1, 2024, 40.16, 4.75, '2024-01-24', 'pagado'),
        (v_d601, 1, 2024,  0.70, 4.75, '2024-01-24', 'pagado'),
        (v_d602, 1, 2024, 63.71, 4.75, '2024-01-24', 'pagado');

END $$;

-- ============================================================
--  VISTAS
-- ============================================================

CREATE OR REPLACE VIEW v_cuotas_pendientes AS
SELECT
    e.nombre                                          AS edificio,
    d.nr_departamento                                 AS depto,
    p.nombre                                          AS propietario,
    p.telefono,
    p.banco,
    cd.periodo_mes,
    cd.periodo_anio,
    cd.monto_agua,
    cd.monto_luz,
    cd.monto_internet,
    cd.monto_limpieza,
    cd.monto_total,
    cd.fecha_vencimiento,
    cd.status_pago,
    COALESCE(SUM(pa.monto_cancelado), 0)              AS total_pagado,
    cd.monto_total - COALESCE(SUM(pa.monto_cancelado), 0) AS saldo_pendiente
FROM cuotas_departamento cd
JOIN departamentos  d  ON d.id  = cd.id_departamento
JOIN edificios      e  ON e.id  = d.id_edificio
LEFT JOIN propietarios p ON p.id = d.id_propietario
LEFT JOIN pagos     pa ON pa.id_cuota = cd.id
GROUP BY
    e.nombre, d.nr_departamento, p.nombre, p.telefono, p.banco,
    cd.periodo_mes, cd.periodo_anio,
    cd.monto_agua, cd.monto_luz, cd.monto_internet, cd.monto_limpieza,
    cd.monto_total, cd.fecha_vencimiento, cd.status_pago
ORDER BY cd.periodo_anio DESC, cd.periodo_mes DESC, d.nr_departamento;

CREATE OR REPLACE VIEW v_precio_m3_historico AS
SELECT
    rs.periodo_anio,
    rs.periodo_mes,
    rs.monto_total_factura,
    rs.m3_consumo_total,
    rs.precio_m3,
    rs.fecha_vencimiento
FROM recibos_servicio rs
JOIN servicios s ON s.id = rs.id_servicio
WHERE s.tipo = 'agua'
ORDER BY rs.periodo_anio DESC, rs.periodo_mes DESC;

-- FIN SCRIPT v2