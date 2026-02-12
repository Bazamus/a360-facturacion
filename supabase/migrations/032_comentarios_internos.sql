-- =====================================================
-- MIGRACIÓN: Sistema de Comentarios Internos (Notas)
-- =====================================================
-- Permite a los usuarios administrativos agregar notas
-- de seguimiento a clientes, comunidades y otras entidades.
-- =====================================================

-- =====================================================
-- 1. TABLA: comentarios
-- =====================================================

CREATE TABLE comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relación polimórfica (permite comentarios en cualquier entidad)
  entidad_tipo VARCHAR(50) NOT NULL,
  entidad_id UUID NOT NULL,
  
  -- Autor
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Contenido
  contenido TEXT NOT NULL,
  
  -- Clasificación
  prioridad VARCHAR(20) NOT NULL DEFAULT 'normal',
  estado VARCHAR(20) NOT NULL DEFAULT 'abierto',
  etiqueta VARCHAR(50),
  
  -- Flags
  fijado BOOLEAN NOT NULL DEFAULT false,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT chk_entidad_tipo CHECK (entidad_tipo IN ('cliente', 'comunidad', 'contador', 'factura')),
  CONSTRAINT chk_prioridad CHECK (prioridad IN ('baja', 'normal', 'urgente')),
  CONSTRAINT chk_estado CHECK (estado IN ('abierto', 'en_progreso', 'resuelto')),
  CONSTRAINT chk_etiqueta CHECK (
    etiqueta IS NULL OR 
    etiqueta IN ('moroso', 'error_lectura', 'revision', 'incidencia', 'informativo')
  )
);

-- Trigger para updated_at
CREATE TRIGGER comentarios_updated_at
  BEFORE UPDATE ON comentarios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 2. ÍNDICES
-- =====================================================

-- Índice principal: buscar comentarios por entidad
CREATE INDEX idx_comentarios_entidad 
  ON comentarios(entidad_tipo, entidad_id);

-- Índice por usuario
CREATE INDEX idx_comentarios_usuario 
  ON comentarios(usuario_id);

-- Índice por estado (para filtrar abiertos/resueltos)
CREATE INDEX idx_comentarios_estado 
  ON comentarios(estado);

-- Índice para ordenamiento (fijados primero, luego por fecha)
CREATE INDEX idx_comentarios_orden 
  ON comentarios(entidad_tipo, entidad_id, fijado DESC, created_at DESC);

-- =====================================================
-- 3. VISTA: v_comentarios (con datos de usuario)
-- =====================================================

CREATE VIEW v_comentarios AS
SELECT 
  c.id,
  c.entidad_tipo,
  c.entidad_id,
  c.usuario_id,
  c.contenido,
  c.prioridad,
  c.estado,
  c.etiqueta,
  c.fijado,
  c.created_at,
  c.updated_at,
  p.nombre_completo AS usuario_nombre,
  au.email AS usuario_email
FROM comentarios c
JOIN profiles p ON p.id = c.usuario_id
JOIN auth.users au ON au.id = c.usuario_id;

-- =====================================================
-- 4. RLS (Row Level Security)
-- =====================================================

ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden ver comentarios
CREATE POLICY "Usuarios autenticados pueden ver comentarios"
  ON comentarios
  FOR SELECT
  TO authenticated
  USING (true);

-- Todos los usuarios autenticados pueden crear comentarios
CREATE POLICY "Usuarios autenticados pueden crear comentarios"
  ON comentarios
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Solo el autor o un admin puede actualizar
CREATE POLICY "Autor o admin puede actualizar comentarios"
  ON comentarios
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = usuario_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- Solo el autor o un admin puede eliminar
CREATE POLICY "Autor o admin puede eliminar comentarios"
  ON comentarios
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = usuario_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );
