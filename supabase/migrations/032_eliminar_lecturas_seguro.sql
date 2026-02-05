-- =====================================================
-- Migración 032: Sistema de Eliminación Segura de Lecturas
-- Permite eliminar lecturas no facturadas y recalcular lectura_actual
-- =====================================================

-- =====================================================
-- FUNCIÓN 1: Verificar si una lectura puede ser eliminada
-- =====================================================
CREATE OR REPLACE FUNCTION verificar_lectura_eliminable(p_lectura_id UUID)
RETURNS TABLE (
  es_eliminable BOOLEAN,
  motivo TEXT,
  factura_numero TEXT
) AS $$
DECLARE
  v_facturada BOOLEAN;
  v_en_factura BOOLEAN;
  v_numero_completo TEXT;
BEGIN
  -- Verificar si la lectura existe
  SELECT l.facturada INTO v_facturada
  FROM lecturas l
  WHERE l.id = p_lectura_id;

  IF v_facturada IS NULL THEN
    RETURN QUERY SELECT false, 'Lectura no encontrada'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Verificar si está marcada como facturada
  IF v_facturada THEN
    -- Buscar el número de factura
    SELECT f.numero_completo INTO v_numero_completo
    FROM facturas_lineas fl
    JOIN facturas f ON f.id = fl.factura_id
    WHERE fl.lectura_id = p_lectura_id
    LIMIT 1;

    RETURN QUERY SELECT
      false,
      'Lectura ya facturada'::TEXT,
      v_numero_completo;
    RETURN;
  END IF;

  -- Verificar si está en facturas_lineas (doble verificación)
  SELECT EXISTS(
    SELECT 1 FROM facturas_lineas WHERE lectura_id = p_lectura_id
  ) INTO v_en_factura;

  IF v_en_factura THEN
    -- Buscar el número de factura
    SELECT f.numero_completo INTO v_numero_completo
    FROM facturas_lineas fl
    JOIN facturas f ON f.id = fl.factura_id
    WHERE fl.lectura_id = p_lectura_id
    LIMIT 1;

    RETURN QUERY SELECT
      false,
      'Lectura referenciada en factura'::TEXT,
      v_numero_completo;
    RETURN;
  END IF;

  -- La lectura es eliminable
  RETURN QUERY SELECT true, 'Puede eliminarse'::TEXT, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verificar_lectura_eliminable IS 'Verifica si una lectura puede ser eliminada. Retorna es_eliminable, motivo y número de factura si aplica.';

-- =====================================================
-- FUNCIÓN 2: Eliminar lectura y recalcular lectura_actual
-- =====================================================
CREATE OR REPLACE FUNCTION eliminar_lectura_segura(
  p_lectura_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  lectura_actual_nueva DECIMAL(12,4),
  fecha_lectura_actual_nueva DATE
) AS $$
DECLARE
  v_es_eliminable BOOLEAN;
  v_motivo TEXT;
  v_factura_numero TEXT;
  v_contador_id UUID;
  v_concepto_id UUID;
  v_penultima_lectura DECIMAL(12,4);
  v_penultima_fecha DATE;
  v_lectura_inicial DECIMAL(12,4);
  v_fecha_inicial DATE;
  rec RECORD;
BEGIN
  -- 1. Verificar si es eliminable
  SELECT * INTO v_es_eliminable, v_motivo, v_factura_numero
  FROM verificar_lectura_eliminable(p_lectura_id);

  IF NOT v_es_eliminable THEN
    RETURN QUERY SELECT
      false,
      v_motivo || COALESCE(' (Factura: ' || v_factura_numero || ')', ''),
      NULL::DECIMAL(12,4),
      NULL::DATE;
    RETURN;
  END IF;

  -- 2. Obtener datos de la lectura antes de eliminar
  SELECT l.contador_id, l.concepto_id INTO v_contador_id, v_concepto_id
  FROM lecturas l
  WHERE l.id = p_lectura_id;

  -- 3. Buscar la penúltima lectura (la más reciente excluyendo la que se va a eliminar)
  SELECT
    l.lectura_valor,
    l.fecha_lectura
  INTO v_penultima_lectura, v_penultima_fecha
  FROM lecturas l
  WHERE l.contador_id = v_contador_id
    AND l.concepto_id = v_concepto_id
    AND l.id != p_lectura_id
  ORDER BY l.fecha_lectura DESC, l.created_at DESC
  LIMIT 1;

  -- 4. Si no hay penúltima lectura, obtener la lectura inicial
  IF v_penultima_lectura IS NULL THEN
    SELECT
      cc.lectura_inicial,
      cc.fecha_lectura_inicial
    INTO v_lectura_inicial, v_fecha_inicial
    FROM contadores_conceptos cc
    WHERE cc.contador_id = v_contador_id
      AND cc.concepto_id = v_concepto_id;

    v_penultima_lectura := v_lectura_inicial;
    v_penultima_fecha := v_fecha_inicial;
  END IF;

  -- 5. Eliminar la lectura
  DELETE FROM lecturas WHERE id = p_lectura_id;

  -- Log para auditoría
  RAISE NOTICE 'Lectura eliminada: % por usuario: %', p_lectura_id, COALESCE(p_user_id::TEXT, 'sistema');

  -- 6. Actualizar lectura_actual en contadores_conceptos
  UPDATE contadores_conceptos
  SET
    lectura_actual = v_penultima_lectura,
    fecha_lectura_actual = v_penultima_fecha,
    updated_at = now()
  WHERE contador_id = v_contador_id
    AND concepto_id = v_concepto_id;

  -- 7. Retornar éxito con detalles
  RETURN QUERY SELECT
    true,
    'Lectura eliminada correctamente'::TEXT,
    v_penultima_lectura,
    v_penultima_fecha;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION eliminar_lectura_segura IS 'Elimina una lectura de forma segura y recalcula lectura_actual. Solo funciona con lecturas no facturadas.';

-- =====================================================
-- FUNCIÓN 3: Eliminar todas las lecturas de una importación
-- =====================================================
CREATE OR REPLACE FUNCTION eliminar_importacion_completa(
  p_importacion_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  lecturas_eliminadas INTEGER,
  lecturas_no_eliminables INTEGER,
  mensaje TEXT,
  detalles_no_eliminables JSONB
) AS $$
DECLARE
  v_lecturas_eliminadas INTEGER := 0;
  v_lecturas_no_eliminables INTEGER := 0;
  v_lectura RECORD;
  v_result RECORD;
  v_detalles JSONB := '[]'::JSONB;
  v_total_lecturas INTEGER;
BEGIN
  -- Contar total de lecturas de esta importación
  SELECT COUNT(*) INTO v_total_lecturas
  FROM lecturas l
  JOIN importaciones_detalle id ON id.id = l.importacion_detalle_id
  WHERE id.importacion_id = p_importacion_id;

  IF v_total_lecturas = 0 THEN
    RETURN QUERY SELECT
      false,
      0,
      0,
      'No se encontraron lecturas para esta importación'::TEXT,
      '[]'::JSONB;
    RETURN;
  END IF;

  -- Iterar sobre todas las lecturas de la importación
  FOR v_lectura IN
    SELECT
      l.id,
      c.numero_serie,
      con.codigo as concepto_codigo,
      l.lectura_valor,
      l.fecha_lectura
    FROM lecturas l
    JOIN importaciones_detalle id ON id.id = l.importacion_detalle_id
    JOIN contadores c ON c.id = l.contador_id
    JOIN conceptos con ON con.id = l.concepto_id
    WHERE id.importacion_id = p_importacion_id
    ORDER BY l.created_at
  LOOP
    -- Intentar eliminar cada lectura
    SELECT * INTO v_result
    FROM eliminar_lectura_segura(v_lectura.id, p_user_id);

    IF v_result.success THEN
      v_lecturas_eliminadas := v_lecturas_eliminadas + 1;
      RAISE NOTICE 'Lectura eliminada: Contador %, Concepto %, Valor %, Fecha %',
        v_lectura.numero_serie,
        v_lectura.concepto_codigo,
        v_lectura.lectura_valor,
        v_lectura.fecha_lectura;
    ELSE
      v_lecturas_no_eliminables := v_lecturas_no_eliminables + 1;

      -- Agregar detalle a la lista
      v_detalles := v_detalles || jsonb_build_object(
        'contador', v_lectura.numero_serie,
        'concepto', v_lectura.concepto_codigo,
        'lectura', v_lectura.lectura_valor,
        'fecha', v_lectura.fecha_lectura,
        'motivo', v_result.message
      );

      RAISE NOTICE 'Lectura NO eliminable: Contador %, Concepto %, Motivo: %',
        v_lectura.numero_serie,
        v_lectura.concepto_codigo,
        v_result.message;
    END IF;
  END LOOP;

  -- Si todas las lecturas fueron eliminadas, marcar la importación como cancelada
  IF v_lecturas_no_eliminables = 0 THEN
    UPDATE importaciones
    SET
      estado = 'cancelado',
      updated_at = now()
    WHERE id = p_importacion_id;

    RAISE NOTICE 'Importación % marcada como cancelada', p_importacion_id;
  END IF;

  -- Retornar resumen
  RETURN QUERY SELECT
    true,
    v_lecturas_eliminadas,
    v_lecturas_no_eliminables,
    format('%s lecturas eliminadas, %s no eliminables',
      v_lecturas_eliminadas,
      v_lecturas_no_eliminables)::TEXT,
    v_detalles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION eliminar_importacion_completa IS 'Elimina todas las lecturas no facturadas de una importación. Si todas se eliminan, marca la importación como cancelada.';

-- =====================================================
-- PERMISOS
-- =====================================================
-- Estas funciones están marcadas como SECURITY DEFINER, lo que significa que se ejecutan
-- con los permisos del propietario de la función (el rol que ejecutó la migración).
-- Asegúrate de que los usuarios tengan permiso para ejecutarlas vía RPC.

GRANT EXECUTE ON FUNCTION verificar_lectura_eliminable TO authenticated;
GRANT EXECUTE ON FUNCTION eliminar_lectura_segura TO authenticated;
GRANT EXECUTE ON FUNCTION eliminar_importacion_completa TO authenticated;
