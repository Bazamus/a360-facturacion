BEGIN;

-- ============================================================
-- 053: Correcciones SAT - categorias materiales + precios contratos
-- SEGURIDAD: Solo modifica tablas SAT propias (migracion 045)
-- No toca: facturas, clientes, comunidades, contadores, lecturas
-- ============================================================

-- 1. Ampliar CHECK de materiales.categoria para incluir categorias utiles
ALTER TABLE materiales DROP CONSTRAINT IF EXISTS materiales_categoria_check;
ALTER TABLE materiales ADD CONSTRAINT materiales_categoria_check
  CHECK (categoria IN (
    'general', 'fontaneria', 'electricidad', 'climatizacion',
    'calefaccion', 'repuestos', 'consumible', 'herramienta',
    'equipo', 'otro'
  ));

-- 2. Añadir columnas de precio desglosado en contratos_mantenimiento
--    (el formulario frontend ya usa estos campos)
ALTER TABLE contratos_mantenimiento
  ADD COLUMN IF NOT EXISTS precio_mensual DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS precio_anual DECIMAL(10,2);

-- 3. Recrear vista v_contratos_activos para incluir nuevos campos
--    (DROP + CREATE porque CREATE OR REPLACE no permite añadir columnas intermedias)
DROP VIEW IF EXISTS v_contratos_activos;
CREATE VIEW v_contratos_activos AS
SELECT
  ct.id,
  ct.numero_contrato,
  ct.titulo,
  ct.tipo,
  ct.estado,
  ct.fecha_inicio,
  ct.fecha_fin,
  ct.periodicidad,
  ct.precio,
  ct.precio_mensual,
  ct.precio_anual,
  ct.renovacion_automatica,
  -- Cliente
  c.id AS cliente_id,
  c.nombre || ' ' || c.apellidos AS cliente_nombre,
  -- Comunidad
  com.id AS comunidad_id,
  com.nombre AS comunidad_nombre,
  -- Intervenciones vinculadas
  COALESCE(
    (SELECT COUNT(*) FROM intervenciones i WHERE i.contrato_id = ct.id),
    0
  ) AS num_intervenciones,
  COALESCE(
    (SELECT COUNT(*) FROM intervenciones i WHERE i.contrato_id = ct.id AND i.estado = 'completada'),
    0
  ) AS num_completadas
FROM contratos_mantenimiento ct
LEFT JOIN clientes c ON ct.cliente_id = c.id
LEFT JOIN comunidades com ON ct.comunidad_id = com.id
WHERE ct.estado IN ('activo', 'borrador');

COMMIT;
