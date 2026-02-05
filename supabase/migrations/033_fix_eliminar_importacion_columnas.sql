-- =====================================================
-- Migración 033: Corregir función eliminar_importacion_completa
-- Problema: Usaba importacion_id que no existe en tabla lecturas
-- Solución: Usar importacion_detalle_id con JOIN a importaciones_detalle
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

COMMENT ON FUNCTION eliminar_importacion_completa IS 'Elimina todas las lecturas no facturadas de una importación. Si todas se eliminan, marca la importación como cancelada. Versión corregida que usa importacion_detalle_id.';
