-- =====================================================
-- Migración 022: Corregir fecha de emisión al emitir factura
-- Problema: La función emitir_factura sobrescribe fecha_factura con CURRENT_DATE
-- Solución: Mantener la fecha_factura establecida en el borrador
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

  -- Actualizar factura (mantener fecha_factura del borrador)
  UPDATE facturas
  SET numero = v_numero,
      estado = 'emitida',
      -- NO actualizar fecha_factura, se mantiene la del borrador
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

COMMENT ON FUNCTION emitir_factura IS 'Emite una factura en borrador asignando número secuencial. Mantiene la fecha_factura establecida al crear el borrador.';
