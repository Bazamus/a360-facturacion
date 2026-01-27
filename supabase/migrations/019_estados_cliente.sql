-- =====================================================
-- Migración: Sistema de Estados de Cliente
-- Descripción: Reemplaza columnas booleanas activo/bloqueado
--              por sistema flexible de estados con gestión en configuración
-- =====================================================

-- 1. Crear tabla estados_cliente
-- =====================================================
CREATE TABLE estados_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  color TEXT NOT NULL CHECK (color IN ('green', 'red', 'yellow', 'gray')),
  permite_facturacion BOOLEAN NOT NULL DEFAULT true,
  es_sistema BOOLEAN NOT NULL DEFAULT false,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_estados_cliente_updated_at
  BEFORE UPDATE ON estados_cliente
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX idx_estados_cliente_codigo ON estados_cliente(codigo);
CREATE INDEX idx_estados_cliente_orden ON estados_cliente(orden);

-- =====================================================
-- 2. Insertar estados predefinidos del sistema
-- =====================================================
INSERT INTO estados_cliente (codigo, nombre, color, permite_facturacion, es_sistema, orden) VALUES
('ACT', 'Activo', 'green', true, true, 1),
('BLOQ', 'Bloqueado', 'red', false, true, 2),
('BAJA', 'Baja', 'red', false, true, 3),
('MOR', 'Moroso', 'yellow', true, true, 4);

-- =====================================================
-- 3. Añadir columna estado_id a tabla clientes
-- =====================================================
ALTER TABLE clientes ADD COLUMN estado_id UUID REFERENCES estados_cliente(id);

-- =====================================================
-- 4. Migrar datos existentes
-- =====================================================

-- Clientes bloqueados → estado 'Bloqueado'
UPDATE clientes 
SET estado_id = (SELECT id FROM estados_cliente WHERE codigo = 'BLOQ')
WHERE bloqueado = true;

-- Clientes inactivos (no bloqueados) → estado 'Baja'
UPDATE clientes 
SET estado_id = (SELECT id FROM estados_cliente WHERE codigo = 'BAJA')
WHERE activo = false AND (bloqueado = false OR bloqueado IS NULL);

-- Clientes activos → estado 'Activo'
UPDATE clientes 
SET estado_id = (SELECT id FROM estados_cliente WHERE codigo = 'ACT')
WHERE activo = true AND (bloqueado = false OR bloqueado IS NULL);

-- Verificar que no queden clientes sin estado
DO $$
DECLARE
  clientes_sin_estado INTEGER;
BEGIN
  SELECT COUNT(*) INTO clientes_sin_estado FROM clientes WHERE estado_id IS NULL;
  
  IF clientes_sin_estado > 0 THEN
    RAISE EXCEPTION 'Existen % clientes sin estado asignado. Revisar datos antes de continuar.', clientes_sin_estado;
  END IF;
END $$;

-- Hacer estado_id NOT NULL
ALTER TABLE clientes ALTER COLUMN estado_id SET NOT NULL;

-- Crear índice
CREATE INDEX idx_clientes_estado_id ON clientes(estado_id);

-- =====================================================
-- 5. Eliminar columnas antiguas
-- =====================================================
ALTER TABLE clientes DROP COLUMN activo;
ALTER TABLE clientes DROP COLUMN bloqueado;
ALTER TABLE clientes DROP COLUMN motivo_bloqueo;

-- =====================================================
-- 6. Actualizar tabla facturas (snapshot de estado del cliente)
-- =====================================================
ALTER TABLE facturas ADD COLUMN cliente_estado_codigo TEXT;
ALTER TABLE facturas ADD COLUMN cliente_estado_nombre TEXT;
ALTER TABLE facturas ADD COLUMN cliente_estado_color TEXT;

-- Migrar datos existentes de facturas (tomar estado actual del cliente)
UPDATE facturas f
SET 
  cliente_estado_codigo = ec.codigo,
  cliente_estado_nombre = ec.nombre,
  cliente_estado_color = ec.color
FROM clientes c
JOIN estados_cliente ec ON c.estado_id = ec.id
WHERE f.cliente_id = c.id;

-- =====================================================
-- 7. RLS (Row Level Security) para estados_cliente
-- =====================================================
ALTER TABLE estados_cliente ENABLE ROW LEVEL SECURITY;

-- Política: Todos los usuarios autenticados pueden leer estados
CREATE POLICY "Estados cliente visibles para usuarios autenticados"
  ON estados_cliente FOR SELECT
  TO authenticated
  USING (true);

-- Política: Solo usuarios autenticados pueden crear estados (no del sistema)
CREATE POLICY "Crear estados cliente personalizados"
  ON estados_cliente FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Solo se pueden actualizar estados no del sistema
CREATE POLICY "Actualizar estados cliente no del sistema"
  ON estados_cliente FOR UPDATE
  TO authenticated
  USING (es_sistema = false)
  WITH CHECK (es_sistema = false);

-- Política: No se pueden eliminar estados del sistema
CREATE POLICY "Eliminar solo estados personalizados"
  ON estados_cliente FOR DELETE
  TO authenticated
  USING (es_sistema = false);

-- =====================================================
-- Comentarios para documentación
-- =====================================================
COMMENT ON TABLE estados_cliente IS 'Estados personalizables de clientes (activo, bloqueado, baja, moroso, etc.)';
COMMENT ON COLUMN estados_cliente.codigo IS 'Código único del estado (ej: ACT, BLOQ, BAJA)';
COMMENT ON COLUMN estados_cliente.color IS 'Color del badge: green, red, yellow, gray';
COMMENT ON COLUMN estados_cliente.permite_facturacion IS 'Si false, muestra advertencia al facturar';
COMMENT ON COLUMN estados_cliente.es_sistema IS 'true para estados predefinidos no eliminables';
COMMENT ON COLUMN clientes.estado_id IS 'Estado actual del cliente';
COMMENT ON COLUMN facturas.cliente_estado_codigo IS 'Snapshot del código de estado al momento de facturar';
COMMENT ON COLUMN facturas.cliente_estado_nombre IS 'Snapshot del nombre de estado al momento de facturar';
COMMENT ON COLUMN facturas.cliente_estado_color IS 'Snapshot del color de estado al momento de facturar';
