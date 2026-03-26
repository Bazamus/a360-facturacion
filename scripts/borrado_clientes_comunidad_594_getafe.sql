-- =====================================================================
-- SCRIPT: BORRADO DE CLIENTES DE UNA COMUNIDAD
-- =====================================================================
-- Comunidad afectada:
--   Código 594 - 480 VIV GETAFE I
--
-- Se borran SOLO los clientes que:
--   1. Están registrados (vinculados) en esta comunidad.
--   2. NO están vinculados a ninguna otra comunidad (exclusivos de 594).
--   3. NO tienen facturas asociadas (facturas.cliente_id RESTRICT).
--
-- CASCADE al borrar cliente: ubicaciones_clientes, mandatos_sepa.
-- ON DELETE SET NULL: comunicaciones.cliente_id (se pone a NULL).
--
-- INSTRUCCIONES:
--   1. Ejecuta primero BLOQUE 1 (solo SELECT) para revisar datos.
--   2. Si todo es correcto, ejecuta BLOQUE 2 (DELETE en transacción).
-- =====================================================================


-- =====================================================================
-- BLOQUE 1: AUDITORÍA PREVIA (solo lectura, SIN cambios en BD)
-- Ejecuta esto primero para confirmar qué se va a borrar.
-- =====================================================================

-- Resumen de la comunidad y clientes afectados
WITH comunidad_594 AS (
  SELECT id FROM comunidades WHERE codigo = '594'
),
clientes_vinculados_594 AS (
  SELECT DISTINCT uc.cliente_id
  FROM ubicaciones_clientes uc
  JOIN ubicaciones u  ON uc.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id IN (SELECT id FROM comunidad_594)
),
clientes_otras_comunidades AS (
  SELECT DISTINCT uc.cliente_id
  FROM ubicaciones_clientes uc
  JOIN ubicaciones u  ON uc.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id NOT IN (SELECT id FROM comunidad_594)
),
exclusivos_594 AS (
  SELECT cliente_id FROM clientes_vinculados_594
  EXCEPT
  SELECT cliente_id FROM clientes_otras_comunidades
)
SELECT
  (SELECT codigo FROM comunidades WHERE codigo = '594') AS codigo,
  (SELECT nombre FROM comunidades WHERE codigo = '594') AS nombre,
  (SELECT COUNT(*) FROM clientes_vinculados_594) AS clientes_vinculados_total,
  (SELECT COUNT(*) FROM exclusivos_594) AS clientes_exclusivos_594,
  (SELECT COUNT(*) FROM exclusivos_594 ex
   WHERE NOT EXISTS (SELECT 1 FROM facturas f WHERE f.cliente_id = ex.cliente_id)) AS clientes_a_borrar,
  (SELECT COUNT(*) FROM exclusivos_594 ex
   WHERE EXISTS (SELECT 1 FROM facturas f WHERE f.cliente_id = ex.cliente_id)) AS clientes_no_borrables_tienen_facturas;


-- Listado de clientes que SÍ se borrarán (exclusivos de 594 y sin facturas)
SELECT
  cl.id,
  cl.codigo_cliente,
  cl.nombre,
  cl.apellidos,
  cl.nif,
  cl.email
FROM clientes cl
WHERE cl.id IN (
  SELECT uc.cliente_id
  FROM ubicaciones_clientes uc
  JOIN ubicaciones u  ON uc.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id IN (SELECT id FROM comunidades WHERE codigo = '594')
  EXCEPT
  SELECT uc.cliente_id
  FROM ubicaciones_clientes uc
  JOIN ubicaciones u  ON uc.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id NOT IN (SELECT id FROM comunidades WHERE codigo = '594')
)
AND NOT EXISTS (SELECT 1 FROM facturas f WHERE f.cliente_id = cl.id)
ORDER BY cl.apellidos, cl.nombre;


-- Clientes exclusivos de 594 que NO se pueden borrar (tienen facturas)
SELECT
  cl.id,
  cl.nombre,
  cl.apellidos,
  cl.nif,
  (SELECT COUNT(*) FROM facturas f WHERE f.cliente_id = cl.id) AS num_facturas
FROM clientes cl
WHERE cl.id IN (
  SELECT uc.cliente_id
  FROM ubicaciones_clientes uc
  JOIN ubicaciones u  ON uc.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id IN (SELECT id FROM comunidades WHERE codigo = '594')
  EXCEPT
  SELECT uc.cliente_id
  FROM ubicaciones_clientes uc
  JOIN ubicaciones u  ON uc.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id NOT IN (SELECT id FROM comunidades WHERE codigo = '594')
)
AND EXISTS (SELECT 1 FROM facturas f WHERE f.cliente_id = cl.id)
ORDER BY cl.apellidos, cl.nombre;


-- =====================================================================
-- BLOQUE 2: BORRADO EN TRANSACCIÓN
-- PELIGRO: IRREVERSIBLE. Revisar BLOQUE 1 antes de ejecutar.
-- Solo se eliminan clientes exclusivos de 594 y sin facturas.
-- =====================================================================

BEGIN;

DELETE FROM clientes
WHERE id IN (
  -- Clientes vinculados solo a comunidad 594
  SELECT uc.cliente_id
  FROM ubicaciones_clientes uc
  JOIN ubicaciones u  ON uc.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id IN (SELECT id FROM comunidades WHERE codigo = '594')
  EXCEPT
  SELECT uc.cliente_id
  FROM ubicaciones_clientes uc
  JOIN ubicaciones u  ON uc.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id NOT IN (SELECT id FROM comunidades WHERE codigo = '594')
)
AND NOT EXISTS (SELECT 1 FROM facturas f WHERE f.cliente_id = clientes.id);

-- Verificación
DO $$
DECLARE
  v_restantes INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_restantes
  FROM ubicaciones_clientes uc
  JOIN ubicaciones u  ON uc.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id IN (SELECT id FROM comunidades WHERE codigo = '594');

  RAISE NOTICE 'Clientes restantes vinculados a comunidad 594 (ubicaciones_clientes): %. Si hay facturas asociadas a esos clientes, no se han borrado.', v_restantes;
END $$;

COMMIT;

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================
