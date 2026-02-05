-- =====================================================
-- Script de verificación: Fecha de emisión en facturas
-- =====================================================

-- Ver facturas borrador con sus fechas actuales
SELECT
  id,
  numero_completo,
  estado,
  fecha_factura as fecha_emision,
  fecha_vencimiento,
  cliente_nombre,
  total,
  created_at as fecha_creacion_borrador
FROM facturas
WHERE estado = 'borrador'
ORDER BY created_at DESC
LIMIT 10;

-- Ver facturas emitidas recientemente
SELECT
  id,
  numero_completo,
  estado,
  fecha_factura as fecha_emision,
  fecha_vencimiento,
  cliente_nombre,
  total,
  created_at as fecha_creacion_borrador
FROM facturas
WHERE estado = 'emitida'
ORDER BY created_at DESC
LIMIT 10;
