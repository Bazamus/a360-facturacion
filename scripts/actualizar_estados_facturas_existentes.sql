-- =====================================================
-- Script: Actualizar estados en facturas existentes
-- Descripción: Añade el snapshot del estado del cliente
--              a todas las facturas que no lo tienen
-- =====================================================

-- Actualizar facturas que no tienen estado del cliente
UPDATE facturas f
SET 
  cliente_estado_codigo = ec.codigo,
  cliente_estado_nombre = ec.nombre,
  cliente_estado_color = ec.color
FROM clientes c
JOIN estados_cliente ec ON c.estado_id = ec.id
WHERE f.cliente_id = c.id
  AND (f.cliente_estado_codigo IS NULL 
       OR f.cliente_estado_nombre IS NULL 
       OR f.cliente_estado_color IS NULL);

-- Verificar resultados
SELECT 
  COUNT(*) as total_facturas,
  COUNT(cliente_estado_nombre) as facturas_con_estado,
  COUNT(*) - COUNT(cliente_estado_nombre) as facturas_sin_estado
FROM facturas;
