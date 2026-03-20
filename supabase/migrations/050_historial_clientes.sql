-- =====================================================
-- Migración 050: Historial de Cambios de Clientes
-- Sistema de Facturación A360
-- =====================================================

CREATE TABLE IF NOT EXISTS historial_clientes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id     UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  -- Tipo de evento
  tipo_cambio    TEXT NOT NULL CHECK (tipo_cambio IN ('campo_editado', 'ubicacion_asignada', 'ubicacion_liberada')),
  -- Detalle del campo modificado (NULL para eventos de ubicación)
  campo          TEXT,
  campo_label    TEXT,
  valor_anterior TEXT,
  valor_nuevo    TEXT,
  -- Quién lo hizo
  usuario_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_nombre TEXT,
  -- Descripción libre (usada para eventos de ubicación)
  descripcion    TEXT,
  -- Auditoría
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_clientes_cliente_fecha
  ON historial_clientes(cliente_id, created_at DESC);

ALTER TABLE historial_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_historial_clientes"
  ON historial_clientes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_historial_clientes"
  ON historial_clientes FOR INSERT
  TO authenticated
  WITH CHECK (true);
