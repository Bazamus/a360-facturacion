-- =====================================================
-- Migración 008: Eliminar serie del número de factura
-- Cambiar formato de "2/230371985" a "230371985"
-- =====================================================

-- Paso 1: Eliminar la columna computed numero_completo
ALTER TABLE facturas DROP COLUMN numero_completo;

-- Paso 2: Recrear numero_completo sin el prefijo serie
ALTER TABLE facturas ADD COLUMN numero_completo TEXT
GENERATED ALWAYS AS (
  CASE
    WHEN numero IS NOT NULL
    THEN numero::TEXT
    ELSE NULL
  END
) STORED;

-- Paso 3: Actualizar la función emitir_factura para retornar solo el número
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

  -- Retornar solo el número (sin serie)
  RETURN QUERY
  SELECT v_numero, v_numero::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Paso 4: Comentario explicativo
COMMENT ON COLUMN facturas.numero_completo IS 'Número de factura sin prefijo de serie (ej: 230371985)';
