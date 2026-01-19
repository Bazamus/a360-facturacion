-- =====================================================
-- Script de limpieza: Eliminar "2/" de facturas existentes
-- EJECUTAR MANUALMENTE EN SUPABASE DESPUÉS DE LA MIGRACIÓN 008
-- =====================================================

-- Este script NO es necesario porque la columna numero_completo es GENERATED ALWAYS
-- Al modificar la definición de la columna computed, se recalcula automáticamente
-- para todas las filas existentes.

-- Sin embargo, si quisieras verificar los cambios, puedes ejecutar:

-- Ver facturas antes y después (solo para verificación)
SELECT
  id,
  serie,
  numero,
  numero_completo,
  cliente_nombre,
  total
FROM facturas
WHERE numero IS NOT NULL
ORDER BY numero DESC
LIMIT 10;

-- El numero_completo ahora debería mostrar solo el número (ej: 230371985)
-- sin el prefijo "2/" (que era: 2/230371985)
