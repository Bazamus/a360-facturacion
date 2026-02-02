-- =====================================================
-- FIX: Recrear vista v_reporte_consumos_vivienda
-- =====================================================
-- La vista no existe en la base de datos, causando error 404
-- Este script la recrea con la definición correcta

-- Eliminar vista si existe (por si acaso)
DROP VIEW IF EXISTS v_reporte_consumos_vivienda CASCADE;

-- Recrear vista v_reporte_consumos_vivienda
CREATE OR REPLACE VIEW v_reporte_consumos_vivienda AS
SELECT 
  l.id AS lectura_id,
  l.fecha_lectura,
  l.consumo,
  c.nombre AS concepto,
  c.unidad_medida,
  cont.numero_serie AS contador,
  u.nombre AS ubicacion,
  a.nombre AS agrupacion,
  com.nombre AS comunidad,
  com.id AS comunidad_id,
  COALESCE(cli.nombre || ' ' || cli.apellidos, 'Sin asignar') AS cliente,
  f.numero_completo AS factura,
  f.total AS importe_facturado
FROM lecturas l
JOIN conceptos c ON l.concepto_id = c.id
JOIN contadores cont ON l.contador_id = cont.id
JOIN ubicaciones u ON cont.ubicacion_id = u.id
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades com ON a.comunidad_id = com.id
LEFT JOIN ubicaciones_clientes uc ON u.id = uc.ubicacion_id AND uc.es_actual = true
LEFT JOIN clientes cli ON uc.cliente_id = cli.id
LEFT JOIN facturas f ON l.factura_id = f.id;

-- Comentario
COMMENT ON VIEW v_reporte_consumos_vivienda IS 'Vista para reportes de consumos por vivienda con todos los detalles';

-- Verificar que se creó correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'v_reporte_consumos_vivienda'
  ) THEN
    RAISE NOTICE '✅ Vista v_reporte_consumos_vivienda creada exitosamente';
  ELSE
    RAISE EXCEPTION '❌ Error: No se pudo crear la vista v_reporte_consumos_vivienda';
  END IF;
END $$;
