-- ============================================================
-- Migración 041: Backfill cliente_id en comunicaciones existentes
-- Problema: mensajes insertados antes/durante correcciones de WF1
--   tienen cliente_id=null aunque el cliente exista por teléfono
-- Solución: actualizar todos los registros con cliente_id=null
--   usando la función buscar_cliente_por_telefono (con normalización)
-- ============================================================
-- DIAGNÓSTICO PREVIO: ejecutar estas dos consultas para verificar
-- que las funciones de la migración 038 están correctamente aplicadas:
--
--   SELECT normalizar_telefono('34699486848');
--   -- Debe devolver: 699486848
--
--   SELECT * FROM buscar_cliente_por_telefono('34699486848');
--   -- Debe devolver la fila de David Rey Ariza
--
-- Si las consultas anteriores funcionan, ejecutar el UPDATE siguiente:
-- ============================================================

BEGIN;

UPDATE comunicaciones c
SET cliente_id = sub.cliente_id
FROM (
  SELECT
    com.id         AS comm_id,
    bc.cliente_id
  FROM comunicaciones com
  CROSS JOIN LATERAL buscar_cliente_por_telefono(com.remitente_telefono) bc
  WHERE com.cliente_id IS NULL
    AND com.remitente_telefono IS NOT NULL
    AND com.remitente_telefono <> ''
) sub
WHERE c.id = sub.comm_id;

-- Mostrar cuántos registros se actualizaron
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Registros actualizados con cliente_id: %', v_count;
END;
$$;

COMMIT;
