-- =====================================================
-- Script SIMPLIFICADO para recrear SOLO v_facturas_resumen
-- Ejecutar después de migración 008
-- =====================================================

-- Recrear vista v_facturas_resumen con nuevo formato de numero_completo
CREATE OR REPLACE VIEW v_facturas_resumen AS
SELECT
  f.id,
  f.serie,
  f.numero,
  f.numero_completo,
  f.fecha_factura,
  f.fecha_vencimiento,
  f.periodo_inicio,
  f.periodo_fin,
  f.es_periodo_parcial,
  f.dias_periodo,
  f.base_imponible,
  f.importe_iva,
  f.total,
  f.estado,
  f.metodo_pago,
  f.fecha_pago,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_nif,
  f.cliente_email,
  f.comunidad_id,
  com.nombre as comunidad_nombre,
  com.codigo as comunidad_codigo,
  f.ubicacion_id,
  f.ubicacion_direccion,
  f.contador_id,
  cont.numero_serie as contador_numero_serie,
  f.pdf_generado,
  f.pdf_url,
  f.created_at,
  (SELECT COUNT(*) FROM facturas_lineas WHERE factura_id = f.id) as num_lineas
FROM facturas f
LEFT JOIN comunidades com ON f.comunidad_id = com.id
LEFT JOIN contadores cont ON f.contador_id = cont.id;

-- Verificar que la vista se creó correctamente
SELECT 'v_facturas_resumen' as vista, COUNT(*) as registros FROM v_facturas_resumen;

-- Verificar el formato del numero_completo (debe ser sin "2/")
SELECT
  numero_completo,
  cliente_nombre,
  total
FROM v_facturas_resumen
WHERE numero IS NOT NULL
ORDER BY numero DESC
LIMIT 5;
