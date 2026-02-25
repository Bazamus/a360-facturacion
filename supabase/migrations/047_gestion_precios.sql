-- ============================================================
-- 047: Gestión de Precios
-- Tablas, RPCs y políticas para gestión centralizada de precios
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Nueva columna en comunidades: referencia energética
-- ────────────────────────────────────────────────────────────

ALTER TABLE comunidades
  ADD COLUMN IF NOT EXISTS referencia_energia TEXT DEFAULT NULL
    CHECK (referencia_energia IS NULL OR referencia_energia IN ('P6_NATURGY', 'MIBGAS'));

COMMENT ON COLUMN comunidades.referencia_energia
  IS 'Referencia de mercado energético usada para factor de conversión (P6 NATURGY o MIBGAS)';

-- ────────────────────────────────────────────────────────────
-- 2. Tabla: precios_referencias_mercado
--    Valores mensuales de P6 NATURGY y MIBGAS
-- ────────────────────────────────────────────────────────────

CREATE TABLE precios_referencias_mercado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('P6_NATURGY', 'MIBGAS')),
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor DECIMAL(12,6) NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tipo, anio, mes)
);

COMMENT ON TABLE precios_referencias_mercado
  IS 'Valores mensuales de índices de referencia energética (P6 NATURGY €/kWh, MIBGAS €/MWh)';

-- RLS
ALTER TABLE precios_referencias_mercado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer referencias"
  ON precios_referencias_mercado FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden modificar referencias"
  ON precios_referencias_mercado FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 3. Tabla: descuentos
--    Descuentos puntuales por concepto+comunidad
-- ────────────────────────────────────────────────────────────

CREATE TABLE descuentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunidad_id UUID NOT NULL REFERENCES comunidades(id) ON DELETE CASCADE,
  concepto_id UUID NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  porcentaje DECIMAL(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
  motivo TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  aplicado BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT descuentos_fechas_validas CHECK (fecha_fin >= fecha_inicio)
);

COMMENT ON TABLE descuentos
  IS 'Descuentos puntuales por concepto y comunidad con fecha de expiración';

CREATE INDEX idx_descuentos_vigentes
  ON descuentos(comunidad_id, concepto_id)
  WHERE aplicado = false;

CREATE INDEX idx_descuentos_comunidad
  ON descuentos(comunidad_id);

-- RLS
ALTER TABLE descuentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer descuentos"
  ON descuentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden modificar descuentos"
  ON descuentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 4. Tabla: historial_ajustes_precios
--    Log de auditoría de operaciones de ajuste masivo
-- ────────────────────────────────────────────────────────────

CREATE TABLE historial_ajustes_precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_ajuste TEXT NOT NULL CHECK (tipo_ajuste IN ('factor_conversion', 'ipc', 'manual', 'descuento')),
  referencia TEXT,
  valor_anterior DECIMAL(12,6),
  valor_actual DECIMAL(12,6),
  factor DECIMAL(12,8),
  porcentaje_ipc DECIMAL(5,2),
  conceptos_aplicados TEXT[],
  comunidades_aplicadas UUID[],
  total_precios_actualizados INTEGER,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE historial_ajustes_precios
  IS 'Auditoría de todas las operaciones de ajuste masivo de precios';

CREATE INDEX idx_historial_ajustes_fecha
  ON historial_ajustes_precios(created_at DESC);

-- RLS
ALTER TABLE historial_ajustes_precios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer historial"
  ON historial_ajustes_precios FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar historial"
  ON historial_ajustes_precios FOR INSERT TO authenticated WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
-- 5. RPC: aplicar_factor_precios
--    Aplica factor de conversión/IPC a múltiples comunidades
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION aplicar_factor_precios(
  p_comunidad_ids UUID[],
  p_concepto_codigos TEXT[],
  p_factor DECIMAL(12,8),
  p_tipo_ajuste TEXT,
  p_referencia TEXT DEFAULT NULL,
  p_valor_anterior DECIMAL(12,6) DEFAULT NULL,
  p_valor_actual DECIMAL(12,6) DEFAULT NULL,
  p_porcentaje_ipc DECIMAL(5,2) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_concepto_ids UUID[];
  v_precio RECORD;
  v_nuevo_precio DECIMAL(10,4);
  v_fecha_hoy DATE := CURRENT_DATE;
  v_total_actualizados INTEGER := 0;
BEGIN
  -- Validar factor
  IF p_factor IS NULL OR p_factor <= 0 THEN
    RAISE EXCEPTION 'El factor debe ser mayor que 0';
  END IF;

  -- Obtener IDs de conceptos por código
  SELECT ARRAY_AGG(id) INTO v_concepto_ids
  FROM conceptos
  WHERE codigo = ANY(p_concepto_codigos)
    AND activo = true;

  IF v_concepto_ids IS NULL OR array_length(v_concepto_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No se encontraron conceptos activos para los códigos proporcionados';
  END IF;

  -- Iterar sobre precios activos vigentes
  FOR v_precio IN
    SELECT p.id, p.comunidad_id, p.concepto_id, p.precio_unitario, p.fecha_inicio
    FROM precios p
    WHERE p.comunidad_id = ANY(p_comunidad_ids)
      AND p.concepto_id = ANY(v_concepto_ids)
      AND p.activo = true
      AND p.fecha_fin IS NULL
    FOR UPDATE
  LOOP
    -- Calcular nuevo precio
    v_nuevo_precio := ROUND(v_precio.precio_unitario * p_factor, 4);

    -- Cerrar precio actual
    UPDATE precios
    SET fecha_fin = v_fecha_hoy - INTERVAL '1 day',
        activo = false,
        updated_at = now()
    WHERE id = v_precio.id;

    -- Insertar nuevo precio
    INSERT INTO precios (comunidad_id, concepto_id, precio_unitario, fecha_inicio, activo)
    VALUES (v_precio.comunidad_id, v_precio.concepto_id, v_nuevo_precio, v_fecha_hoy, true);

    v_total_actualizados := v_total_actualizados + 1;
  END LOOP;

  -- Registrar en historial
  INSERT INTO historial_ajustes_precios (
    tipo_ajuste, referencia, valor_anterior, valor_actual,
    factor, porcentaje_ipc, conceptos_aplicados,
    comunidades_aplicadas, total_precios_actualizados, created_by
  ) VALUES (
    p_tipo_ajuste, p_referencia, p_valor_anterior, p_valor_actual,
    p_factor, p_porcentaje_ipc, p_concepto_codigos,
    p_comunidad_ids, v_total_actualizados, auth.uid()
  );

  RETURN jsonb_build_object(
    'precios_actualizados', v_total_actualizados,
    'factor_aplicado', p_factor,
    'conceptos', p_concepto_codigos,
    'comunidades', array_length(p_comunidad_ids, 1)
  );
END;
$$;

COMMENT ON FUNCTION aplicar_factor_precios
  IS 'Aplica factor multiplicador a precios de conceptos en múltiples comunidades de forma atómica';

-- ────────────────────────────────────────────────────────────
-- 6. RPC: get_preview_actualizacion_precios
--    Preview antes de confirmar la actualización
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_preview_actualizacion_precios(
  p_comunidad_ids UUID[],
  p_concepto_codigos TEXT[],
  p_factor DECIMAL(12,8)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_concepto_ids UUID[];
  v_result JSONB;
  v_facturas_afectadas INTEGER;
BEGIN
  -- Obtener IDs de conceptos
  SELECT ARRAY_AGG(id) INTO v_concepto_ids
  FROM conceptos
  WHERE codigo = ANY(p_concepto_codigos)
    AND activo = true;

  IF v_concepto_ids IS NULL THEN
    RETURN jsonb_build_object('precios', '[]'::jsonb, 'facturas_afectadas', 0);
  END IF;

  -- Preview de precios
  SELECT jsonb_agg(
    jsonb_build_object(
      'comunidad_id', p.comunidad_id,
      'comunidad_nombre', c.nombre,
      'comunidad_codigo', c.codigo,
      'concepto_codigo', con.codigo,
      'concepto_nombre', con.nombre,
      'precio_actual', p.precio_unitario,
      'precio_nuevo', ROUND(p.precio_unitario * p_factor, 4),
      'diferencia', ROUND(p.precio_unitario * p_factor - p.precio_unitario, 4)
    )
  ) INTO v_result
  FROM precios p
  JOIN comunidades c ON c.id = p.comunidad_id
  JOIN conceptos con ON con.id = p.concepto_id
  WHERE p.comunidad_id = ANY(p_comunidad_ids)
    AND p.concepto_id = ANY(v_concepto_ids)
    AND p.activo = true
    AND p.fecha_fin IS NULL;

  -- Contar facturas afectables (borrador/emitida no enviadas)
  SELECT COUNT(DISTINCT f.id) INTO v_facturas_afectadas
  FROM facturas f
  JOIN facturas_lineas fl ON fl.factura_id = f.id
  WHERE f.comunidad_id = ANY(p_comunidad_ids)
    AND fl.concepto_id = ANY(v_concepto_ids)
    AND f.estado IN ('borrador', 'emitida')
    AND NOT EXISTS (
      SELECT 1 FROM envios_email ee
      WHERE ee.factura_id = f.id
        AND ee.estado IN ('enviado', 'entregado', 'abierto')
    );

  RETURN jsonb_build_object(
    'precios', COALESCE(v_result, '[]'::jsonb),
    'facturas_afectadas', v_facturas_afectadas
  );
END;
$$;

COMMENT ON FUNCTION get_preview_actualizacion_precios
  IS 'Preview de actualización de precios: muestra tabla old→new y cuenta facturas afectadas';

-- ────────────────────────────────────────────────────────────
-- 7. RPC: recalcular_facturas_con_nuevos_precios
--    Recalcula facturas borrador/emitida no enviadas
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION recalcular_facturas_con_nuevos_precios(
  p_comunidad_ids UUID[],
  p_concepto_codigos TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_concepto_ids UUID[];
  v_factura RECORD;
  v_linea RECORD;
  v_precio_vigente DECIMAL(10,4);
  v_nuevo_subtotal DECIMAL(10,2);
  v_nueva_base DECIMAL(10,2);
  v_nuevo_iva DECIMAL(10,2);
  v_nuevo_total DECIMAL(10,2);
  v_facturas_actualizadas INTEGER := 0;
  v_lineas_actualizadas INTEGER := 0;
BEGIN
  -- Obtener IDs de conceptos
  SELECT ARRAY_AGG(id) INTO v_concepto_ids
  FROM conceptos
  WHERE codigo = ANY(p_concepto_codigos)
    AND activo = true;

  IF v_concepto_ids IS NULL THEN
    RETURN jsonb_build_object('facturas_actualizadas', 0, 'lineas_actualizadas', 0);
  END IF;

  -- Iterar facturas borrador/emitida no enviadas
  FOR v_factura IN
    SELECT f.id, f.comunidad_id, f.porcentaje_iva
    FROM facturas f
    WHERE f.comunidad_id = ANY(p_comunidad_ids)
      AND f.estado IN ('borrador', 'emitida')
      AND NOT EXISTS (
        SELECT 1 FROM envios_email ee
        WHERE ee.factura_id = f.id
          AND ee.estado IN ('enviado', 'entregado', 'abierto')
      )
    FOR UPDATE
  LOOP
    -- Actualizar líneas afectadas
    FOR v_linea IN
      SELECT fl.id, fl.concepto_id, fl.cantidad, fl.descuento_porcentaje
      FROM facturas_lineas fl
      WHERE fl.factura_id = v_factura.id
        AND fl.concepto_id = ANY(v_concepto_ids)
    LOOP
      -- Buscar precio vigente
      SELECT p.precio_unitario INTO v_precio_vigente
      FROM precios p
      WHERE p.comunidad_id = v_factura.comunidad_id
        AND p.concepto_id = v_linea.concepto_id
        AND p.activo = true
        AND p.fecha_fin IS NULL
      LIMIT 1;

      IF v_precio_vigente IS NOT NULL THEN
        -- Calcular nuevo subtotal respetando descuento
        v_nuevo_subtotal := ROUND(
          v_linea.cantidad * v_precio_vigente * (1 - COALESCE(v_linea.descuento_porcentaje, 0) / 100),
          2
        );

        UPDATE facturas_lineas
        SET precio_unitario = v_precio_vigente,
            descuento_importe = CASE
              WHEN COALESCE(v_linea.descuento_porcentaje, 0) > 0
              THEN ROUND(v_linea.cantidad * v_precio_vigente * COALESCE(v_linea.descuento_porcentaje, 0) / 100, 2)
              ELSE 0
            END,
            subtotal = v_nuevo_subtotal
        WHERE id = v_linea.id;

        v_lineas_actualizadas := v_lineas_actualizadas + 1;
      END IF;
    END LOOP;

    -- Recalcular totales de factura
    SELECT COALESCE(SUM(fl.subtotal), 0) INTO v_nueva_base
    FROM facturas_lineas fl
    WHERE fl.factura_id = v_factura.id;

    v_nuevo_iva := ROUND(v_nueva_base * v_factura.porcentaje_iva / 100, 2);
    v_nuevo_total := v_nueva_base + v_nuevo_iva;

    UPDATE facturas
    SET base_imponible = v_nueva_base,
        importe_iva = v_nuevo_iva,
        total = v_nuevo_total,
        pdf_generado = false,
        updated_at = now()
    WHERE id = v_factura.id;

    v_facturas_actualizadas := v_facturas_actualizadas + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'facturas_actualizadas', v_facturas_actualizadas,
    'lineas_actualizadas', v_lineas_actualizadas
  );
END;
$$;

COMMENT ON FUNCTION recalcular_facturas_con_nuevos_precios
  IS 'Recalcula facturas borrador/emitida no enviadas con precios vigentes actuales';

-- ────────────────────────────────────────────────────────────
-- 8. GRANTs para RPCs
-- ────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION aplicar_factor_precios TO authenticated;
GRANT EXECUTE ON FUNCTION get_preview_actualizacion_precios TO authenticated;
GRANT EXECUTE ON FUNCTION recalcular_facturas_con_nuevos_precios TO authenticated;
