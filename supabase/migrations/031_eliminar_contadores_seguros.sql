-- =====================================================
-- Migración 031: Función para eliminar contadores de forma segura
-- =====================================================
-- Permite eliminar contadores SOLO si:
-- 1. No tienen lecturas asociadas
-- 2. No tienen facturas asociadas
-- 3. No tienen conceptos activos con datos (lecturas iniciales/actuales > 0)
-- =====================================================

-- =====================================================
-- 1. Función para verificar si un contador es eliminable
-- =====================================================

CREATE OR REPLACE FUNCTION verificar_contador_eliminable(p_contador_id UUID)
RETURNS TABLE (
  es_eliminable BOOLEAN,
  motivo TEXT,
  num_lecturas INTEGER,
  num_facturas INTEGER,
  num_conceptos_con_datos INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_num_lecturas INTEGER;
  v_num_facturas INTEGER;
  v_num_conceptos_con_datos INTEGER;
  v_motivo TEXT;
  v_eliminable BOOLEAN;
BEGIN
  -- Contar lecturas
  SELECT COUNT(*) INTO v_num_lecturas
  FROM lecturas
  WHERE contador_id = p_contador_id;
  
  -- Contar facturas
  SELECT COUNT(*) INTO v_num_facturas
  FROM facturas
  WHERE contador_id = p_contador_id;
  
  -- Contar conceptos ACTIVOS con datos (lecturas > 0)
  SELECT COUNT(*) INTO v_num_conceptos_con_datos
  FROM contadores_conceptos
  WHERE contador_id = p_contador_id
    AND activo = true
    AND (lectura_inicial > 0 OR lectura_actual > 0);
  
  -- Determinar si es eliminable
  IF v_num_lecturas > 0 THEN
    v_eliminable := false;
    v_motivo := 'El contador tiene ' || v_num_lecturas || ' lectura(s) asociada(s)';
  ELSIF v_num_facturas > 0 THEN
    v_eliminable := false;
    v_motivo := 'El contador tiene ' || v_num_facturas || ' factura(s) asociada(s)';
  ELSIF v_num_conceptos_con_datos > 0 THEN
    v_eliminable := false;
    v_motivo := 'El contador tiene ' || v_num_conceptos_con_datos || ' concepto(s) activo(s) con lecturas';
  ELSE
    v_eliminable := true;
    v_motivo := 'El contador puede ser eliminado de forma segura';
  END IF;
  
  RETURN QUERY SELECT 
    v_eliminable,
    v_motivo,
    v_num_lecturas,
    v_num_facturas,
    v_num_conceptos_con_datos;
END;
$$;

COMMENT ON FUNCTION verificar_contador_eliminable IS 
'Verifica si un contador puede ser eliminado de forma segura.
Retorna si es eliminable, el motivo, y el número de lecturas/facturas/conceptos asociados.';


-- =====================================================
-- 2. Función para eliminar contador de forma segura
-- =====================================================

CREATE OR REPLACE FUNCTION eliminar_contador_seguro(
  p_contador_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  contador_eliminado JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_verificacion RECORD;
  v_contador RECORD;
BEGIN
  -- 1. Verificar si el contador existe
  SELECT * INTO v_contador
  FROM contadores
  WHERE id = p_contador_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false,
      'El contador no existe'::TEXT,
      NULL::JSON;
    RETURN;
  END IF;
  
  -- 2. Verificar si es eliminable
  SELECT * INTO v_verificacion
  FROM verificar_contador_eliminable(p_contador_id);
  
  IF NOT v_verificacion.es_eliminable THEN
    RETURN QUERY SELECT 
      false,
      v_verificacion.motivo,
      NULL::JSON;
    RETURN;
  END IF;
  
  -- 3. Log de la operación (antes de borrar)
  RAISE NOTICE 'Eliminando contador: %', v_contador.numero_serie;
  RAISE NOTICE '  - Ubicación ID: %', v_contador.ubicacion_id;
  RAISE NOTICE '  - Usuario: %', COALESCE(p_user_id::TEXT, 'desconocido');
  
  -- 4. Borrar registros relacionados (en orden correcto)
  
  -- 4.1 Borrar relaciones contador-concepto (aunque estén inactivas)
  DELETE FROM contadores_conceptos
  WHERE contador_id = p_contador_id;
  
  RAISE NOTICE '✓ Conceptos eliminados';
  
  -- 4.2 Borrar registros de importaciones_detalle si existen
  DELETE FROM importaciones_detalle
  WHERE contador_id = p_contador_id;
  
  RAISE NOTICE '✓ Registros de importación eliminados';
  
  -- 5. Borrar el contador
  DELETE FROM contadores
  WHERE id = p_contador_id;
  
  RAISE NOTICE '✓ Contador eliminado exitosamente';
  
  -- 6. Retornar éxito
  RETURN QUERY SELECT 
    true,
    'Contador eliminado correctamente'::TEXT,
    jsonb_build_object(
      'id', v_contador.id,
      'numero_serie', v_contador.numero_serie,
      'ubicacion_id', v_contador.ubicacion_id,
      'marca', v_contador.marca,
      'modelo', v_contador.modelo
    )::JSON;
    
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error al eliminar contador: %', SQLERRM;
    RETURN QUERY SELECT 
      false,
      'Error al eliminar el contador: ' || SQLERRM,
      NULL::JSON;
END;
$$;

COMMENT ON FUNCTION eliminar_contador_seguro IS 
'Elimina un contador de forma PERMANENTE solo si no tiene lecturas ni facturas asociadas.
Borra también las relaciones con conceptos e importaciones.
IMPORTANTE: Esta operación no se puede deshacer.';


-- =====================================================
-- 3. Vista auxiliar para contadores eliminables
-- =====================================================

CREATE OR REPLACE VIEW v_contadores_eliminables AS
SELECT 
  c.id AS contador_id,
  c.numero_serie,
  c.marca,
  c.modelo,
  c.activo,
  c.ubicacion_id,
  u.nombre AS ubicacion_nombre,
  a.nombre AS agrupacion_nombre,
  com.nombre AS comunidad_nombre,
  
  -- Estadísticas
  (SELECT COUNT(*) FROM lecturas WHERE contador_id = c.id) AS num_lecturas,
  (SELECT COUNT(*) FROM facturas WHERE contador_id = c.id) AS num_facturas,
  (SELECT COUNT(*) FROM contadores_conceptos WHERE contador_id = c.id) AS num_conceptos,
  (SELECT COUNT(*) FROM contadores_conceptos 
   WHERE contador_id = c.id AND activo = true AND (lectura_inicial > 0 OR lectura_actual > 0)
  ) AS num_conceptos_con_datos,
  
  -- Es eliminable
  CASE
    WHEN EXISTS (SELECT 1 FROM lecturas WHERE contador_id = c.id) THEN false
    WHEN EXISTS (SELECT 1 FROM facturas WHERE contador_id = c.id) THEN false
    WHEN EXISTS (SELECT 1 FROM contadores_conceptos 
                 WHERE contador_id = c.id 
                 AND activo = true
                 AND (lectura_inicial > 0 OR lectura_actual > 0)) THEN false
    ELSE true
  END AS es_eliminable,
  
  -- Motivo
  CASE
    WHEN EXISTS (SELECT 1 FROM lecturas WHERE contador_id = c.id) THEN 'Tiene lecturas'
    WHEN EXISTS (SELECT 1 FROM facturas WHERE contador_id = c.id) THEN 'Tiene facturas'
    WHEN EXISTS (SELECT 1 FROM contadores_conceptos 
                 WHERE contador_id = c.id 
                 AND activo = true
                 AND (lectura_inicial > 0 OR lectura_actual > 0)) THEN 'Tiene conceptos activos con datos'
    ELSE 'Eliminable'
  END AS motivo_no_eliminable

FROM contadores c
LEFT JOIN ubicaciones u ON u.id = c.ubicacion_id
LEFT JOIN agrupaciones a ON a.id = u.agrupacion_id
LEFT JOIN comunidades com ON com.id = a.comunidad_id;

COMMENT ON VIEW v_contadores_eliminables IS 
'Vista que muestra todos los contadores con información sobre si pueden ser eliminados.
Incluye estadísticas de lecturas, facturas y conceptos asociados.';


-- =====================================================
-- 4. Política RLS para la función de eliminación
-- =====================================================

-- La función usa SECURITY DEFINER, por lo que se ejecuta con permisos del creador
-- Asegurar que solo usuarios autenticados puedan llamarla
REVOKE ALL ON FUNCTION eliminar_contador_seguro FROM PUBLIC;
GRANT EXECUTE ON FUNCTION eliminar_contador_seguro TO authenticated;

REVOKE ALL ON FUNCTION verificar_contador_eliminable FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verificar_contador_eliminable TO authenticated;


-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'Migración 031: Eliminación segura de contadores';
  RAISE NOTICE '================================================';
  
  -- Verificar funciones
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'verificar_contador_eliminable') THEN
    RAISE NOTICE '✓ Función verificar_contador_eliminable creada';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'eliminar_contador_seguro') THEN
    RAISE NOTICE '✓ Función eliminar_contador_seguro creada';
  END IF;
  
  -- Verificar vista
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_contadores_eliminables') THEN
    RAISE NOTICE '✓ Vista v_contadores_eliminables creada';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '';
  RAISE NOTICE 'USO:';
  RAISE NOTICE '1. Verificar si un contador es eliminable:';
  RAISE NOTICE '   SELECT * FROM verificar_contador_eliminable(''uuid-contador'');';
  RAISE NOTICE '';
  RAISE NOTICE '2. Eliminar un contador:';
  RAISE NOTICE '   SELECT * FROM eliminar_contador_seguro(''uuid-contador'');';
  RAISE NOTICE '';
  RAISE NOTICE '3. Ver contadores eliminables:';
  RAISE NOTICE '   SELECT * FROM v_contadores_eliminables WHERE es_eliminable = true;';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANTE: La eliminación es PERMANENTE y no se puede deshacer';
  RAISE NOTICE '================================================';
END $$;
