-- =====================================================================
-- SCRIPT: BORRADO TOTAL DE UNA COMUNIDAD
-- =====================================================================
-- Comunidad afectada:
--   Codigo 408 - 122 VIV DIVERSO ARROYOMOLINOS
--
-- ORDEN DE BORRADO (respeta foreign keys):
--   1. remesas_recibos    (ref. facturas, sin CASCADE)
--   2. lecturas           (ref. contadores, sin CASCADE)
--   3. importaciones      (CASCADE elimina importaciones_detalle)
--   4. facturas           (CASCADE elimina facturas_lineas, envios_email)
--   5. clientes           (solo exclusivos de esta comunidad)
--                         (CASCADE elimina mandatos_sepa)
--   6. comunidades        (CASCADE elimina: agrupaciones, ubicaciones,
--                          contadores, contadores_conceptos,
--                          ubicaciones_clientes, precios)
--
-- INSTRUCCIONES:
--   1. Ejecuta primero BLOQUE 1 (solo SELECT) para revisar datos
--   2. Si todo es correcto, ejecuta BLOQUE 2 (DELETE en transaccion)
-- =====================================================================


-- =====================================================================
-- BLOQUE 1: AUDITORIA PREVIA (solo lectura, SIN cambios en BD)
-- Ejecuta esto primero para confirmar que se va a borrar.
-- =====================================================================

SELECT
  c.codigo,
  c.nombre,
  (SELECT COUNT(*) FROM agrupaciones a
     WHERE a.comunidad_id = c.id)                                     AS portales,
  (SELECT COUNT(*) FROM ubicaciones u
     JOIN agrupaciones a ON u.agrupacion_id = a.id
     WHERE a.comunidad_id = c.id)                                     AS viviendas,
  (SELECT COUNT(*) FROM contadores ct
     JOIN ubicaciones u  ON ct.ubicacion_id  = u.id
     JOIN agrupaciones a ON u.agrupacion_id  = a.id
     WHERE a.comunidad_id = c.id)                                     AS contadores,
  (SELECT COUNT(*) FROM lecturas l
     JOIN contadores ct ON l.contador_id     = ct.id
     JOIN ubicaciones u  ON ct.ubicacion_id  = u.id
     JOIN agrupaciones a ON u.agrupacion_id  = a.id
     WHERE a.comunidad_id = c.id)                                     AS lecturas,
  (SELECT COUNT(*) FROM importaciones i
     WHERE i.comunidad_id = c.id)                                     AS importaciones,
  (SELECT COUNT(*) FROM facturas f
     WHERE f.comunidad_id = c.id)                                     AS facturas,
  (SELECT COUNT(*) FROM facturas f
     JOIN remesas_recibos rr ON rr.factura_id = f.id
     WHERE f.comunidad_id = c.id)                                     AS recibos_remesa,
  (SELECT COUNT(*) FROM ubicaciones_clientes uc
     JOIN ubicaciones u  ON uc.ubicacion_id = u.id
     JOIN agrupaciones a ON u.agrupacion_id = a.id
     WHERE a.comunidad_id = c.id)                                     AS clientes_vinculados
FROM comunidades c
WHERE c.codigo = '408'
ORDER BY c.codigo;


-- =====================================================================
-- BLOQUE 2: BORRADO TOTAL EN TRANSACCION
-- PELIGRO: IRREVERSIBLE. Revisar BLOQUE 1 antes de ejecutar.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PASO 1: Remesas_recibos
-- factura_id referencia facturas SIN CASCADE -> borrado manual requerido
-- ---------------------------------------------------------------------
DELETE FROM remesas_recibos
WHERE factura_id IN (
  SELECT f.id FROM facturas f
  WHERE f.comunidad_id IN (
    SELECT id FROM comunidades
    WHERE codigo = '408'
  )
);

-- ---------------------------------------------------------------------
-- PASO 2: Lecturas
-- contador_id referencia contadores SIN CASCADE -> borrado manual requerido
-- ---------------------------------------------------------------------
DELETE FROM lecturas
WHERE contador_id IN (
  SELECT ct.id
  FROM contadores ct
  JOIN ubicaciones u  ON ct.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id IN (
    SELECT id FROM comunidades
    WHERE codigo = '408'
  )
);

-- ---------------------------------------------------------------------
-- PASO 3: Importaciones
-- CASCADE -> importaciones_detalle se borra automaticamente
-- ---------------------------------------------------------------------
DELETE FROM importaciones
WHERE comunidad_id IN (
  SELECT id FROM comunidades
  WHERE codigo = '408'
);

-- ---------------------------------------------------------------------
-- PASO 4: Facturas
-- CASCADE -> facturas_lineas y envios_email se borran automaticamente
-- ---------------------------------------------------------------------
DELETE FROM facturas
WHERE comunidad_id IN (
  SELECT id FROM comunidades
  WHERE codigo = '408'
);

-- ---------------------------------------------------------------------
-- PASO 5: Clientes exclusivos de esta comunidad
-- Solo borra clientes SIN vinculos en otras comunidades distintas.
-- CASCADE -> mandatos_sepa se borra automaticamente.
-- ON DELETE SET NULL -> comunicaciones.cliente_id queda en NULL (ok).
-- ---------------------------------------------------------------------
DELETE FROM clientes
WHERE id IN (
  -- Clientes vinculados a esta comunidad
  SELECT DISTINCT uc.cliente_id
  FROM ubicaciones_clientes uc
  JOIN ubicaciones u  ON uc.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id IN (
    SELECT id FROM comunidades
    WHERE codigo = '408'
  )
  EXCEPT
  -- Excluir clientes que tambien pertenecen a otras comunidades
  SELECT DISTINCT uc.cliente_id
  FROM ubicaciones_clientes uc
  JOIN ubicaciones u  ON uc.ubicacion_id = u.id
  JOIN agrupaciones a ON u.agrupacion_id = a.id
  WHERE a.comunidad_id NOT IN (
    SELECT id FROM comunidades
    WHERE codigo = '408'
  )
);

-- ---------------------------------------------------------------------
-- PASO 6: Comunidad (borrado raiz)
-- CASCADE elimina automaticamente:
--   agrupaciones -> ubicaciones -> contadores -> contadores_conceptos
--   ubicaciones_clientes (residuales)
--   precios
-- ---------------------------------------------------------------------
DELETE FROM comunidades
WHERE codigo = '408';


-- ---------------------------------------------------------------------
-- VERIFICACION FINAL (dentro de la transaccion)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM comunidades
  WHERE codigo = '408';

  IF v_count = 0 THEN
    RAISE NOTICE 'OK - BORRADO COMPLETADO: La comunidad 408 (122 VIV DIVERSO ARROYOMOLINOS) ha sido eliminada correctamente.';
  ELSE
    RAISE EXCEPTION 'ERROR: Aun queda la comunidad sin borrar. Revisar manualmente y hacer ROLLBACK.';
  END IF;
END $$;

COMMIT;

-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================
