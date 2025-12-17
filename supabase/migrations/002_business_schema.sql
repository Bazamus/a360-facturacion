-- =====================================================
-- Migración 002: Esquema de Negocio Completo
-- Sistema de Facturación de Gestión Energética A360
-- Fase 1: Modelo de Datos y CRUD de Entidades Maestras
-- Fecha: Diciembre 2025
-- =====================================================

-- =====================================================
-- Tabla: comunidades
-- Almacena las comunidades de vecinos gestionadas
-- =====================================================
CREATE TABLE comunidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Datos básicos
  nombre TEXT NOT NULL,
  codigo TEXT UNIQUE NOT NULL, -- Código interno (ej: "TROYA40")
  cif TEXT,
  
  -- Dirección
  direccion TEXT NOT NULL,
  codigo_postal TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  provincia TEXT NOT NULL,
  
  -- Configuración de nomenclatura flexible
  nombre_agrupacion TEXT NOT NULL DEFAULT 'Portal', -- "Portal", "Bloque", "Escalera"
  nombre_ubicacion TEXT NOT NULL DEFAULT 'Vivienda', -- "Vivienda", "Piso", "Local"
  
  -- Contacto
  email TEXT,
  telefono TEXT,
  persona_contacto TEXT,
  
  -- Estado
  activa BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comunidades_codigo ON comunidades(codigo);
CREATE INDEX idx_comunidades_activa ON comunidades(activa);

CREATE TRIGGER comunidades_updated_at
  BEFORE UPDATE ON comunidades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: agrupaciones
-- Representa los portales, bloques o escaleras
-- =====================================================
CREATE TABLE agrupaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunidad_id UUID NOT NULL REFERENCES comunidades(id) ON DELETE CASCADE,
  
  -- Identificación
  nombre TEXT NOT NULL, -- "1", "2", "A", "B", etc.
  descripcion TEXT,
  
  -- Orden de visualización
  orden INTEGER NOT NULL DEFAULT 0,
  
  -- Estado
  activa BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Restricción: nombre único dentro de la comunidad
  UNIQUE(comunidad_id, nombre)
);

CREATE INDEX idx_agrupaciones_comunidad ON agrupaciones(comunidad_id);

CREATE TRIGGER agrupaciones_updated_at
  BEFORE UPDATE ON agrupaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: ubicaciones
-- Representa las viviendas, pisos o locales
-- =====================================================
CREATE TABLE ubicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agrupacion_id UUID NOT NULL REFERENCES agrupaciones(id) ON DELETE CASCADE,
  
  -- Identificación
  nombre TEXT NOT NULL, -- "1ºA", "2ºB", "Bajo C", etc.
  descripcion TEXT,
  
  -- Referencia catastral (opcional)
  referencia_catastral TEXT,
  
  -- Orden de visualización
  orden INTEGER NOT NULL DEFAULT 0,
  
  -- Estado
  activa BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Restricción: nombre único dentro de la agrupación
  UNIQUE(agrupacion_id, nombre)
);

CREATE INDEX idx_ubicaciones_agrupacion ON ubicaciones(agrupacion_id);

CREATE TRIGGER ubicaciones_updated_at
  BEFORE UPDATE ON ubicaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: clientes
-- Almacena propietarios e inquilinos
-- =====================================================
CREATE TYPE tipo_cliente AS ENUM ('propietario', 'inquilino');

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Datos personales
  nombre TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  nif TEXT NOT NULL,
  
  -- Contacto
  email TEXT,
  telefono TEXT,
  telefono_secundario TEXT,
  
  -- Dirección de correspondencia (puede diferir de la ubicación)
  direccion_correspondencia TEXT,
  cp_correspondencia TEXT,
  ciudad_correspondencia TEXT,
  provincia_correspondencia TEXT,
  
  -- Datos bancarios para domiciliación
  iban TEXT,
  titular_cuenta TEXT,
  
  -- Tipo y estado
  tipo tipo_cliente NOT NULL DEFAULT 'propietario',
  activo BOOLEAN NOT NULL DEFAULT true,
  bloqueado BOOLEAN NOT NULL DEFAULT false,
  motivo_bloqueo TEXT,
  
  -- Código interno (para compatibilidad con sistema anterior)
  codigo_cliente TEXT UNIQUE,
  
  -- Notas
  observaciones TEXT,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_nif ON clientes(nif);
CREATE INDEX idx_clientes_codigo ON clientes(codigo_cliente);
CREATE INDEX idx_clientes_tipo ON clientes(tipo);
CREATE INDEX idx_clientes_activo ON clientes(activo);

CREATE TRIGGER clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: ubicaciones_clientes
-- Relaciona ubicaciones con clientes (histórico de ocupantes)
-- =====================================================
CREATE TABLE ubicaciones_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ubicacion_id UUID NOT NULL REFERENCES ubicaciones(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Periodo de ocupación
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE, -- NULL = ocupante actual
  
  -- Es el ocupante actual (solo uno por ubicación puede ser true)
  es_actual BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ubicaciones_clientes_ubicacion ON ubicaciones_clientes(ubicacion_id);
CREATE INDEX idx_ubicaciones_clientes_cliente ON ubicaciones_clientes(cliente_id);
CREATE INDEX idx_ubicaciones_clientes_actual ON ubicaciones_clientes(es_actual) WHERE es_actual = true;

-- Trigger para asegurar solo un ocupante actual por ubicación
CREATE OR REPLACE FUNCTION check_ocupante_actual()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.es_actual = true THEN
    UPDATE ubicaciones_clientes 
    SET es_actual = false, fecha_fin = COALESCE(fecha_fin, CURRENT_DATE)
    WHERE ubicacion_id = NEW.ubicacion_id 
      AND id != NEW.id 
      AND es_actual = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ubicaciones_clientes_check_actual
  BEFORE INSERT OR UPDATE ON ubicaciones_clientes
  FOR EACH ROW EXECUTE FUNCTION check_ocupante_actual();

CREATE TRIGGER ubicaciones_clientes_updated_at
  BEFORE UPDATE ON ubicaciones_clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: conceptos
-- Define los tipos de consumo facturables
-- =====================================================
CREATE TABLE conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  codigo TEXT UNIQUE NOT NULL, -- "ACS", "CAL", "CLI", "TF"
  nombre TEXT NOT NULL, -- "Agua Caliente Sanitaria", "Calefacción", etc.
  descripcion TEXT,
  
  -- Unidad de medida
  unidad_medida TEXT NOT NULL, -- "m³", "Kcal", "Frig", "unidad"
  
  -- Tipo de concepto
  es_termino_fijo BOOLEAN NOT NULL DEFAULT false, -- No requiere lectura
  
  -- Estado
  activo BOOLEAN NOT NULL DEFAULT true,
  
  -- Orden de visualización
  orden INTEGER NOT NULL DEFAULT 0,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insertar conceptos predefinidos
INSERT INTO conceptos (codigo, nombre, unidad_medida, es_termino_fijo, orden) VALUES
  ('ACS', 'Agua Caliente Sanitaria', 'm³', false, 1),
  ('CAL', 'Calefacción', 'Kcal', false, 2),
  ('CLI', 'Climatización', 'Frig', false, 3),
  ('TF', 'Término Fijo', 'unidad', true, 4);

CREATE TRIGGER conceptos_updated_at
  BEFORE UPDATE ON conceptos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: contadores
-- Almacena los contadores físicos instalados
-- =====================================================
CREATE TABLE contadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ubicacion_id UUID NOT NULL REFERENCES ubicaciones(id) ON DELETE CASCADE,
  
  -- Identificación
  numero_serie TEXT UNIQUE NOT NULL, -- Número de serie único del contador
  marca TEXT,
  modelo TEXT,
  
  -- Fechas
  fecha_instalacion DATE,
  fecha_ultima_verificacion DATE,
  
  -- Estado
  activo BOOLEAN NOT NULL DEFAULT true,
  
  -- Notas
  observaciones TEXT,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contadores_ubicacion ON contadores(ubicacion_id);
CREATE INDEX idx_contadores_numero_serie ON contadores(numero_serie);

CREATE TRIGGER contadores_updated_at
  BEFORE UPDATE ON contadores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: contadores_conceptos
-- Relaciona contadores con los conceptos que miden
-- =====================================================
CREATE TABLE contadores_conceptos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contador_id UUID NOT NULL REFERENCES contadores(id) ON DELETE CASCADE,
  concepto_id UUID NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  
  -- Lectura inicial al dar de alta el concepto en este contador
  lectura_inicial DECIMAL(12,4) NOT NULL DEFAULT 0,
  fecha_lectura_inicial DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Última lectura conocida (se actualiza con cada importación)
  lectura_actual DECIMAL(12,4) NOT NULL DEFAULT 0,
  fecha_lectura_actual DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Estado
  activo BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Un contador no puede tener el mismo concepto dos veces
  UNIQUE(contador_id, concepto_id)
);

CREATE INDEX idx_contadores_conceptos_contador ON contadores_conceptos(contador_id);
CREATE INDEX idx_contadores_conceptos_concepto ON contadores_conceptos(concepto_id);

CREATE TRIGGER contadores_conceptos_updated_at
  BEFORE UPDATE ON contadores_conceptos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: precios
-- Define los precios por concepto para cada comunidad
-- =====================================================
CREATE TABLE precios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunidad_id UUID NOT NULL REFERENCES comunidades(id) ON DELETE CASCADE,
  concepto_id UUID NOT NULL REFERENCES conceptos(id) ON DELETE CASCADE,
  
  -- Precio unitario (por unidad de medida del concepto)
  precio_unitario DECIMAL(10,4) NOT NULL,
  
  -- Vigencia
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE, -- NULL = vigente actualmente
  
  -- Estado
  activo BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_precios_comunidad ON precios(comunidad_id);
CREATE INDEX idx_precios_concepto ON precios(concepto_id);
CREATE INDEX idx_precios_vigente ON precios(comunidad_id, concepto_id, fecha_inicio) 
  WHERE activo = true AND fecha_fin IS NULL;

CREATE TRIGGER precios_updated_at
  BEFORE UPDATE ON precios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Políticas RLS
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE comunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrupaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ubicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ubicaciones_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contadores_conceptos ENABLE ROW LEVEL SECURITY;
ALTER TABLE precios ENABLE ROW LEVEL SECURITY;

-- Política general: usuarios autenticados pueden leer todo
CREATE POLICY "Usuarios autenticados pueden leer" ON comunidades
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON agrupaciones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON ubicaciones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON clientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON ubicaciones_clientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON conceptos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON contadores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON contadores_conceptos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON precios
  FOR SELECT TO authenticated USING (true);

-- Política de escritura: usuarios autenticados pueden modificar
CREATE POLICY "Usuarios autenticados pueden modificar" ON comunidades
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON agrupaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON ubicaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON ubicaciones_clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON conceptos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON contadores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON contadores_conceptos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON precios
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- Vistas Útiles
-- =====================================================

-- Vista: Información completa de ubicaciones con su jerarquía
CREATE VIEW v_ubicaciones_completas AS
SELECT 
  u.id AS ubicacion_id,
  u.nombre AS ubicacion_nombre,
  u.referencia_catastral,
  u.activa AS ubicacion_activa,
  a.id AS agrupacion_id,
  a.nombre AS agrupacion_nombre,
  c.id AS comunidad_id,
  c.nombre AS comunidad_nombre,
  c.codigo AS comunidad_codigo,
  c.nombre_agrupacion,
  c.nombre_ubicacion,
  -- Ocupante actual
  cli.id AS cliente_id,
  cli.nombre || ' ' || cli.apellidos AS cliente_nombre,
  cli.nif AS cliente_nif,
  cli.email AS cliente_email,
  cli.tipo AS cliente_tipo,
  uc.fecha_inicio AS fecha_ocupacion
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
LEFT JOIN ubicaciones_clientes uc ON u.id = uc.ubicacion_id AND uc.es_actual = true
LEFT JOIN clientes cli ON uc.cliente_id = cli.id;

-- Vista: Contadores con sus conceptos y precios actuales
CREATE VIEW v_contadores_completos AS
SELECT 
  cont.id AS contador_id,
  cont.numero_serie,
  cont.marca,
  cont.modelo,
  cont.activo AS contador_activo,
  u.id AS ubicacion_id,
  u.nombre AS ubicacion_nombre,
  a.id AS agrupacion_id,
  a.nombre AS agrupacion_nombre,
  com.id AS comunidad_id,
  com.nombre AS comunidad_nombre,
  com.codigo AS comunidad_codigo,
  conc.id AS concepto_id,
  conc.codigo AS concepto_codigo,
  conc.nombre AS concepto_nombre,
  conc.unidad_medida,
  conc.es_termino_fijo,
  cc.lectura_inicial,
  cc.fecha_lectura_inicial,
  cc.lectura_actual,
  cc.fecha_lectura_actual,
  p.precio_unitario
FROM contadores cont
JOIN ubicaciones u ON cont.ubicacion_id = u.id
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades com ON a.comunidad_id = com.id
LEFT JOIN contadores_conceptos cc ON cont.id = cc.contador_id AND cc.activo = true
LEFT JOIN conceptos conc ON cc.concepto_id = conc.id
LEFT JOIN precios p ON com.id = p.comunidad_id 
  AND conc.id = p.concepto_id 
  AND p.activo = true 
  AND p.fecha_fin IS NULL;

-- Vista: Resumen de comunidades con conteos
CREATE VIEW v_comunidades_resumen AS
SELECT 
  c.id,
  c.nombre,
  c.codigo,
  c.ciudad,
  c.activa,
  c.nombre_agrupacion,
  c.nombre_ubicacion,
  COUNT(DISTINCT a.id) AS num_agrupaciones,
  COUNT(DISTINCT u.id) AS num_ubicaciones,
  COUNT(DISTINCT cont.id) AS num_contadores,
  COUNT(DISTINCT uc.cliente_id) FILTER (WHERE uc.es_actual = true) AS num_clientes_actuales
FROM comunidades c
LEFT JOIN agrupaciones a ON c.id = a.comunidad_id AND a.activa = true
LEFT JOIN ubicaciones u ON a.id = u.agrupacion_id AND u.activa = true
LEFT JOIN contadores cont ON u.id = cont.ubicacion_id AND cont.activo = true
LEFT JOIN ubicaciones_clientes uc ON u.id = uc.ubicacion_id
GROUP BY c.id, c.nombre, c.codigo, c.ciudad, c.activa, c.nombre_agrupacion, c.nombre_ubicacion;

-- =====================================================
-- Comentarios de tablas
-- =====================================================
COMMENT ON TABLE comunidades IS 'Comunidades de vecinos gestionadas por A360';
COMMENT ON TABLE agrupaciones IS 'Portales, bloques o escaleras dentro de una comunidad';
COMMENT ON TABLE ubicaciones IS 'Viviendas, pisos o locales dentro de una agrupación';
COMMENT ON TABLE clientes IS 'Propietarios e inquilinos de las ubicaciones';
COMMENT ON TABLE ubicaciones_clientes IS 'Histórico de ocupantes de cada ubicación';
COMMENT ON TABLE conceptos IS 'Tipos de consumo facturables (ACS, Calefacción, etc.)';
COMMENT ON TABLE contadores IS 'Contadores físicos instalados en las ubicaciones';
COMMENT ON TABLE contadores_conceptos IS 'Relación entre contadores y los conceptos que miden';
COMMENT ON TABLE precios IS 'Precios por concepto para cada comunidad';

