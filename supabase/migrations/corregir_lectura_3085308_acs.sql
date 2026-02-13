-- =====================================================
-- Script de corrección: Contador 3085308 - ACS
-- Cambiar lectura_actual de 28.86 a 128.86
-- Actualizar en cascada: lecturas → contadores_conceptos → facturas_lineas → factura
-- =====================================================

DO $$
DECLARE
  v_contador_id UUID;
  v_concepto_id UUID;
  v_cc_id UUID;
  v_lectura_id UUID;
  v_factura_id UUID;
  v_factura_estado TEXT;
  v_lectura_anterior DECIMAL(12,4);
  v_lectura_actual_vieja DECIMAL(12,4);
  v_lectura_nueva DECIMAL(12,4) := 128.86;
  v_consumo_nuevo DECIMAL(12,4);
  v_precio_unitario DECIMAL(10,4);
  v_subtotal_nuevo DECIMAL(10,2);
  v_base_imponible_nueva DECIMAL(10,2);
  v_porcentaje_iva DECIMAL(5,2);
  v_importe_iva_nuevo DECIMAL(10,2);
  v_total_nuevo DECIMAL(10,2);
BEGIN
  -- =====================================================
  -- PASO 1: Verificar datos actuales
  -- =====================================================
  
  -- Buscar el contador
  SELECT id INTO v_contador_id
  FROM contadores
  WHERE numero_serie = '3085308';
  
  IF v_contador_id IS NULL THEN
    RAISE EXCEPTION 'Contador 3085308 no encontrado';
  END IF;
  
  RAISE NOTICE '✓ Contador encontrado: %', v_contador_id;
  
  -- Buscar el concepto ACS
  SELECT id INTO v_concepto_id
  FROM conceptos
  WHERE codigo = 'ACS';
  
  IF v_concepto_id IS NULL THEN
    RAISE EXCEPTION 'Concepto ACS no encontrado';
  END IF;
  
  RAISE NOTICE '✓ Concepto ACS encontrado: %', v_concepto_id;
  
  -- Buscar contadores_conceptos
  SELECT id, lectura_actual
  INTO v_cc_id, v_lectura_actual_vieja
  FROM contadores_conceptos
  WHERE contador_id = v_contador_id
    AND concepto_id = v_concepto_id
    AND activo = true;
  
  IF v_cc_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el concepto ACS asignado al contador 3085308';
  END IF;
  
  RAISE NOTICE '✓ contadores_conceptos id: %, lectura_actual actual: %', v_cc_id, v_lectura_actual_vieja;
  
  -- Buscar la lectura más reciente para este contador/concepto
  SELECT l.id, l.lectura_anterior, l.lectura_valor
  INTO v_lectura_id, v_lectura_anterior, v_lectura_actual_vieja
  FROM lecturas l
  WHERE l.contador_id = v_contador_id
    AND l.concepto_id = v_concepto_id
  ORDER BY l.fecha_lectura DESC
  LIMIT 1;
  
  IF v_lectura_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró lectura para ACS del contador 3085308';
  END IF;
  
  RAISE NOTICE '✓ Lectura encontrada: id=%, valor=%, anterior=%', v_lectura_id, v_lectura_actual_vieja, v_lectura_anterior;
  
  -- Verificar que la lectura actual es 28.86 (la incorrecta)
  IF v_lectura_actual_vieja != 28.86 THEN
    RAISE NOTICE '⚠ ADVERTENCIA: La lectura actual es % (esperada: 28.86). Continuando...', v_lectura_actual_vieja;
  END IF;
  
  -- Calcular nuevo consumo
  v_consumo_nuevo := v_lectura_nueva - COALESCE(v_lectura_anterior, 0);
  RAISE NOTICE '✓ Nuevo consumo calculado: % - % = %', v_lectura_nueva, COALESCE(v_lectura_anterior, 0), v_consumo_nuevo;
  
  -- Buscar factura asociada
  SELECT fl.factura_id INTO v_factura_id
  FROM facturas_lineas fl
  WHERE fl.lectura_id = v_lectura_id;
  
  IF v_factura_id IS NOT NULL THEN
    SELECT estado INTO v_factura_estado
    FROM facturas
    WHERE id = v_factura_id;
    
    RAISE NOTICE '✓ Factura asociada: %, estado: %', v_factura_id, v_factura_estado;
    
    IF v_factura_estado != 'borrador' THEN
      RAISE EXCEPTION 'La factura % no está en estado borrador (estado: %). No se puede modificar.', v_factura_id, v_factura_estado;
    END IF;
  ELSE
    RAISE NOTICE '✓ No hay factura asociada a esta lectura';
  END IF;
  
  -- =====================================================
  -- PASO 2: Actualizar lectura en tabla lecturas
  -- =====================================================
  
  UPDATE lecturas
  SET lectura_valor = v_lectura_nueva,
      consumo = v_consumo_nuevo,
      updated_at = NOW()
  WHERE id = v_lectura_id;
  
  RAISE NOTICE '✓ Lectura actualizada: lectura_valor = %, consumo = %', v_lectura_nueva, v_consumo_nuevo;
  
  -- =====================================================
  -- PASO 3: Actualizar contadores_conceptos
  -- =====================================================
  
  UPDATE contadores_conceptos
  SET lectura_actual = v_lectura_nueva,
      updated_at = NOW()
  WHERE id = v_cc_id;
  
  RAISE NOTICE '✓ contadores_conceptos actualizado: lectura_actual = %', v_lectura_nueva;
  
  -- =====================================================
  -- PASO 4: Actualizar facturas_lineas (si hay factura)
  -- =====================================================
  
  IF v_factura_id IS NOT NULL THEN
    -- Obtener precio_unitario actual de la línea
    SELECT precio_unitario INTO v_precio_unitario
    FROM facturas_lineas
    WHERE lectura_id = v_lectura_id
      AND factura_id = v_factura_id;
    
    v_subtotal_nuevo := ROUND(v_consumo_nuevo * v_precio_unitario, 2);
    
    UPDATE facturas_lineas
    SET lectura_actual = v_lectura_nueva,
        consumo = v_consumo_nuevo,
        cantidad = v_consumo_nuevo,
        subtotal = v_subtotal_nuevo
    WHERE lectura_id = v_lectura_id
      AND factura_id = v_factura_id;
    
    RAISE NOTICE '✓ facturas_lineas actualizada: lectura_actual=%, consumo=%, subtotal=%', v_lectura_nueva, v_consumo_nuevo, v_subtotal_nuevo;
    
    -- =====================================================
    -- PASO 5: Recalcular totales de la factura
    -- =====================================================
    
    SELECT SUM(subtotal) INTO v_base_imponible_nueva
    FROM facturas_lineas
    WHERE factura_id = v_factura_id;
    
    SELECT porcentaje_iva INTO v_porcentaje_iva
    FROM facturas
    WHERE id = v_factura_id;
    
    v_importe_iva_nuevo := ROUND(v_base_imponible_nueva * v_porcentaje_iva / 100, 2);
    v_total_nuevo := v_base_imponible_nueva + v_importe_iva_nuevo;
    
    UPDATE facturas
    SET base_imponible = v_base_imponible_nueva,
        importe_iva = v_importe_iva_nuevo,
        total = v_total_nuevo,
        updated_at = NOW()
    WHERE id = v_factura_id;
    
    RAISE NOTICE '✓ Factura recalculada: base=%, iva=%, total=%', v_base_imponible_nueva, v_importe_iva_nuevo, v_total_nuevo;
  END IF;
  
  -- =====================================================
  -- RESUMEN
  -- =====================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CORRECCIÓN COMPLETADA EXITOSAMENTE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Contador: 3085308';
  RAISE NOTICE 'Concepto: ACS (Agua Caliente Sanitaria)';
  RAISE NOTICE 'Lectura anterior: % → Nueva: %', 28.86, v_lectura_nueva;
  RAISE NOTICE 'Consumo recalculado: %', v_consumo_nuevo;
  IF v_factura_id IS NOT NULL THEN
    RAISE NOTICE 'Factura borrador actualizada: %', v_factura_id;
  END IF;
  RAISE NOTICE '========================================';
  
END $$;
