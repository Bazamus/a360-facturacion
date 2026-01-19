-- =====================================================
-- Script para recrear vistas después de ejecutar migración 008
-- Ejecutar SOLO si las vistas no se crearon correctamente
-- =====================================================

-- Recrear vista v_envios_resumen
CREATE OR REPLACE VIEW v_envios_resumen AS
SELECT
  e.id,
  e.factura_id,
  f.numero_completo as factura_numero,
  f.cliente_nombre,
  f.cliente_email as email_destino,
  e.email_remitente,
  e.asunto,
  e.estado,
  e.fecha_envio,
  e.error_mensaje,
  e.intentos,
  e.ultimo_intento,
  e.created_at
FROM envios e
JOIN facturas f ON e.factura_id = f.id;

-- Recrear vista v_reporte_consumos_vivienda
CREATE OR REPLACE VIEW v_reporte_consumos_vivienda AS
SELECT
  f.id as factura_id,
  f.numero_completo,
  f.fecha_factura,
  f.periodo_inicio,
  f.periodo_fin,
  f.cliente_id,
  f.cliente_nombre,
  f.comunidad_id,
  com.nombre as comunidad_nombre,
  f.ubicacion_id,
  u.nombre as ubicacion_nombre,
  u.portal,
  u.piso,
  u.puerta,
  fl.concepto_codigo,
  fl.concepto_nombre,
  fl.unidad_medida,
  fl.cantidad,
  fl.precio_unitario,
  fl.subtotal,
  fl.lectura_anterior,
  fl.lectura_actual,
  fl.consumo,
  fl.fecha_lectura_actual
FROM facturas f
JOIN comunidades com ON f.comunidad_id = com.id
JOIN ubicaciones u ON f.ubicacion_id = u.id
JOIN facturas_lineas fl ON f.id = fl.factura_id
WHERE f.estado IN ('emitida', 'pagada');

-- Recrear vista v_facturas_pendientes_remesa
CREATE OR REPLACE VIEW v_facturas_pendientes_remesa AS
SELECT
  f.id,
  f.numero_completo,
  f.fecha_factura,
  f.fecha_vencimiento,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_nif,
  f.cliente_iban,
  f.comunidad_id,
  com.nombre as comunidad_nombre,
  f.total,
  f.estado,
  f.metodo_pago
FROM facturas f
JOIN comunidades com ON f.comunidad_id = com.id
WHERE f.estado IN ('emitida', 'pagada')
  AND f.metodo_pago = 'domiciliacion'
  AND f.cliente_iban IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM remesas_detalles rd
    WHERE rd.factura_id = f.id
  );

-- Recrear vista v_facturas_pendientes_envio
CREATE OR REPLACE VIEW v_facturas_pendientes_envio AS
SELECT
  f.id,
  f.numero_completo,
  f.fecha_factura,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_email,
  f.comunidad_id,
  com.nombre as comunidad_nombre,
  f.total,
  f.estado
FROM facturas f
JOIN comunidades com ON f.comunidad_id = com.id
WHERE f.estado IN ('emitida', 'pagada')
  AND f.cliente_email IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM envios e
    WHERE e.factura_id = f.id
      AND e.estado = 'enviado'
  );

-- Verificar que todas las vistas se crearon correctamente
SELECT 'v_envios_resumen' as vista, COUNT(*) as registros FROM v_envios_resumen
UNION ALL
SELECT 'v_reporte_consumos_vivienda', COUNT(*) FROM v_reporte_consumos_vivienda
UNION ALL
SELECT 'v_facturas_pendientes_remesa', COUNT(*) FROM v_facturas_pendientes_remesa
UNION ALL
SELECT 'v_facturas_pendientes_envio', COUNT(*) FROM v_facturas_pendientes_envio
UNION ALL
SELECT 'v_facturas_resumen', COUNT(*) FROM v_facturas_resumen;
