-- =====================================================
-- Migración 004: Sistema de Facturación
-- Sistema de Facturación de Gestión Energética A360
-- Fase 3: Motor de Facturación y PDFs
-- Fecha: Diciembre 2025
-- =====================================================

-- =====================================================
-- TIPOS ENUM
-- =====================================================

CREATE TYPE estado_factura AS ENUM (
  'borrador',       -- Factura generada pero no confirmada
  'emitida',        -- Factura confirmada con número asignado
  'pagada',         -- Factura cobrada
  'anulada'         -- Factura cancelada
);

CREATE TYPE metodo_pago AS ENUM (
  'domiciliacion',  -- Recibo SEPA
  'transferencia',  -- Transferencia bancaria
  'efectivo',       -- Pago en efectivo
  'otro'            -- Otros métodos
);

-- =====================================================
-- Tabla: facturas
-- Registro principal de facturas emitidas
-- =====================================================

CREATE TABLE facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Numeración
  serie INTEGER NOT NULL DEFAULT 2,
  numero INTEGER, -- NULL mientras es borrador, se asigna al emitir
  numero_completo TEXT GENERATED ALWAYS AS (
    CASE WHEN numero IS NOT NULL 
      THEN serie::TEXT || '/' || numero::TEXT 
      ELSE NULL 
    END
  ) STORED,
  
  -- Referencias
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  comunidad_id UUID NOT NULL REFERENCES comunidades(id),
  ubicacion_id UUID NOT NULL REFERENCES ubicaciones(id),
  contador_id UUID NOT NULL REFERENCES contadores(id),
  
  -- Periodo de facturación
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  es_periodo_parcial BOOLEAN NOT NULL DEFAULT false,
  dias_periodo INTEGER NOT NULL,
  
  -- Fechas
  fecha_factura DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  
  -- Importes
  base_imponible DECIMAL(10,2) NOT NULL DEFAULT 0,
  porcentaje_iva DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  importe_iva DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Pago
  estado estado_factura NOT NULL DEFAULT 'borrador',
  metodo_pago metodo_pago DEFAULT 'domiciliacion',
  fecha_pago DATE,
  
  -- Datos del cliente (snapshot al momento de facturar)
  cliente_nombre TEXT NOT NULL,
  cliente_nif TEXT NOT NULL,
  cliente_direccion TEXT NOT NULL,
  cliente_cp TEXT,
  cliente_ciudad TEXT,
  cliente_provincia TEXT,
  cliente_email TEXT,
  cliente_iban TEXT,
  
  -- Datos de la ubicación (snapshot)
  ubicacion_direccion TEXT NOT NULL,
  
  -- PDF
  pdf_generado BOOLEAN NOT NULL DEFAULT false,
  pdf_url TEXT,
  
  -- Factura rectificativa (si aplica)
  factura_rectificada_id UUID REFERENCES facturas(id),
  motivo_anulacion TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE UNIQUE INDEX idx_facturas_numero ON facturas(serie, numero) WHERE numero IS NOT NULL;
CREATE INDEX idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX idx_facturas_comunidad ON facturas(comunidad_id);
CREATE INDEX idx_facturas_estado ON facturas(estado);
CREATE INDEX idx_facturas_fecha ON facturas(fecha_factura DESC);
CREATE INDEX idx_facturas_periodo ON facturas(periodo_inicio, periodo_fin);

CREATE TRIGGER facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: facturas_lineas
-- Líneas de detalle de cada factura
-- =====================================================

CREATE TABLE facturas_lineas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  
  -- Referencia a lectura (si aplica)
  lectura_id UUID REFERENCES lecturas(id),
  
  -- Concepto
  concepto_id UUID NOT NULL REFERENCES conceptos(id),
  concepto_codigo TEXT NOT NULL,
  concepto_nombre TEXT NOT NULL,
  unidad_medida TEXT NOT NULL,
  es_termino_fijo BOOLEAN NOT NULL DEFAULT false,
  
  -- Datos de lectura (para conceptos variables)
  contador_numero_serie TEXT,
  lectura_anterior DECIMAL(12,4),
  fecha_lectura_anterior DATE,
  lectura_actual DECIMAL(12,4),
  fecha_lectura_actual DATE,
  consumo DECIMAL(12,4),
  
  -- Cálculo
  cantidad DECIMAL(12,4) NOT NULL,
  precio_unitario DECIMAL(10,4) NOT NULL,
  descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
  descuento_importe DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  
  -- Orden de visualización
  orden INTEGER NOT NULL DEFAULT 0,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_facturas_lineas_factura ON facturas_lineas(factura_id);
CREATE INDEX idx_facturas_lineas_lectura ON facturas_lineas(lectura_id);

-- =====================================================
-- Tabla: facturas_consumo_historico
-- Datos para el gráfico de evolución de consumo en PDF
-- =====================================================

CREATE TABLE facturas_consumo_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  
  -- Datos del periodo
  periodo DATE NOT NULL,
  concepto_id UUID NOT NULL REFERENCES conceptos(id),
  concepto_codigo TEXT NOT NULL,
  consumo DECIMAL(12,4) NOT NULL,
  
  -- Orden
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_facturas_consumo_historico_factura 
  ON facturas_consumo_historico(factura_id);

-- =====================================================
-- Secuencia de Numeración de Facturas
-- Comienza en 230371945 según requisitos
-- =====================================================

CREATE SEQUENCE seq_factura_numero START WITH 230371945;

-- =====================================================
-- Función: get_siguiente_numero_factura
-- Obtiene el siguiente número de factura de forma atómica
-- =====================================================

CREATE OR REPLACE FUNCTION get_siguiente_numero_factura()
RETURNS INTEGER AS $$
DECLARE
  v_numero INTEGER;
BEGIN
  SELECT nextval('seq_factura_numero') INTO v_numero;
  RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Función: emitir_factura
-- Emite una factura asignando número secuencial
-- =====================================================

CREATE OR REPLACE FUNCTION emitir_factura(p_factura_id UUID)
RETURNS TABLE (numero INTEGER, numero_completo TEXT) AS $$
DECLARE
  v_numero INTEGER;
  v_estado estado_factura;
BEGIN
  -- Verificar estado actual
  SELECT estado INTO v_estado FROM facturas WHERE id = p_factura_id;
  
  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  
  IF v_estado != 'borrador' THEN
    RAISE EXCEPTION 'Solo se pueden emitir facturas en estado borrador. Estado actual: %', v_estado;
  END IF;
  
  -- Obtener siguiente número
  v_numero := get_siguiente_numero_factura();
  
  -- Actualizar factura
  UPDATE facturas
  SET numero = v_numero,
      estado = 'emitida',
      fecha_factura = CURRENT_DATE,
      updated_at = now()
  WHERE id = p_factura_id;
  
  -- Marcar lecturas como facturadas
  UPDATE lecturas
  SET facturada = true,
      factura_id = p_factura_id,
      updated_at = now()
  WHERE id IN (
    SELECT lectura_id FROM facturas_lineas 
    WHERE factura_id = p_factura_id AND lectura_id IS NOT NULL
  );
  
  RETURN QUERY
  SELECT v_numero, '2/' || v_numero::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Función: anular_factura
-- Anula una factura emitida con motivo
-- =====================================================

CREATE OR REPLACE FUNCTION anular_factura(
  p_factura_id UUID, 
  p_motivo TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_estado estado_factura;
BEGIN
  SELECT estado INTO v_estado FROM facturas WHERE id = p_factura_id;
  
  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  
  IF v_estado NOT IN ('emitida', 'pagada') THEN
    RAISE EXCEPTION 'Solo se pueden anular facturas emitidas o pagadas';
  END IF;
  
  -- Anular factura
  UPDATE facturas
  SET estado = 'anulada',
      motivo_anulacion = p_motivo,
      updated_at = now()
  WHERE id = p_factura_id;
  
  -- Desmarcar lecturas como facturadas (permitir refacturar)
  UPDATE lecturas
  SET facturada = false,
      factura_id = NULL,
      updated_at = now()
  WHERE factura_id = p_factura_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Función: marcar_factura_pagada
-- Marca una factura como pagada
-- =====================================================

CREATE OR REPLACE FUNCTION marcar_factura_pagada(
  p_factura_id UUID,
  p_fecha_pago DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_estado estado_factura;
BEGIN
  SELECT estado INTO v_estado FROM facturas WHERE id = p_factura_id;
  
  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Factura no encontrada';
  END IF;
  
  IF v_estado != 'emitida' THEN
    RAISE EXCEPTION 'Solo se pueden marcar como pagadas facturas emitidas';
  END IF;
  
  UPDATE facturas
  SET estado = 'pagada',
      fecha_pago = p_fecha_pago,
      updated_at = now()
  WHERE id = p_factura_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Función: get_historico_consumo
-- Obtiene histórico de consumo para gráfico
-- =====================================================

CREATE OR REPLACE FUNCTION get_historico_consumo(
  p_contador_id UUID,
  p_concepto_id UUID,
  p_meses INTEGER DEFAULT 6
)
RETURNS TABLE (
  periodo DATE,
  concepto_codigo TEXT,
  consumo DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('month', l.fecha_lectura)::DATE as periodo,
    c.codigo as concepto_codigo,
    SUM(l.consumo)::DECIMAL as consumo
  FROM lecturas l
  JOIN conceptos c ON c.id = l.concepto_id
  WHERE l.contador_id = p_contador_id
    AND l.concepto_id = p_concepto_id
    AND l.fecha_lectura >= date_trunc('month', CURRENT_DATE) - (p_meses || ' months')::INTERVAL
  GROUP BY date_trunc('month', l.fecha_lectura), c.codigo
  ORDER BY periodo;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Vista: v_facturas_resumen
-- Resumen de facturas con datos relacionados
-- =====================================================

CREATE VIEW v_facturas_resumen AS
SELECT 
  f.id,
  f.serie,
  f.numero,
  f.numero_completo,
  f.fecha_factura,
  f.fecha_vencimiento,
  f.periodo_inicio,
  f.periodo_fin,
  f.es_periodo_parcial,
  f.dias_periodo,
  f.base_imponible,
  f.importe_iva,
  f.total,
  f.estado,
  f.metodo_pago,
  f.fecha_pago,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_nif,
  f.cliente_email,
  f.comunidad_id,
  com.nombre as comunidad_nombre,
  com.codigo as comunidad_codigo,
  f.ubicacion_id,
  f.ubicacion_direccion,
  f.contador_id,
  cont.numero_serie as contador_numero_serie,
  f.pdf_generado,
  f.pdf_url,
  f.created_at,
  (SELECT COUNT(*) FROM facturas_lineas WHERE factura_id = f.id) as num_lineas
FROM facturas f
JOIN comunidades com ON com.id = f.comunidad_id
JOIN contadores cont ON cont.id = f.contador_id;

-- =====================================================
-- Vista: v_lecturas_pendientes_facturar
-- Lecturas que aún no han sido facturadas
-- =====================================================

CREATE VIEW v_lecturas_pendientes_facturar AS
SELECT 
  l.id,
  l.contador_id,
  l.concepto_id,
  l.cliente_id,
  l.lectura_valor,
  l.lectura_anterior,
  l.fecha_lectura,
  l.fecha_lectura_anterior,
  l.consumo,
  p.precio_unitario,
  COALESCE(l.consumo * p.precio_unitario, 0) as importe_estimado,
  cont.numero_serie as contador_numero_serie,
  conc.codigo as concepto_codigo,
  conc.nombre as concepto_nombre,
  conc.unidad_medida,
  conc.es_termino_fijo,
  c.id as cliente_actual_id,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente_nombre,
  c.nif as cliente_nif,
  u.id as ubicacion_id,
  u.nombre as ubicacion_nombre,
  a.id as agrupacion_id,
  a.nombre as agrupacion_nombre,
  com.id as comunidad_id,
  com.nombre as comunidad_nombre,
  com.codigo as comunidad_codigo
FROM lecturas l
JOIN contadores cont ON cont.id = l.contador_id
JOIN conceptos conc ON conc.id = l.concepto_id
LEFT JOIN clientes c ON c.id = l.cliente_id
JOIN ubicaciones u ON u.id = cont.ubicacion_id
JOIN agrupaciones a ON a.id = u.agrupacion_id
JOIN comunidades com ON com.id = a.comunidad_id
LEFT JOIN precios p ON p.comunidad_id = com.id 
  AND p.concepto_id = l.concepto_id 
  AND p.activo = true 
  AND p.fecha_fin IS NULL
WHERE l.facturada = false;

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_consumo_historico ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura
CREATE POLICY "Usuarios autenticados pueden leer facturas" ON facturas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer facturas_lineas" ON facturas_lineas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer facturas_consumo_historico" ON facturas_consumo_historico
  FOR SELECT TO authenticated USING (true);

-- Políticas de modificación
CREATE POLICY "Usuarios autenticados pueden modificar facturas" ON facturas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar facturas_lineas" ON facturas_lineas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar facturas_consumo_historico" ON facturas_consumo_historico
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- Comentarios de tablas
-- =====================================================

COMMENT ON TABLE facturas IS 'Facturas emitidas a clientes';
COMMENT ON TABLE facturas_lineas IS 'Líneas de detalle de cada factura';
COMMENT ON TABLE facturas_consumo_historico IS 'Histórico de consumo para gráficos en PDF';
COMMENT ON FUNCTION emitir_factura IS 'Emite una factura en borrador asignando número secuencial';
COMMENT ON FUNCTION anular_factura IS 'Anula una factura emitida';
COMMENT ON FUNCTION marcar_factura_pagada IS 'Marca una factura como pagada';
COMMENT ON FUNCTION get_historico_consumo IS 'Obtiene histórico de consumo para gráficos';

