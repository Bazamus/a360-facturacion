-- ============================================================
-- Migración 038: Normalización de teléfonos
-- Problema: buscar_cliente_por_telefono no matchea números con prefijo
--   de país sin '+' (ej: WhatsApp envía '34699486848', cliente tiene '699486848')
-- Solución: función auxiliar normalizar_telefono que:
--   1. Elimina caracteres no numéricos
--   2. Si el número tiene 11 dígitos empezando por '34', elimina el prefijo
-- ============================================================

BEGIN;

-- Función auxiliar de normalización (IMMUTABLE para uso en índices si se necesita)
CREATE OR REPLACE FUNCTION normalizar_telefono(p_tel TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT;
BEGIN
  IF p_tel IS NULL OR TRIM(p_tel) = '' THEN
    RETURN NULL;
  END IF;

  -- 1. Solo dígitos
  v := REGEXP_REPLACE(p_tel, '[^0-9]', '', 'g');

  -- 2. Si tiene 11 dígitos y empieza por 34 (número español con prefijo país sin '+')
  --    ej: 34699486848 → 699486848
  IF LENGTH(v) = 11 AND v LIKE '34%' THEN
    v := SUBSTRING(v, 3);
  END IF;

  RETURN v;
END;
$$;

GRANT EXECUTE ON FUNCTION normalizar_telefono TO authenticated;
GRANT EXECUTE ON FUNCTION normalizar_telefono TO service_role;

-- Reescribir buscar_cliente_por_telefono usando la nueva función auxiliar
CREATE OR REPLACE FUNCTION buscar_cliente_por_telefono(p_telefono TEXT)
RETURNS TABLE (
  cliente_id UUID,
  nombre TEXT,
  apellidos TEXT,
  email TEXT,
  telefono TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tel_norm TEXT;
BEGIN
  v_tel_norm := normalizar_telefono(p_telefono);

  IF v_tel_norm IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.nombre,
    c.apellidos,
    c.email,
    c.telefono
  FROM clientes c
  WHERE
    normalizar_telefono(c.telefono) = v_tel_norm
    OR
    normalizar_telefono(c.telefono_secundario) = v_tel_norm
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION buscar_cliente_por_telefono TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_cliente_por_telefono TO service_role;

COMMIT;
