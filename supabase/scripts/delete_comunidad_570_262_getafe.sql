-- =====================================================
-- SCRIPT DE BORRADO SEGURO PARA COMUNIDAD
-- =====================================================
-- Comunidad: 570 262 VIV GETAFE II
-- 
-- Este script borra:
-- 1. Clientes asociados a la comunidad
-- 2. Contadores de la comunidad
-- 3. Facturas en estado 'borrador' de la comunidad
--
-- IMPORTANTE: Ejecutar PRIMERO la sección PREVIEW
-- =====================================================

-- =====================================================
-- PASO 1: PREVIEW - VER QUÉ SE VA A BORRAR
-- =====================================================
-- Ejecuta esta sección PRIMERO para ver qué datos se borrarán

-- Identificar la comunidad
SELECT 
  id,
  nombre,
  created_at
FROM comunidades
WHERE nombre ILIKE '%570 262 VIV GETAFE II%'
  OR nombre = '570 262 VIV GETAFE II';

-- IMPORTANTE: Copia el ID de la comunidad que aparece arriba
-- y úsalo en las siguientes consultas reemplazando 'COMUNIDAD_ID_AQUI'

-- Vista previa: Agrupaciones que se verán afectadas
SELECT 
  a.id AS agrupacion_id,
  a.nombre AS agrupacion,
  COUNT(DISTINCT u.id) AS num_ubicaciones,
  COUNT(DISTINCT cont.id) AS num_contadores
FROM agrupaciones a
LEFT JOIN ubicaciones u ON u.agrupacion_id = a.id
LEFT JOIN contadores cont ON cont.ubicacion_id = u.id
WHERE a.comunidad_id = (
  SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1
)
GROUP BY a.id, a.nombre;

-- Vista previa: Clientes que se borrarán
SELECT 
  c.id AS cliente_id,
  c.nombre || ' ' || COALESCE(c.apellidos, '') AS cliente,
  c.nif,
  c.email,
  u.nombre AS ubicacion,
  a.nombre AS agrupacion
FROM clientes c
JOIN ubicaciones_clientes uc ON uc.cliente_id = c.id
JOIN ubicaciones u ON u.id = uc.ubicacion_id
JOIN agrupaciones a ON a.id = u.agrupacion_id
WHERE a.comunidad_id = (
  SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1
);

-- Vista previa: Contadores que se borrarán
SELECT 
  cont.id AS contador_id,
  cont.numero_serie,
  u.nombre AS ubicacion,
  a.nombre AS agrupacion,
  COUNT(l.id) AS num_lecturas
FROM contadores cont
JOIN ubicaciones u ON u.id = cont.ubicacion_id
JOIN agrupaciones a ON a.id = u.agrupacion_id
LEFT JOIN lecturas l ON l.contador_id = cont.id
WHERE a.comunidad_id = (
  SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1
)
GROUP BY cont.id, cont.numero_serie, u.nombre, a.nombre;

-- Vista previa: Facturas en borrador que se borrarán
SELECT 
  f.id AS factura_id,
  f.numero_completo,
  f.fecha_factura,
  f.cliente_nombre,
  f.total,
  f.estado
FROM facturas f
WHERE f.comunidad_id = (
  SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1
)
AND f.estado = 'borrador';

-- Resumen de lo que se borrará
SELECT 
  'RESUMEN DE BORRADO' AS seccion,
  (SELECT COUNT(*) FROM clientes c
   JOIN ubicaciones_clientes uc ON uc.cliente_id = c.id
   JOIN ubicaciones u ON u.id = uc.ubicacion_id
   JOIN agrupaciones a ON a.id = u.agrupacion_id
   WHERE a.comunidad_id = (SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1)
  ) AS total_clientes,
  (SELECT COUNT(*) FROM contadores cont
   JOIN ubicaciones u ON u.id = cont.ubicacion_id
   JOIN agrupaciones a ON a.id = u.agrupacion_id
   WHERE a.comunidad_id = (SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1)
  ) AS total_contadores,
  (SELECT COUNT(*) FROM lecturas l
   JOIN contadores cont ON cont.id = l.contador_id
   JOIN ubicaciones u ON u.id = cont.ubicacion_id
   JOIN agrupaciones a ON a.id = u.agrupacion_id
   WHERE a.comunidad_id = (SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1)
  ) AS total_lecturas,
  (SELECT COUNT(*) FROM facturas f
   WHERE f.comunidad_id = (SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1)
   AND f.estado = 'borrador'
  ) AS total_facturas_borrador;

-- =====================================================
-- PASO 2: BORRADO REAL (EJECUTAR SOLO SI ESTÁS SEGURO)
-- =====================================================
-- ADVERTENCIA: Esta operación NO SE PUEDE DESHACER
-- Revisa el PREVIEW arriba antes de ejecutar
-- =====================================================

-- Descomenta las siguientes líneas SOLO cuando estés seguro de borrar

/*
DO $$
DECLARE
  v_comunidad_id UUID;
  v_deleted_lecturas INTEGER;
  v_deleted_conceptos INTEGER;
  v_deleted_facturas_borrador INTEGER;
  v_deleted_facturas_lineas INTEGER;
  v_deleted_contadores INTEGER;
  v_deleted_ubicaciones_clientes INTEGER;
  v_deleted_clientes INTEGER;
  v_deleted_ubicaciones INTEGER;
  v_deleted_agrupaciones INTEGER;
BEGIN
  -- Obtener ID de la comunidad
  SELECT id INTO v_comunidad_id
  FROM comunidades
  WHERE nombre ILIKE '%570 262 VIV GETAFE II%'
  LIMIT 1;

  IF v_comunidad_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró la comunidad "570 262 VIV GETAFE II"';
  END IF;

  RAISE NOTICE 'Iniciando borrado para comunidad ID: %', v_comunidad_id;

  -- 1. Borrar lecturas de los contadores de la comunidad
  DELETE FROM lecturas
  WHERE contador_id IN (
    SELECT cont.id
    FROM contadores cont
    JOIN ubicaciones u ON u.id = cont.ubicacion_id
    JOIN agrupaciones a ON a.agrupacion_id = u.agrupacion_id
    WHERE a.comunidad_id = v_comunidad_id
  );
  GET DIAGNOSTICS v_deleted_lecturas = ROW_COUNT;
  RAISE NOTICE '✓ Lecturas borradas: %', v_deleted_lecturas;

  -- 2. Borrar conceptos de los contadores de la comunidad
  DELETE FROM conceptos
  WHERE contador_id IN (
    SELECT cont.id
    FROM contadores cont
    JOIN ubicaciones u ON u.id = cont.ubicacion_id
    JOIN agrupaciones a ON a.agrupacion_id = u.agrupacion_id
    WHERE a.comunidad_id = v_comunidad_id
  );
  GET DIAGNOSTICS v_deleted_conceptos = ROW_COUNT;
  RAISE NOTICE '✓ Conceptos borrados: %', v_deleted_conceptos;

  -- 3. Borrar líneas de facturas en borrador
  DELETE FROM facturas_lineas
  WHERE factura_id IN (
    SELECT id FROM facturas
    WHERE comunidad_id = v_comunidad_id
    AND estado = 'borrador'
  );
  GET DIAGNOSTICS v_deleted_facturas_lineas = ROW_COUNT;
  RAISE NOTICE '✓ Líneas de facturas borradas: %', v_deleted_facturas_lineas;

  -- 4. Borrar facturas en estado borrador
  DELETE FROM facturas
  WHERE comunidad_id = v_comunidad_id
  AND estado = 'borrador';
  GET DIAGNOSTICS v_deleted_facturas_borrador = ROW_COUNT;
  RAISE NOTICE '✓ Facturas borrador borradas: %', v_deleted_facturas_borrador;

  -- 5. Borrar contadores de la comunidad
  DELETE FROM contadores
  WHERE ubicacion_id IN (
    SELECT u.id
    FROM ubicaciones u
    JOIN agrupaciones a ON a.agrupacion_id = u.agrupacion_id
    WHERE a.comunidad_id = v_comunidad_id
  );
  GET DIAGNOSTICS v_deleted_contadores = ROW_COUNT;
  RAISE NOTICE '✓ Contadores borrados: %', v_deleted_contadores;

  -- 6. Borrar relaciones ubicaciones_clientes
  DELETE FROM ubicaciones_clientes
  WHERE ubicacion_id IN (
    SELECT u.id
    FROM ubicaciones u
    JOIN agrupaciones a ON a.agrupacion_id = u.agrupacion_id
    WHERE a.comunidad_id = v_comunidad_id
  );
  GET DIAGNOSTICS v_deleted_ubicaciones_clientes = ROW_COUNT;
  RAISE NOTICE '✓ Relaciones ubicaciones_clientes borradas: %', v_deleted_ubicaciones_clientes;

  -- 7. Borrar clientes que solo pertenecen a esta comunidad
  DELETE FROM clientes
  WHERE id IN (
    SELECT DISTINCT c.id
    FROM clientes c
    JOIN ubicaciones_clientes uc ON uc.cliente_id = c.id
    JOIN ubicaciones u ON u.id = uc.ubicacion_id
    JOIN agrupaciones a ON a.id = u.agrupacion_id
    WHERE a.comunidad_id = v_comunidad_id
    AND NOT EXISTS (
      -- No borrar si el cliente está en otra comunidad
      SELECT 1
      FROM ubicaciones_clientes uc2
      JOIN ubicaciones u2 ON u2.id = uc2.ubicacion_id
      JOIN agrupaciones a2 ON a2.id = u2.agrupacion_id
      WHERE uc2.cliente_id = c.id
      AND a2.comunidad_id != v_comunidad_id
    )
  );
  GET DIAGNOSTICS v_deleted_clientes = ROW_COUNT;
  RAISE NOTICE '✓ Clientes borrados: %', v_deleted_clientes;

  -- 8. Borrar ubicaciones de la comunidad
  DELETE FROM ubicaciones
  WHERE agrupacion_id IN (
    SELECT id FROM agrupaciones WHERE comunidad_id = v_comunidad_id
  );
  GET DIAGNOSTICS v_deleted_ubicaciones = ROW_COUNT;
  RAISE NOTICE '✓ Ubicaciones borradas: %', v_deleted_ubicaciones;

  -- 9. Borrar agrupaciones de la comunidad
  DELETE FROM agrupaciones
  WHERE comunidad_id = v_comunidad_id;
  GET DIAGNOSTICS v_deleted_agrupaciones = ROW_COUNT;
  RAISE NOTICE '✓ Agrupaciones borradas: %', v_deleted_agrupaciones;

  -- Resumen final
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'BORRADO COMPLETADO EXITOSAMENTE';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Lecturas: %', v_deleted_lecturas;
  RAISE NOTICE 'Conceptos: %', v_deleted_conceptos;
  RAISE NOTICE 'Facturas borrador: %', v_deleted_facturas_borrador;
  RAISE NOTICE 'Líneas facturas: %', v_deleted_facturas_lineas;
  RAISE NOTICE 'Contadores: %', v_deleted_contadores;
  RAISE NOTICE 'Clientes: %', v_deleted_clientes;
  RAISE NOTICE 'Ubicaciones: %', v_deleted_ubicaciones;
  RAISE NOTICE 'Agrupaciones: %', v_deleted_agrupaciones;
  RAISE NOTICE '====================================';

  -- Si todo salió bien, confirmar los cambios
  -- Comenta la siguiente línea si quieres hacer ROLLBACK para probar
  -- COMMIT; -- El commit es automático en Supabase SQL Editor

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '';
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
    RAISE NOTICE 'El borrado fue revertido (ROLLBACK)';
    RAISE EXCEPTION '%', SQLERRM; -- Re-lanzar el error para hacer ROLLBACK
END $$;
*/

-- =====================================================
-- PASO 3: VERIFICACIÓN POST-BORRADO
-- =====================================================
-- Ejecuta esto DESPUÉS del borrado para verificar

/*
SELECT 
  'VERIFICACIÓN POST-BORRADO' AS seccion,
  (SELECT COUNT(*) FROM agrupaciones WHERE comunidad_id = (
    SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1
  )) AS agrupaciones_restantes,
  (SELECT COUNT(*) FROM ubicaciones u
   JOIN agrupaciones a ON a.id = u.agrupacion_id
   WHERE a.comunidad_id = (SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1)
  ) AS ubicaciones_restantes,
  (SELECT COUNT(*) FROM contadores cont
   JOIN ubicaciones u ON u.id = cont.ubicacion_id
   JOIN agrupaciones a ON a.id = u.agrupacion_id
   WHERE a.comunidad_id = (SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1)
  ) AS contadores_restantes,
  (SELECT COUNT(*) FROM facturas
   WHERE comunidad_id = (SELECT id FROM comunidades WHERE nombre ILIKE '%570 262 VIV GETAFE II%' LIMIT 1)
   AND estado = 'borrador'
  ) AS facturas_borrador_restantes;
*/

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Este script NO borra la comunidad en sí, solo sus datos
-- 2. Las facturas emitidas/pagadas NO se borran (solo borradores)
-- 3. Los clientes que están en otras comunidades NO se borran
-- 4. Puedes ejecutar el PREVIEW múltiples veces sin riesgo
-- 5. El borrado REAL está comentado por seguridad
-- 6. Descomenta el bloque DO $$ para ejecutar el borrado
-- =====================================================
