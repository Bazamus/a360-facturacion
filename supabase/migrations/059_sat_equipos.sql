BEGIN;

-- ============================================================
-- 059: Gestión de Equipos SAT
-- SEGURIDAD: Solo crea tabla nueva + ADD COLUMN en tablas SAT propias
-- No toca tablas de facturacion
-- ============================================================

-- 1. Tabla: equipos
CREATE TABLE IF NOT EXISTS equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relaciones
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  comunidad_id UUID REFERENCES comunidades(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES contratos_mantenimiento(id) ON DELETE SET NULL,

  -- Identificación
  nombre TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  qr_code TEXT UNIQUE,

  -- Clasificación
  tipo TEXT NOT NULL DEFAULT 'otro'
    CHECK (tipo IN (
      'caldera', 'grupo_presion', 'aerotermia', 'aire_acondicionado',
      'bomba_calor', 'calentador', 'radiador', 'termostato',
      'ascensor', 'sistema_solar', 'otro'
    )),

  -- Instalación
  fecha_instalacion DATE,
  fecha_garantia_fin DATE,
  ubicacion_descripcion TEXT,

  -- Mantenimiento
  ultima_revision DATE,
  proxima_revision DATE,

  -- Estado
  estado TEXT NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo', 'retirado', 'en_reparacion')),

  -- Documentación
  fotos TEXT[],
  manual_url TEXT,
  notas TEXT,

  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipos_cliente ON equipos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_equipos_comunidad ON equipos(comunidad_id);
CREATE INDEX IF NOT EXISTS idx_equipos_tipo ON equipos(tipo);
CREATE INDEX IF NOT EXISTS idx_equipos_estado ON equipos(estado);
CREATE INDEX IF NOT EXISTS idx_equipos_qr ON equipos(qr_code);

CREATE TRIGGER equipos_updated_at
  BEFORE UPDATE ON equipos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2. Vincular equipos con intervenciones y tickets
ALTER TABLE intervenciones
  ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL;

ALTER TABLE tickets_sat
  ADD COLUMN IF NOT EXISTS equipo_id UUID REFERENCES equipos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_intervenciones_equipo ON intervenciones(equipo_id);
CREATE INDEX IF NOT EXISTS idx_tickets_equipo ON tickets_sat(equipo_id);

-- 3. RLS
ALTER TABLE equipos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin y encargado gestionan equipos"
  ON equipos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'encargado')
    )
  );

CREATE POLICY "Tecnico lee equipos"
  ON equipos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'tecnico'
    )
  );

-- 4. Vista: v_equipos_resumen
CREATE OR REPLACE VIEW v_equipos_resumen AS
SELECT
  e.id,
  e.nombre,
  e.marca,
  e.modelo,
  e.numero_serie,
  e.tipo,
  e.estado,
  e.fecha_instalacion,
  e.fecha_garantia_fin,
  e.ultima_revision,
  e.proxima_revision,
  e.qr_code,
  e.created_at,
  -- Cliente
  c.id AS cliente_id,
  c.nombre || ' ' || c.apellidos AS cliente_nombre,
  -- Comunidad
  com.id AS comunidad_id,
  com.nombre AS comunidad_nombre,
  -- Contrato
  ct.id AS contrato_id,
  ct.numero_contrato,
  -- Intervenciones vinculadas
  COALESCE(
    (SELECT COUNT(*) FROM intervenciones i WHERE i.equipo_id = e.id),
    0
  ) AS num_intervenciones,
  -- Garantía vigente
  CASE
    WHEN e.fecha_garantia_fin IS NOT NULL AND e.fecha_garantia_fin >= CURRENT_DATE THEN true
    ELSE false
  END AS en_garantia
FROM equipos e
LEFT JOIN clientes c ON e.cliente_id = c.id
LEFT JOIN comunidades com ON e.comunidad_id = com.id
LEFT JOIN contratos_mantenimiento ct ON e.contrato_id = ct.id;

COMMIT;
