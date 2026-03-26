-- =====================================================
-- Migración 051: Sistema de Facturas de Abono
-- Sistema de Facturación A360
-- =====================================================

-- 1. Nuevos estados en el enum estado_factura
ALTER TYPE estado_factura ADD VALUE IF NOT EXISTS 'abonada_completa' AFTER 'pagada';
ALTER TYPE estado_factura ADD VALUE IF NOT EXISTS 'abonada_parcial'  AFTER 'abonada_completa';

-- 2. Columna tipo: distingue facturas de cargo (normal) vs abono (nota de crédito)
ALTER TABLE facturas
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'cargo'
  CHECK (tipo IN ('cargo', 'abono'));

-- Índice para filtrar rápidamente por tipo
CREATE INDEX IF NOT EXISTS idx_facturas_tipo ON facturas(tipo);

-- =====================================================
-- Función: crear_factura_abono
-- Crea una factura de abono (total o parcial) a partir
-- de una factura de cargo existente.
--
-- Parámetros:
--   p_factura_id  UUID      Factura original a abonar
--   p_lineas_ids  UUID[]    IDs de facturas_lineas a incluir.
--                           NULL o array vacío = abono total (todas las líneas).
--
-- Retorna: UUID de la factura de abono creada
-- =====================================================
CREATE OR REPLACE FUNCTION crear_factura_abono(
  p_factura_id UUID,
  p_lineas_ids UUID[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_factura         facturas%ROWTYPE;
  v_abono_id        UUID;
  v_lineas_abono    UUID[];
  v_total_lineas    INTEGER;
  v_lineas_en_abono INTEGER;
  v_base            DECIMAL(10,2);
  v_iva             DECIMAL(10,2);
  v_total           DECIMAL(10,2);
  v_es_total        BOOLEAN;
BEGIN
  -- ── 1. Obtener y validar la factura original ──────────────────────────────
  SELECT * INTO v_factura FROM facturas WHERE id = p_factura_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura no encontrada: %', p_factura_id;
  END IF;

  IF v_factura.tipo != 'cargo' THEN
    RAISE EXCEPTION 'Solo se pueden abonar facturas de cargo';
  END IF;

  IF v_factura.estado NOT IN ('emitida', 'pagada') THEN
    RAISE EXCEPTION 'Solo se pueden abonar facturas en estado emitida o pagada. Estado actual: %', v_factura.estado;
  END IF;

  IF v_factura.factura_rectificada_id IS NOT NULL THEN
    RAISE EXCEPTION 'Esta factura ya tiene un abono asociado';
  END IF;

  -- ── 2. Resolver qué líneas incluir ───────────────────────────────────────
  -- Si p_lineas_ids es NULL o vacío → todas las líneas de la factura
  IF p_lineas_ids IS NULL OR array_length(p_lineas_ids, 1) IS NULL THEN
    SELECT ARRAY(
      SELECT id FROM facturas_lineas WHERE factura_id = p_factura_id
    ) INTO v_lineas_abono;
  ELSE
    -- Validar que las líneas pertenecen a esta factura
    SELECT ARRAY(
      SELECT id FROM facturas_lineas
      WHERE id = ANY(p_lineas_ids) AND factura_id = p_factura_id
    ) INTO v_lineas_abono;

    IF array_length(v_lineas_abono, 1) = 0 THEN
      RAISE EXCEPTION 'Ninguna de las líneas indicadas pertenece a esta factura';
    END IF;
  END IF;

  -- ── 3. Determinar si es abono total o parcial ─────────────────────────────
  SELECT COUNT(*) INTO v_total_lineas    FROM facturas_lineas WHERE factura_id = p_factura_id;
  SELECT COUNT(*) INTO v_lineas_en_abono FROM facturas_lineas WHERE id = ANY(v_lineas_abono);

  v_es_total := (v_lineas_en_abono = v_total_lineas);

  -- ── 4. Calcular importes del abono a partir de las líneas seleccionadas ───
  SELECT
    ROUND(SUM(subtotal) / (1 + v_factura.porcentaje_iva / 100.0), 2),
    ROUND(SUM(subtotal) - ROUND(SUM(subtotal) / (1 + v_factura.porcentaje_iva / 100.0), 2), 2),
    ROUND(SUM(subtotal), 2)
  INTO v_base, v_iva, v_total
  FROM facturas_lineas
  WHERE id = ANY(v_lineas_abono);

  -- ── 5. Crear la factura de abono como borrador ────────────────────────────
  INSERT INTO facturas (
    serie, cliente_id, comunidad_id, ubicacion_id, contador_id,
    periodo_inicio, periodo_fin, es_periodo_parcial, dias_periodo,
    fecha_factura, fecha_vencimiento,
    base_imponible, porcentaje_iva, importe_iva, total,
    estado, tipo, metodo_pago,
    cliente_nombre, cliente_nif, cliente_direccion,
    cliente_cp, cliente_ciudad, cliente_provincia,
    cliente_email, cliente_iban,
    ubicacion_direccion,
    cliente_estado_codigo, cliente_estado_nombre, cliente_estado_color,
    created_by
  ) VALUES (
    v_factura.serie,
    v_factura.cliente_id, v_factura.comunidad_id,
    v_factura.ubicacion_id, v_factura.contador_id,
    v_factura.periodo_inicio, v_factura.periodo_fin,
    v_factura.es_periodo_parcial, v_factura.dias_periodo,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '15 days',
    v_base, v_factura.porcentaje_iva, v_iva, v_total,
    'borrador', 'abono', v_factura.metodo_pago,
    v_factura.cliente_nombre, v_factura.cliente_nif, v_factura.cliente_direccion,
    v_factura.cliente_cp, v_factura.cliente_ciudad, v_factura.cliente_provincia,
    v_factura.cliente_email, v_factura.cliente_iban,
    v_factura.ubicacion_direccion,
    v_factura.cliente_estado_codigo, v_factura.cliente_estado_nombre, v_factura.cliente_estado_color,
    v_factura.created_by
  )
  RETURNING id INTO v_abono_id;

  -- ── 6. Copiar las líneas seleccionadas (sin lectura_id) ───────────────────
  INSERT INTO facturas_lineas (
    factura_id, lectura_id,
    concepto_id, concepto_codigo, concepto_nombre, unidad_medida,
    es_termino_fijo, contador_numero_serie,
    lectura_anterior, fecha_lectura_anterior,
    lectura_actual, fecha_lectura_actual, consumo,
    cantidad, precio_unitario,
    descuento_porcentaje, descuento_importe,
    subtotal, orden
  )
  SELECT
    v_abono_id, NULL,            -- lectura_id = NULL (el abono no reclama lecturas)
    concepto_id, concepto_codigo, concepto_nombre, unidad_medida,
    es_termino_fijo, contador_numero_serie,
    lectura_anterior, fecha_lectura_anterior,
    lectura_actual, fecha_lectura_actual, consumo,
    cantidad, precio_unitario,
    descuento_porcentaje, descuento_importe,
    subtotal, orden
  FROM facturas_lineas
  WHERE id = ANY(v_lineas_abono)
  ORDER BY orden;

  -- ── 7. Emitir el abono (asigna número correlativo de la misma secuencia) ──
  -- emitir_factura no marcará lecturas porque lectura_id = NULL en todas las líneas
  PERFORM emitir_factura(v_abono_id);

  -- ── 8. Enlace bidireccional abono ↔ original ─────────────────────────────
  UPDATE facturas SET factura_rectificada_id = p_factura_id WHERE id = v_abono_id;

  UPDATE facturas
  SET
    factura_rectificada_id = v_abono_id,
    estado = CASE WHEN v_es_total THEN 'abonada_completa'::estado_factura
                  ELSE               'abonada_parcial'::estado_factura END,
    updated_at = now()
  WHERE id = p_factura_id;

  -- ── 9. Liberar lecturas de las líneas abonadas ────────────────────────────
  UPDATE lecturas
  SET facturada = false,
      factura_id = NULL,
      updated_at = now()
  WHERE id IN (
    SELECT lectura_id
    FROM facturas_lineas
    WHERE id = ANY(v_lineas_abono) AND lectura_id IS NOT NULL
  );

  RETURN v_abono_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: cualquier usuario autenticado puede llamar a la función
GRANT EXECUTE ON FUNCTION crear_factura_abono(UUID, UUID[]) TO authenticated;
