-- Migration: 006_remesas_reportes_schema.sql
-- Description: Schema para remesas SEPA, mandatos y reportes
-- Date: 2025-12-17

-- =====================================================
-- TIPOS ENUMERADOS
-- =====================================================

-- Estado de la remesa
CREATE TYPE estado_remesa AS ENUM (
  'borrador',       -- En preparación
  'generada',       -- Fichero XML generado
  'enviada',        -- Enviada al banco
  'procesada',      -- Procesada por el banco
  'parcial',        -- Cobrada parcialmente (algunos rechazos)
  'completada',     -- Todos los cobros realizados
  'rechazada'       -- Rechazada por el banco
);

-- Estado del recibo
CREATE TYPE estado_recibo AS ENUM (
  'incluido',       -- Incluido en la remesa
  'cobrado',        -- Cobro realizado
  'rechazado',      -- Rechazado por el banco
  'devuelto'        -- Devuelto posteriormente
);

-- Estado del mandato SEPA
CREATE TYPE estado_mandato AS ENUM (
  'activo',
  'cancelado',
  'vencido'
);

-- =====================================================
-- TABLAS
-- =====================================================

-- Tabla de configuración SEPA
CREATE TABLE configuracion_sepa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Datos del acreedor
  nombre_acreedor TEXT NOT NULL DEFAULT 'A360 SERVICIOS ENERGETICOS SL',
  cif_acreedor TEXT NOT NULL DEFAULT 'B88313473',
  identificador_acreedor TEXT NOT NULL DEFAULT 'ES12000B88313473',
  
  -- Cuenta de cobro principal
  iban_principal TEXT NOT NULL DEFAULT 'ES0000000000000000000000',
  bic_principal TEXT NOT NULL DEFAULT 'XXXXXXXXXX',
  nombre_banco TEXT DEFAULT 'Banco por configurar',
  
  -- Configuración de generación
  prefijo_remesa TEXT NOT NULL DEFAULT 'A360-REM',
  prefijo_mandato TEXT NOT NULL DEFAULT 'A360-CLI',
  
  -- Días de antelación para fecha de cobro
  dias_antelacion_cobro INTEGER NOT NULL DEFAULT 5,
  
  -- Auditoría
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Singleton para configuración SEPA
CREATE UNIQUE INDEX idx_configuracion_sepa_singleton ON configuracion_sepa((true));

-- Tabla de mandatos SEPA
CREATE TABLE mandatos_sepa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Identificación
  referencia TEXT UNIQUE NOT NULL,
  
  -- Datos bancarios
  iban TEXT NOT NULL,
  bic TEXT,
  titular_cuenta TEXT NOT NULL,
  
  -- Fechas
  fecha_firma DATE NOT NULL,
  fecha_primera_utilizacion DATE,
  fecha_ultima_utilizacion DATE,
  
  -- Tipo de secuencia
  tipo_secuencia TEXT NOT NULL DEFAULT 'RCUR', -- FRST, RCUR, OOFF, FNAL
  
  -- Estado
  estado estado_mandato NOT NULL DEFAULT 'activo',
  motivo_cancelacion TEXT,
  fecha_cancelacion DATE,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de remesas
CREATE TABLE remesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  referencia TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  
  -- Fechas
  fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_cobro DATE NOT NULL,
  fecha_envio_banco DATE,
  fecha_procesado DATE,
  
  -- Totales
  num_recibos INTEGER NOT NULL DEFAULT 0,
  importe_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Resultados (tras procesamiento)
  num_cobrados INTEGER DEFAULT 0,
  importe_cobrado DECIMAL(12,2) DEFAULT 0,
  num_rechazados INTEGER DEFAULT 0,
  importe_rechazado DECIMAL(12,2) DEFAULT 0,
  
  -- Fichero
  fichero_xml TEXT,
  fichero_nombre TEXT,
  
  -- Estado
  estado estado_remesa NOT NULL DEFAULT 'borrador',
  
  -- Cuenta de cobro
  iban_cobro TEXT NOT NULL,
  bic_cobro TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla de recibos de remesa
CREATE TABLE remesas_recibos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remesa_id UUID NOT NULL REFERENCES remesas(id) ON DELETE CASCADE,
  factura_id UUID NOT NULL REFERENCES facturas(id),
  
  -- Datos del recibo
  referencia_recibo TEXT NOT NULL,
  importe DECIMAL(10,2) NOT NULL,
  
  -- Datos del mandato
  mandato_referencia TEXT NOT NULL,
  mandato_fecha_firma DATE NOT NULL,
  
  -- Datos del deudor (snapshot)
  deudor_nombre TEXT NOT NULL,
  deudor_iban TEXT NOT NULL,
  deudor_bic TEXT,
  
  -- Concepto
  concepto TEXT NOT NULL,
  
  -- Estado
  estado estado_recibo NOT NULL DEFAULT 'incluido',
  
  -- Rechazo (si aplica)
  codigo_rechazo TEXT,
  motivo_rechazo TEXT,
  fecha_rechazo DATE,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- COLUMNAS ADICIONALES EN CLIENTES
-- =====================================================

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS mandato_sepa_id UUID REFERENCES mandatos_sepa(id);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fecha_mandato_sepa DATE;

-- =====================================================
-- ÍNDICES
-- =====================================================

CREATE INDEX idx_mandatos_cliente ON mandatos_sepa(cliente_id);
CREATE INDEX idx_mandatos_estado ON mandatos_sepa(estado);
CREATE INDEX idx_mandatos_referencia ON mandatos_sepa(referencia);

CREATE INDEX idx_remesas_fecha ON remesas(fecha_creacion DESC);
CREATE INDEX idx_remesas_estado ON remesas(estado);
CREATE INDEX idx_remesas_referencia ON remesas(referencia);

CREATE INDEX idx_remesas_recibos_remesa ON remesas_recibos(remesa_id);
CREATE INDEX idx_remesas_recibos_factura ON remesas_recibos(factura_id);
CREATE INDEX idx_remesas_recibos_estado ON remesas_recibos(estado);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER mandatos_sepa_updated_at
  BEFORE UPDATE ON mandatos_sepa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER remesas_updated_at
  BEFORE UPDATE ON remesas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER remesas_recibos_updated_at
  BEFORE UPDATE ON remesas_recibos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE configuracion_sepa ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandatos_sepa ENABLE ROW LEVEL SECURITY;
ALTER TABLE remesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE remesas_recibos ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura
CREATE POLICY "Usuarios autenticados pueden leer configuracion_sepa"
  ON configuracion_sepa FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden leer mandatos_sepa"
  ON mandatos_sepa FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden leer remesas"
  ON remesas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden leer remesas_recibos"
  ON remesas_recibos FOR SELECT TO authenticated USING (true);

-- Políticas de modificación
CREATE POLICY "Solo admins pueden modificar configuracion_sepa"
  ON configuracion_sepa FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "Usuarios autenticados pueden modificar mandatos_sepa"
  ON mandatos_sepa FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden modificar remesas"
  ON remesas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden modificar remesas_recibos"
  ON remesas_recibos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- DATOS INICIALES
-- =====================================================

INSERT INTO configuracion_sepa (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- =====================================================
-- VISTAS PARA REPORTES
-- =====================================================

-- Vista para reporte de consumos por vivienda
CREATE OR REPLACE VIEW v_reporte_consumos_vivienda AS
SELECT 
  l.id AS lectura_id,
  l.fecha_lectura,
  l.consumo,
  c.nombre AS concepto,
  c.unidad_medida,
  cont.numero_serie AS contador,
  u.nombre AS ubicacion,
  a.nombre AS agrupacion,
  com.nombre AS comunidad,
  com.id AS comunidad_id,
  COALESCE(cli.nombre || ' ' || cli.apellidos, 'Sin asignar') AS cliente,
  f.numero_completo AS factura,
  f.total AS importe_facturado
FROM lecturas l
JOIN conceptos c ON l.concepto_id = c.id
JOIN contadores cont ON l.contador_id = cont.id
JOIN ubicaciones u ON cont.ubicacion_id = u.id
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades com ON a.comunidad_id = com.id
LEFT JOIN ubicaciones_clientes uc ON u.id = uc.ubicacion_id AND uc.es_actual = true
LEFT JOIN clientes cli ON uc.cliente_id = cli.id
LEFT JOIN facturas f ON l.factura_id = f.id;

-- Vista para reporte de facturación por comunidad
CREATE OR REPLACE VIEW v_reporte_facturacion_comunidad AS
SELECT 
  com.id AS comunidad_id,
  com.nombre AS comunidad,
  DATE_TRUNC('month', f.fecha_factura) AS mes,
  COUNT(*) AS num_facturas,
  SUM(f.base_imponible) AS base_imponible,
  SUM(f.importe_iva) AS iva,
  SUM(f.total) AS total,
  SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) AS cobrado,
  SUM(CASE WHEN f.estado = 'emitida' THEN f.total ELSE 0 END) AS pendiente
FROM facturas f
JOIN comunidades com ON f.comunidad_id = com.id
WHERE f.estado IN ('emitida', 'pagada')
GROUP BY com.id, com.nombre, DATE_TRUNC('month', f.fecha_factura);

-- Vista para reporte de morosidad
CREATE OR REPLACE VIEW v_reporte_morosidad AS
SELECT 
  cli.id AS cliente_id,
  cli.nombre || ' ' || COALESCE(cli.apellidos, '') AS cliente,
  cli.nif,
  cli.email,
  cli.telefono,
  com.nombre AS comunidad,
  com.id AS comunidad_id,
  COUNT(*) AS num_facturas_pendientes,
  SUM(f.total) AS importe_pendiente,
  MIN(f.fecha_vencimiento) AS vencimiento_mas_antiguo,
  CURRENT_DATE - MIN(f.fecha_vencimiento) AS dias_mora_max
FROM facturas f
JOIN clientes cli ON f.cliente_id = cli.id
JOIN comunidades com ON f.comunidad_id = com.id
WHERE f.estado = 'emitida'
  AND f.fecha_vencimiento < CURRENT_DATE
GROUP BY cli.id, cli.nombre, cli.apellidos, cli.nif, cli.email, cli.telefono, com.nombre, com.id
ORDER BY importe_pendiente DESC;

-- Vista de facturas pendientes de remesa (con domiciliación)
CREATE OR REPLACE VIEW v_facturas_pendientes_remesa AS
SELECT 
  f.id,
  f.numero_completo,
  f.fecha_factura,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_nif,
  f.total,
  com.nombre AS comunidad_nombre,
  m.id AS mandato_id,
  m.referencia AS mandato_referencia,
  m.iban AS mandato_iban,
  m.bic AS mandato_bic,
  m.fecha_firma AS mandato_fecha_firma,
  m.estado AS mandato_estado,
  CASE 
    WHEN m.id IS NULL THEN 'sin_mandato'
    WHEN m.estado != 'activo' THEN 'mandato_inactivo'
    WHEN m.iban IS NULL OR m.iban = '' THEN 'sin_iban'
    ELSE 'valido'
  END AS estado_remesa
FROM facturas f
JOIN comunidades com ON f.comunidad_id = com.id
JOIN clientes cli ON f.cliente_id = cli.id
LEFT JOIN mandatos_sepa m ON cli.mandato_sepa_id = m.id
WHERE f.estado = 'emitida'
  AND f.metodo_pago = 'domiciliacion'
  AND NOT EXISTS (
    SELECT 1 FROM remesas_recibos rr 
    WHERE rr.factura_id = f.id 
    AND rr.estado IN ('incluido', 'cobrado')
  );

-- =====================================================
-- FUNCIONES
-- =====================================================

-- Función para métricas de facturación
CREATE OR REPLACE FUNCTION get_metricas_facturacion(
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resultado JSON;
BEGIN
  SELECT json_build_object(
    'total_facturado', COALESCE(SUM(total), 0),
    'num_facturas', COUNT(*),
    'ticket_medio', COALESCE(ROUND(AVG(total)::numeric, 2), 0),
    'base_imponible', COALESCE(SUM(base_imponible), 0),
    'iva', COALESCE(SUM(importe_iva), 0)
  ) INTO resultado
  FROM facturas
  WHERE fecha_factura BETWEEN p_fecha_inicio AND p_fecha_fin
    AND estado IN ('emitida', 'pagada');
  
  RETURN resultado;
END;
$$;

-- Función para métricas de cobro
CREATE OR REPLACE FUNCTION get_metricas_cobro(
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resultado JSON;
BEGIN
  SELECT json_build_object(
    'total_cobrado', COALESCE(SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END), 0),
    'total_pendiente', COALESCE(SUM(CASE WHEN estado = 'emitida' THEN total ELSE 0 END), 0),
    'num_cobradas', COUNT(*) FILTER (WHERE estado = 'pagada'),
    'num_pendientes', COUNT(*) FILTER (WHERE estado = 'emitida'),
    'tasa_cobro', COALESCE(ROUND(
      COUNT(*) FILTER (WHERE estado = 'pagada')::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100, 
      2
    ), 0)
  ) INTO resultado
  FROM facturas
  WHERE fecha_factura BETWEEN p_fecha_inicio AND p_fecha_fin;
  
  RETURN resultado;
END;
$$;

-- Función para métricas de consumo
CREATE OR REPLACE FUNCTION get_metricas_consumo(
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  resultado JSON;
BEGIN
  SELECT json_build_object(
    'total_lecturas', COUNT(*),
    'consumo_total', COALESCE(SUM(consumo), 0),
    'consumo_medio', COALESCE(ROUND(AVG(consumo)::numeric, 2), 0),
    'contadores_con_lectura', COUNT(DISTINCT contador_id)
  ) INTO resultado
  FROM lecturas
  WHERE fecha_lectura BETWEEN p_fecha_inicio AND p_fecha_fin;
  
  RETURN resultado;
END;
$$;

-- Función para generar referencia de remesa
CREATE OR REPLACE FUNCTION generar_referencia_remesa(p_prefijo TEXT DEFAULT 'A360-REM')
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fecha TEXT;
  v_count INTEGER;
  v_referencia TEXT;
BEGIN
  v_fecha := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM remesas
  WHERE referencia LIKE p_prefijo || '-' || v_fecha || '%';
  
  v_referencia := p_prefijo || '-' || v_fecha || '-' || LPAD(v_count::TEXT, 3, '0');
  
  RETURN v_referencia;
END;
$$;

-- Función para generar referencia de mandato
CREATE OR REPLACE FUNCTION generar_referencia_mandato(p_cliente_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefijo TEXT;
  v_count INTEGER;
  v_referencia TEXT;
BEGIN
  SELECT prefijo_mandato INTO v_prefijo
  FROM configuracion_sepa
  LIMIT 1;
  
  v_prefijo := COALESCE(v_prefijo, 'A360-CLI');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM mandatos_sepa;
  
  v_referencia := v_prefijo || '-' || LPAD(v_count::TEXT, 6, '0');
  
  RETURN v_referencia;
END;
$$;

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE configuracion_sepa IS 'Configuración del acreedor para remesas SEPA';
COMMENT ON TABLE mandatos_sepa IS 'Mandatos SEPA firmados por los clientes';
COMMENT ON TABLE remesas IS 'Remesas bancarias generadas';
COMMENT ON TABLE remesas_recibos IS 'Recibos individuales incluidos en cada remesa';

COMMENT ON VIEW v_reporte_consumos_vivienda IS 'Vista para reportes de consumos por vivienda';
COMMENT ON VIEW v_reporte_facturacion_comunidad IS 'Vista para reportes de facturación por comunidad';
COMMENT ON VIEW v_reporte_morosidad IS 'Vista para reportes de morosidad';
COMMENT ON VIEW v_facturas_pendientes_remesa IS 'Facturas con domiciliación pendientes de incluir en remesa';

