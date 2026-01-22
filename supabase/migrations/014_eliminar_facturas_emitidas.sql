-- =====================================================
-- Migración 014: Función para eliminar facturas emitidas
-- Permite eliminar facturas emitidas y ajustar secuencia
-- Solo elimina si son las últimas de la serie
-- Fecha: Enero 2026
-- =====================================================

CREATE OR REPLACE FUNCTION eliminar_facturas_emitidas(
  p_factura_ids UUID[]
)
RETURNS TABLE (
  eliminadas INTEGER,
  nuevo_numero_secuencia INTEGER
) AS $$
DECLARE
  v_numeros INTEGER[];
  v_max_global INTEGER;
  v_min_eliminar INTEGER;
  v_max_eliminar INTEGER;
  v_count INTEGER;
  v_nuevo_max INTEGER;
  v_remesas_count INTEGER;
BEGIN
  -- Validar que hay facturas
  IF array_length(p_factura_ids, 1) IS NULL OR array_length(p_factura_ids, 1) = 0 THEN
    RAISE EXCEPTION 'Debe proporcionar al menos una factura';
  END IF;
  
  -- Obtener números de las facturas (bloquear para evitar race conditions)
  SELECT array_agg(numero ORDER BY numero DESC)
  INTO v_numeros
  FROM facturas
  WHERE id = ANY(p_factura_ids)
  AND numero IS NOT NULL
  FOR UPDATE;
  
  -- Validar que todas tienen número (no son borradores)
  IF array_length(v_numeros, 1) != array_length(p_factura_ids, 1) THEN
    RAISE EXCEPTION 'Solo se pueden eliminar facturas emitidas (con número asignado)';
  END IF;
  
  -- Validar que no hay borradores
  IF EXISTS (
    SELECT 1 FROM facturas 
    WHERE id = ANY(p_factura_ids) 
    AND estado = 'borrador'
  ) THEN
    RAISE EXCEPTION 'No se pueden eliminar facturas en estado borrador. Use la función de eliminar borradores';
  END IF;
  
  -- Validar que no están en remesas procesadas
  SELECT COUNT(*) INTO v_remesas_count
  FROM remesas_recibos rr
  JOIN remesas r ON r.id = rr.remesa_id
  WHERE rr.factura_id = ANY(p_factura_ids)
  AND r.estado != 'borrador';
  
  IF v_remesas_count > 0 THEN
    RAISE EXCEPTION 'No se pueden eliminar facturas que están en remesas procesadas';
  END IF;
  
  -- Obtener rango de facturas a eliminar
  v_min_eliminar := v_numeros[array_length(v_numeros, 1)];
  v_max_eliminar := v_numeros[1];
  
  -- Obtener número máximo global
  SELECT MAX(numero) INTO v_max_global FROM facturas;
  
  -- Validar que son las últimas (consecutivas desde el máximo)
  IF v_max_eliminar != v_max_global THEN
    RAISE EXCEPTION 'Solo se pueden eliminar las últimas facturas de la serie. Última factura: %, intentando eliminar hasta: %',
      v_max_global, v_max_eliminar;
  END IF;
  
  -- Validar que son consecutivas
  IF v_max_eliminar - v_min_eliminar + 1 != array_length(v_numeros, 1) THEN
    RAISE EXCEPTION 'Las facturas deben ser consecutivas';
  END IF;
  
  -- Liberar lecturas asociadas
  UPDATE lecturas
  SET facturada = false,
      factura_id = NULL,
      updated_at = now()
  WHERE factura_id = ANY(p_factura_ids);
  
  -- Eliminar facturas (CASCADE elimina líneas, histórico, envíos)
  DELETE FROM facturas WHERE id = ANY(p_factura_ids);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Calcular nuevo máximo y ajustar secuencia
  SELECT COALESCE(MAX(numero), 0) INTO v_nuevo_max FROM facturas;
  PERFORM setval('seq_factura_numero', v_nuevo_max + 1, false);
  
  -- Retornar resultado
  RETURN QUERY SELECT v_count, v_nuevo_max + 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION eliminar_facturas_emitidas IS 
  'Elimina facturas emitidas de forma permanente. Solo permite eliminar las últimas facturas de la serie para mantener secuencialidad.';
