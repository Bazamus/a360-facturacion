-- =====================================================
-- Migración 035: Funciones para corregir lectura actual
-- Permite corregir el valor de lectura_actual cuando 
-- la factura asociada está en borrador o no existe factura
-- =====================================================

-- =====================================================
-- Función: validar_correccion_lectura_actual
-- Verifica si la lectura actual puede ser corregida
-- =====================================================

CREATE OR REPLACE FUNCTION validar_correccion_lectura_actual(
  p_contador_concepto_id UUID
)
RETURNS TABLE (
  puede_corregir BOOLEAN,
  razon_bloqueo TEXT,
  lectura_id UUID,
  lectura_valor_actual DECIMAL(12,4),
  lectura_anterior DECIMAL(12,4),
  factura_id UUID,
  estado_factura TEXT
) AS $$
DECLARE
  v_contador_id UUID;
  v_concepto_id UUID;
  v_lectura_id UUID;
  v_lectura_valor DECIMAL(12,4);
  v_lectura_anterior DECIMAL(12,4);
  v_factura_id UUID;
  v_factura_estado TEXT;
BEGIN
  -- Obtener contador_id y concepto_id
  SELECT cc.contador_id, cc.concepto_id
  INTO v_contador_id, v_concepto_id
  FROM contadores_conceptos cc
  WHERE cc.id = p_contador_concepto_id;
  
  IF v_contador_id IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      'Concepto de contador no encontrado'::TEXT,
      NULL::UUID,
      NULL::DECIMAL(12,4),
      NULL::DECIMAL(12,4),
      NULL::UUID,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Buscar la lectura más reciente para este contador/concepto
  SELECT l.id, l.lectura_valor, l.lectura_anterior
  INTO v_lectura_id, v_lectura_valor, v_lectura_anterior
  FROM lecturas l
  WHERE l.contador_id = v_contador_id
    AND l.concepto_id = v_concepto_id
  ORDER BY l.fecha_lectura DESC, l.created_at DESC
  LIMIT 1;
  
  -- Si no hay lecturas, no se puede corregir (no hay qué corregir)
  IF v_lectura_id IS NULL THEN
    RETURN QUERY SELECT 
      false::BOOLEAN,
      'No existen lecturas registradas para este concepto. Use "Editar Lectura Inicial" en su lugar.'::TEXT,
      NULL::UUID,
      NULL::DECIMAL(12,4),
      NULL::DECIMAL(12,4),
      NULL::UUID,
      NULL::TEXT;
    RETURN;
  END IF;
  
  -- Buscar si la lectura tiene factura asociada
  SELECT fl.factura_id INTO v_factura_id
  FROM facturas_lineas fl
  WHERE fl.lectura_id = v_lectura_id;
  
  IF v_factura_id IS NOT NULL THEN
    SELECT f.estado INTO v_factura_estado
    FROM facturas f
    WHERE f.id = v_factura_id;
    
    -- Solo permitir si la factura está en borrador
    IF v_factura_estado != 'borrador' THEN
      RETURN QUERY SELECT 
        false::BOOLEAN,
        ('La factura asociada está en estado "' || v_factura_estado || '". Solo se pueden corregir lecturas con facturas en borrador.')::TEXT,
        v_lectura_id,
        v_lectura_valor,
        v_lectura_anterior,
        v_factura_id,
        v_factura_estado;
      RETURN;
    END IF;
  END IF;
  
  -- Permite corrección
  RETURN QUERY SELECT 
    true::BOOLEAN,
    NULL::TEXT,
    v_lectura_id,
    v_lectura_valor,
    v_lectura_anterior,
    v_factura_id,
    COALESCE(v_factura_estado, 'sin_factura')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Función: corregir_lectura_actual
-- Corrige el valor de lectura actual en cascada
-- =====================================================

CREATE OR REPLACE FUNCTION corregir_lectura_actual(
  p_contador_concepto_id UUID,
  p_nueva_lectura DECIMAL(12,4),
  p_motivo TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_puede_corregir BOOLEAN;
  v_razon_bloqueo TEXT;
  v_lectura_id UUID;
  v_lectura_valor_actual DECIMAL(12,4);
  v_lectura_anterior DECIMAL(12,4);
  v_factura_id UUID;
  v_estado_factura TEXT;
  v_consumo_nuevo DECIMAL(12,4);
  v_precio_unitario DECIMAL(10,4);
  v_subtotal_nuevo DECIMAL(10,2);
  v_base_imponible_nueva DECIMAL(10,2);
  v_porcentaje_iva DECIMAL(5,2);
  v_importe_iva_nuevo DECIMAL(10,2);
  v_total_nuevo DECIMAL(10,2);
  v_historial_id UUID;
BEGIN
  -- Validar si se puede corregir
  SELECT vc.puede_corregir, vc.razon_bloqueo, vc.lectura_id, 
         vc.lectura_valor_actual, vc.lectura_anterior, vc.factura_id, vc.estado_factura
  INTO v_puede_corregir, v_razon_bloqueo, v_lectura_id,
       v_lectura_valor_actual, v_lectura_anterior, v_factura_id, v_estado_factura
  FROM validar_correccion_lectura_actual(p_contador_concepto_id) vc;
  
  IF NOT v_puede_corregir THEN
    RETURN json_build_object(
      'success', false,
      'error', v_razon_bloqueo
    );
  END IF;
  
  -- Calcular nuevo consumo
  v_consumo_nuevo := p_nueva_lectura - COALESCE(v_lectura_anterior, 0);
  
  -- Validar que el consumo no sea negativo
  IF v_consumo_nuevo < 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'La nueva lectura (' || p_nueva_lectura || ') generaría un consumo negativo. Debe ser mayor que la lectura anterior (' || COALESCE(v_lectura_anterior, 0) || ').'
    );
  END IF;
  
  -- =====================================================
  -- 1. Actualizar lectura en tabla lecturas
  -- =====================================================
  
  UPDATE lecturas
  SET lectura_valor = p_nueva_lectura,
      consumo = v_consumo_nuevo,
      updated_at = NOW()
  WHERE id = v_lectura_id;
  
  -- =====================================================
  -- 2. Actualizar contadores_conceptos
  -- =====================================================
  
  UPDATE contadores_conceptos
  SET lectura_actual = p_nueva_lectura,
      updated_at = NOW()
  WHERE id = p_contador_concepto_id;
  
  -- =====================================================
  -- 3. Si hay factura borrador, actualizar líneas y totales
  -- =====================================================
  
  IF v_factura_id IS NOT NULL AND v_estado_factura = 'borrador' THEN
    -- Obtener precio_unitario de la línea
    SELECT fl.precio_unitario INTO v_precio_unitario
    FROM facturas_lineas fl
    WHERE fl.lectura_id = v_lectura_id
      AND fl.factura_id = v_factura_id;
    
    v_subtotal_nuevo := ROUND(v_consumo_nuevo * v_precio_unitario, 2);
    
    -- Actualizar la línea de factura
    UPDATE facturas_lineas
    SET lectura_actual = p_nueva_lectura,
        consumo = v_consumo_nuevo,
        cantidad = v_consumo_nuevo,
        subtotal = v_subtotal_nuevo
    WHERE lectura_id = v_lectura_id
      AND factura_id = v_factura_id;
    
    -- Recalcular totales de la factura
    SELECT SUM(fl.subtotal) INTO v_base_imponible_nueva
    FROM facturas_lineas fl
    WHERE fl.factura_id = v_factura_id;
    
    SELECT f.porcentaje_iva INTO v_porcentaje_iva
    FROM facturas f
    WHERE f.id = v_factura_id;
    
    v_importe_iva_nuevo := ROUND(v_base_imponible_nueva * v_porcentaje_iva / 100, 2);
    v_total_nuevo := v_base_imponible_nueva + v_importe_iva_nuevo;
    
    UPDATE facturas
    SET base_imponible = v_base_imponible_nueva,
        importe_iva = v_importe_iva_nuevo,
        total = v_total_nuevo,
        updated_at = NOW()
    WHERE id = v_factura_id;
  END IF;
  
  -- =====================================================
  -- 4. Registrar en historial de auditoría
  -- =====================================================
  
  INSERT INTO contador_conceptos_historial (
    contador_concepto_id,
    campo_modificado,
    valor_anterior_lectura,
    valor_nuevo_lectura,
    valor_anterior_fecha,
    valor_nuevo_fecha,
    motivo,
    usuario_id,
    tipo_modificacion
  ) VALUES (
    p_contador_concepto_id,
    'lectura_actual',
    v_lectura_valor_actual,
    p_nueva_lectura,
    NULL,
    NULL,
    COALESCE(p_motivo, 'Corrección de lectura actual'),
    auth.uid(),
    'manual'
  ) RETURNING id INTO v_historial_id;
  
  -- =====================================================
  -- 5. Retornar resultado
  -- =====================================================
  
  RETURN json_build_object(
    'success', true,
    'historial_id', v_historial_id,
    'lectura_anterior', v_lectura_valor_actual,
    'lectura_nueva', p_nueva_lectura,
    'consumo_nuevo', v_consumo_nuevo,
    'factura_actualizada', v_factura_id IS NOT NULL AND v_estado_factura = 'borrador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Actualizar CHECK constraint del historial para soportar 'lectura_actual'
-- =====================================================

ALTER TABLE contador_conceptos_historial 
  DROP CONSTRAINT IF EXISTS chk_campo_modificado;

ALTER TABLE contador_conceptos_historial 
  ADD CONSTRAINT chk_campo_modificado 
  CHECK (campo_modificado IN ('lectura_inicial', 'fecha_lectura_inicial', 'ambos', 'lectura_actual'));

-- =====================================================
-- Grants
-- =====================================================

GRANT EXECUTE ON FUNCTION validar_correccion_lectura_actual TO authenticated;
GRANT EXECUTE ON FUNCTION corregir_lectura_actual TO authenticated;
