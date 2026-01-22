-- =====================================================
-- Migración 015: Configuración del Contador de Facturas
-- Permite actualizar el contador de facturas desde la UI
-- Incluye validaciones de seguridad
-- Fecha: Enero 2026
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_secuencia_facturas(
  p_nuevo_numero INTEGER
)
RETURNS TABLE (
  numero_anterior INTEGER,
  numero_nuevo INTEGER,
  secuencia_actualizada BIGINT
) AS $$
DECLARE
  v_config JSONB;
  v_numero_actual INTEGER;
  v_max_factura INTEGER;
  v_nueva_secuencia BIGINT;
BEGIN
  -- Validación 1: El número debe ser positivo
  IF p_nuevo_numero < 1 THEN
    RAISE EXCEPTION 'El número de factura debe ser mayor a 0';
  END IF;
  
  -- Obtener configuración actual
  SELECT valor INTO v_config
  FROM configuracion
  WHERE clave = 'serie_facturacion';
  
  v_numero_actual := (v_config->>'ultimo_numero')::INTEGER;
  
  -- Obtener el máximo número real de las facturas emitidas
  SELECT COALESCE(MAX(numero), 0) INTO v_max_factura FROM facturas;
  
  -- Validación 2: Advertir si el nuevo número es menor que facturas existentes
  IF p_nuevo_numero <= v_max_factura THEN
    RAISE EXCEPTION 'El nuevo número (%) debe ser mayor que el último número de factura emitida (%). Esto podría crear duplicados.', 
      p_nuevo_numero, v_max_factura;
  END IF;
  
  -- Validación 3: Advertir si hay un salto muy grande (más de 1 millón)
  IF p_nuevo_numero - v_max_factura > 1000000 THEN
    RAISE EXCEPTION 'El salto entre números es muy grande (%). Por seguridad, no se permite un salto superior a 1.000.000', 
      p_nuevo_numero - v_max_factura;
  END IF;
  
  -- Actualizar la configuración
  UPDATE configuracion
  SET valor = jsonb_set(valor, '{ultimo_numero}', to_jsonb(p_nuevo_numero)),
      updated_at = now()
  WHERE clave = 'serie_facturacion';
  
  -- Ajustar la secuencia (setval con false = próximo valor será p_nuevo_numero + 1)
  v_nueva_secuencia := setval('seq_factura_numero', p_nuevo_numero + 1, false);
  
  -- Retornar resultado
  RETURN QUERY SELECT v_numero_actual, p_nuevo_numero, v_nueva_secuencia;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION actualizar_secuencia_facturas IS 
  'Actualiza el contador de facturas y ajusta la secuencia. Incluye validaciones de seguridad.';
