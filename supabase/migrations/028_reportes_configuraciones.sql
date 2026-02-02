-- =====================================================
-- Migración: Configuraciones de Reportes
-- Descripción: Sistema de guardado de configuraciones de reportes por usuario
-- Fecha: 2026-02-02
-- =====================================================

-- =====================================================
-- 1. Tabla de Configuraciones de Reportes
-- =====================================================

CREATE TABLE reportes_configuraciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  tipo_reporte VARCHAR(50) NOT NULL, -- 'consumos', 'facturacion', 'morosidad', 'comparativo', 'cashflow', 'envios'
  filtros JSONB NOT NULL DEFAULT '{}', -- Filtros aplicados: {comunidad_id, fecha_inicio, fecha_fin, estado, ...}
  columnas_visibles TEXT[], -- Columnas seleccionadas para mostrar (opcional)
  formato_exportacion VARCHAR(20) DEFAULT 'excel', -- 'excel', 'csv', 'pdf'
  opciones_exportacion JSONB DEFAULT '{}', -- Opciones adicionales de exportación
  es_favorito BOOLEAN DEFAULT false,
  orden INTEGER DEFAULT 0, -- Para ordenar configuraciones
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT tipo_reporte_valido CHECK (
    tipo_reporte IN ('consumos', 'facturacion', 'morosidad', 'comparativo', 'cashflow', 'envios', 'remesas')
  ),
  CONSTRAINT formato_exportacion_valido CHECK (
    formato_exportacion IN ('excel', 'csv', 'pdf')
  )
);

COMMENT ON TABLE reportes_configuraciones IS 'Configuraciones guardadas de reportes por usuario';
COMMENT ON COLUMN reportes_configuraciones.filtros IS 'Filtros del reporte en formato JSON (comunidad, fechas, estado, etc.)';
COMMENT ON COLUMN reportes_configuraciones.columnas_visibles IS 'Array de nombres de columnas visibles en el reporte';
COMMENT ON COLUMN reportes_configuraciones.opciones_exportacion IS 'Opciones adicionales de exportación (formato números, incluir gráficos, etc.)';

-- =====================================================
-- 2. Trigger para updated_at
-- =====================================================

CREATE TRIGGER reportes_configuraciones_updated_at
  BEFORE UPDATE ON reportes_configuraciones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 3. Índices
-- =====================================================

CREATE INDEX idx_reportes_config_usuario ON reportes_configuraciones(usuario_id);
CREATE INDEX idx_reportes_config_tipo ON reportes_configuraciones(tipo_reporte);
CREATE INDEX idx_reportes_config_favoritos ON reportes_configuraciones(usuario_id, es_favorito) WHERE es_favorito = true;
CREATE INDEX idx_reportes_config_orden ON reportes_configuraciones(usuario_id, orden);

-- =====================================================
-- 4. Row Level Security
-- =====================================================

ALTER TABLE reportes_configuraciones ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver sus propias configuraciones
CREATE POLICY "Usuarios pueden ver sus propias configuraciones"
  ON reportes_configuraciones
  FOR SELECT
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Los usuarios solo pueden crear sus propias configuraciones
CREATE POLICY "Usuarios pueden crear sus propias configuraciones"
  ON reportes_configuraciones
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

-- Los usuarios solo pueden actualizar sus propias configuraciones
CREATE POLICY "Usuarios pueden actualizar sus propias configuraciones"
  ON reportes_configuraciones
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = usuario_id);

-- Los usuarios solo pueden eliminar sus propias configuraciones
CREATE POLICY "Usuarios pueden eliminar sus propias configuraciones"
  ON reportes_configuraciones
  FOR DELETE
  TO authenticated
  USING (auth.uid() = usuario_id);

-- =====================================================
-- 5. Vista enriquecida de configuraciones
-- =====================================================

CREATE OR REPLACE VIEW v_reportes_configuraciones AS
SELECT 
  rc.id,
  rc.nombre,
  rc.descripcion,
  rc.tipo_reporte,
  rc.filtros,
  rc.columnas_visibles,
  rc.formato_exportacion,
  rc.opciones_exportacion,
  rc.es_favorito,
  rc.orden,
  rc.created_at,
  rc.updated_at,
  rc.usuario_id,
  u.email as usuario_email,
  (u.raw_user_meta_data->>'full_name') as usuario_nombre,
  CASE rc.tipo_reporte
    WHEN 'consumos' THEN 'Consumos'
    WHEN 'facturacion' THEN 'Facturación'
    WHEN 'morosidad' THEN 'Morosidad'
    WHEN 'comparativo' THEN 'Comparativa Temporal'
    WHEN 'cashflow' THEN 'Cash Flow'
    WHEN 'envios' THEN 'Estadísticas de Envíos'
    WHEN 'remesas' THEN 'Remesas SEPA'
    ELSE 'Otro'
  END as tipo_reporte_nombre
FROM reportes_configuraciones rc
LEFT JOIN auth.users u ON rc.usuario_id = u.id;

COMMENT ON VIEW v_reportes_configuraciones IS 'Vista enriquecida de configuraciones de reportes con información del usuario';

GRANT SELECT ON v_reportes_configuraciones TO authenticated;

-- =====================================================
-- 6. Función para duplicar configuración
-- =====================================================

CREATE OR REPLACE FUNCTION duplicar_configuracion_reporte(
  p_configuracion_id UUID,
  p_nuevo_nombre VARCHAR(100) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_nueva_config UUID;
  v_config RECORD;
BEGIN
  -- Obtener configuración original
  SELECT * INTO v_config
  FROM reportes_configuraciones
  WHERE id = p_configuracion_id
    AND usuario_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuración no encontrada o sin permisos';
  END IF;

  -- Crear nueva configuración
  INSERT INTO reportes_configuraciones (
    usuario_id,
    nombre,
    descripcion,
    tipo_reporte,
    filtros,
    columnas_visibles,
    formato_exportacion,
    opciones_exportacion,
    es_favorito,
    orden
  )
  VALUES (
    auth.uid(),
    COALESCE(p_nuevo_nombre, v_config.nombre || ' (copia)'),
    v_config.descripcion,
    v_config.tipo_reporte,
    v_config.filtros,
    v_config.columnas_visibles,
    v_config.formato_exportacion,
    v_config.opciones_exportacion,
    false, -- No marcar como favorito la copia
    (SELECT COALESCE(MAX(orden), 0) + 1 FROM reportes_configuraciones WHERE usuario_id = auth.uid())
  )
  RETURNING id INTO v_nueva_config;

  RETURN v_nueva_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION duplicar_configuracion_reporte IS 'Duplica una configuración de reporte existente para el usuario actual';

GRANT EXECUTE ON FUNCTION duplicar_configuracion_reporte TO authenticated;
