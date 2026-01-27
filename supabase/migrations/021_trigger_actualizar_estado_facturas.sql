-- =====================================================
-- Migración 021: Trigger para actualizar estado en facturas
-- Descripción: Cuando se cambia el estado de un cliente,
--              actualiza automáticamente todas sus facturas
-- =====================================================

-- 1. Crear función para actualizar estado en facturas
-- =====================================================
CREATE OR REPLACE FUNCTION actualizar_estado_facturas_cliente()
RETURNS TRIGGER AS $$
DECLARE
  v_estado_codigo TEXT;
  v_estado_nombre TEXT;
  v_estado_color TEXT;
BEGIN
  -- Solo ejecutar si cambió el estado_id
  IF OLD.estado_id IS DISTINCT FROM NEW.estado_id THEN
    
    -- Obtener datos del nuevo estado
    SELECT codigo, nombre, color
    INTO v_estado_codigo, v_estado_nombre, v_estado_color
    FROM estados_cliente
    WHERE id = NEW.estado_id;
    
    -- Actualizar todas las facturas del cliente
    UPDATE facturas
    SET 
      cliente_estado_codigo = v_estado_codigo,
      cliente_estado_nombre = v_estado_nombre,
      cliente_estado_color = v_estado_color
    WHERE cliente_id = NEW.id;
    
    -- Log para debugging (opcional)
    RAISE NOTICE 'Actualizadas facturas del cliente % con nuevo estado %', NEW.id, v_estado_nombre;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear trigger en tabla clientes
-- =====================================================
CREATE TRIGGER trigger_actualizar_estado_facturas
  AFTER UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_estado_facturas_cliente();

-- =====================================================
-- Comentarios
-- =====================================================
COMMENT ON FUNCTION actualizar_estado_facturas_cliente() IS 
  'Actualiza el estado del cliente en todas sus facturas cuando cambia el estado_id';
