BEGIN;

-- ============================================================
-- 054: Historial de cambios de estado en intervenciones
-- SEGURIDAD: Solo crea tabla nueva + trigger en tabla SAT propia
-- No toca tablas de facturacion
-- ============================================================

-- 1. Tabla de historial de cambios de estado
CREATE TABLE IF NOT EXISTS intervenciones_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervencion_id UUID NOT NULL REFERENCES intervenciones(id) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id),
  usuario_nombre TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_int_historial_intervencion
  ON intervenciones_historial(intervencion_id);
CREATE INDEX IF NOT EXISTS idx_int_historial_fecha
  ON intervenciones_historial(created_at);

-- 2. Trigger: registrar cambio de estado automaticamente
CREATE OR REPLACE FUNCTION registrar_cambio_estado_intervencion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nombre TEXT;
BEGIN
  -- Solo registrar si el estado cambio
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    -- Obtener nombre del usuario
    SELECT nombre_completo INTO v_nombre
    FROM profiles
    WHERE id = auth.uid();

    INSERT INTO intervenciones_historial (
      intervencion_id, estado_anterior, estado_nuevo,
      usuario_id, usuario_nombre
    ) VALUES (
      NEW.id, OLD.estado, NEW.estado,
      auth.uid(), v_nombre
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_intervencion_cambio_estado
  AFTER UPDATE ON intervenciones
  FOR EACH ROW
  EXECUTE FUNCTION registrar_cambio_estado_intervencion();

-- 3. Registrar estado inicial en INSERT
CREATE OR REPLACE FUNCTION registrar_estado_inicial_intervencion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nombre TEXT;
BEGIN
  SELECT nombre_completo INTO v_nombre
  FROM profiles
  WHERE id = auth.uid();

  INSERT INTO intervenciones_historial (
    intervencion_id, estado_anterior, estado_nuevo,
    usuario_id, usuario_nombre
  ) VALUES (
    NEW.id, NULL, NEW.estado,
    auth.uid(), v_nombre
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_intervencion_estado_inicial
  AFTER INSERT ON intervenciones
  FOR EACH ROW
  EXECUTE FUNCTION registrar_estado_inicial_intervencion();

-- 4. RLS
ALTER TABLE intervenciones_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Roles CRM leen historial intervenciones"
  ON intervenciones_historial FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rol IN ('admin', 'tecnico', 'encargado')
    )
  );

CREATE POLICY "Sistema inserta historial"
  ON intervenciones_historial FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMIT;
