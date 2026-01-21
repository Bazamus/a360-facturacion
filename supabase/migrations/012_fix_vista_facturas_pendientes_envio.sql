-- =====================================================
-- Migración 012: Corregir vista v_facturas_pendientes_envio
-- =====================================================
-- Problema: La migración 008 verificaba tabla 'envios' pero existe 'envios_email'
-- y la vista recreada no incluía el campo estado_envio necesario

-- Paso 1: Eliminar vista si existe
DROP VIEW IF EXISTS v_facturas_pendientes_envio CASCADE;

-- Paso 2: Recrear vista correctamente con todos los campos necesarios
CREATE VIEW v_facturas_pendientes_envio AS
SELECT
  f.id,
  f.numero_completo,
  f.fecha_factura,
  f.cliente_id,
  f.cliente_nombre,
  f.cliente_email,
  f.comunidad_id,
  c.nombre AS comunidad_nombre,
  f.total,
  f.estado,
  f.email_enviado,
  f.fecha_email_enviado,
  CASE
    WHEN f.cliente_email IS NULL OR f.cliente_email = '' THEN 'sin_email'
    WHEN f.email_enviado = true THEN 'enviado'
    ELSE 'pendiente'
  END AS estado_envio
FROM facturas f
JOIN comunidades c ON f.comunidad_id = c.id
WHERE f.estado = 'emitida';

-- Comentario
COMMENT ON VIEW v_facturas_pendientes_envio IS
'Vista de facturas emitidas para gestión de envíos por email.
Incluye estado_envio calculado: pendiente, enviado, sin_email';
