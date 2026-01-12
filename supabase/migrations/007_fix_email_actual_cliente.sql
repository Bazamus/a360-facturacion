-- =====================================================
-- Migración 007: Usar email actual del cliente en envíos
-- =====================================================
-- Problema: Las facturas guardan un snapshot del email del cliente
--           al momento de crearlas, pero para envíos necesitamos
--           el email ACTUAL del cliente, no el histórico.
--
-- Solución: Eliminar y recrear la vista v_facturas_pendientes_envio
--           para hacer JOIN con la tabla clientes y obtener el email actual.
-- =====================================================

-- Primero eliminar la vista existente
DROP VIEW IF EXISTS v_facturas_pendientes_envio;

-- Recrear la vista con el email actual del cliente
CREATE VIEW v_facturas_pendientes_envio AS
SELECT
  f.id,
  f.numero_completo,
  f.fecha_factura,
  f.cliente_id,
  f.cliente_nombre,
  -- Email actual del cliente (no el snapshot de la factura)
  COALESCE(cli.email, f.cliente_email) AS cliente_email,
  f.total,
  c.nombre AS comunidad_nombre,
  CASE
    WHEN cli.email IS NULL OR cli.email = '' THEN 'sin_email'
    WHEN f.email_enviado = true THEN 'enviado'
    ELSE 'pendiente'
  END AS estado_envio
FROM facturas f
JOIN comunidades c ON f.comunidad_id = c.id
LEFT JOIN clientes cli ON f.cliente_id = cli.id  -- LEFT JOIN por si el cliente fue borrado
WHERE f.estado = 'emitida';

-- Comentario actualizado
COMMENT ON VIEW v_facturas_pendientes_envio IS
'Facturas emitidas pendientes de envío por email.
Usa el email ACTUAL del cliente (tabla clientes), no el snapshot histórico de la factura.
Si el cliente fue eliminado, usa el email del snapshot como fallback.';
