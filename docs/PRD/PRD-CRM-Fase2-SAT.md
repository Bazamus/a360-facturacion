# PRD CRM Fase 2: SAT - Servicio de Asistencia Tecnica

## Sistema CRM/SAT - Expansion sobre Facturacion A360

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energeticos S.L. |
| **Proyecto** | CRM / SAT sobre Sistema de Facturacion |
| **Version** | 2.0 |
| **Fecha** | Enero 2026 |
| **Fase CRM** | 2 de 4 |
| **Dependencia** | Requiere CRM Fase 0 completada |

---

## 1. Objetivo de esta Fase

Implementar el modulo de Servicio de Asistencia Tecnica (SAT) completo: gestion de intervenciones (partes de trabajo), citas con tecnicos, contratos de mantenimiento, catalogo de materiales, y calendario integrado. Al completar esta fase, los tecnicos podran gestionar sus partes de trabajo desde el movil, los encargados tendran vision global del departamento tecnico, y los administradores podran gestionar contratos y citas.

### Entregables principales

- Tablas de SAT en Supabase (sin tocar tablas existentes)
- CRUD completo de Intervenciones (partes de trabajo)
- Sistema de citas con calendario visual
- Gestion de contratos de mantenimiento
- Catalogo de materiales y control de stock basico
- Vista mobile-first para tecnicos
- Integracion con Google Calendar (bidireccional via n8n)
- Firma digital del cliente en intervencion

### Usuarios principales de esta fase

| Rol | Uso principal |
|-----|--------------|
| `admin` | Gestion completa, creacion de contratos |
| `tecnico` | Crear/cerrar partes, ver agenda, firmar con cliente |
| `encargado` | Supervision global, asignar intervenciones, calendario equipo |

---

## 2. Garantias de Seguridad

### 2.1 Impacto en Base de Datos Existente

| Accion | Detalle |
|--------|---------|
| Tablas nuevas | 5 (`contratos_mantenimiento`, `intervenciones`, `citas`, `materiales`, `intervenciones_materiales`) |
| Tablas modificadas | 0 |
| Funciones modificadas | 0 |
| Vistas modificadas | 0 |
| Politicas RLS modificadas | 0 |

**Riesgo para produccion: NULO** - Solo se crean tablas, funciones y vistas nuevas.

### 2.2 Relaciones con Tablas Existentes

Las nuevas tablas referencian tablas existentes con FK de lectura:

```
contratos_mantenimiento.cliente_id    --> clientes.id
contratos_mantenimiento.comunidad_id  --> comunidades.id
intervenciones.cliente_id             --> clientes.id
intervenciones.comunidad_id           --> comunidades.id
intervenciones.contrato_id            --> contratos_mantenimiento.id (tabla nueva)
intervenciones.tecnico_id             --> auth.users.id
intervenciones.encargado_id           --> auth.users.id
citas.cliente_id                      --> clientes.id
citas.intervencion_id                 --> intervenciones.id (tabla nueva)
citas.tecnico_id                      --> auth.users.id
```

Ninguna de estas FK modifica el comportamiento de las tablas existentes.

---

## 3. Modelo de Datos SAT

### 3.1 Diagrama de Entidades

```
┌─────────────────────┐
│contratos_mantenimiento│
│─────────────────────│
│ tipo, periodicidad  │
│ fecha_inicio/fin    │
│ precio, estado      │
└──────┬──────────────┘
       │ 1:N (opcional)
       ▼
┌─────────────────────┐       ┌─────────────────────┐
│   intervenciones    │──────►│       citas          │
│─────────────────────│  1:N  │─────────────────────│
│ tipo, prioridad     │       │ fecha_hora, duracion │
│ estado, diagnostico │       │ tecnico, estado      │
│ solucion, firma     │       │ google_calendar_id   │
└──────┬──────────────┘       └─────────────────────┘
       │ N:M
       ▼
┌─────────────────────┐
│intervenciones_      │
│materiales           │
│─────────────────────│       ┌─────────────────────┐
│ cantidad, precio    │──────►│    materiales        │
│ subtotal            │  N:1  │─────────────────────│
└─────────────────────┘       │ nombre, ref, stock   │
                              │ precio_unitario      │
                              └─────────────────────┘
```

### 3.2 Flujo de una Intervencion

```
                CREAR                  ASIGNAR             PROGRAMAR
  [pendiente] ─────────► [asignada] ─────────► [programada] ──────►
                                                                     │
                                                          EN CAMINO  │
                                                                     ▼
                        CERRAR                  INICIAR
  [completada] ◄──────────── [en_curso] ◄──────────── [en_camino]
       │
       ▼
  [facturada] (opcional, vincula con factura)

  En cualquier momento: [cancelada]
```

### 3.3 Tipos de Intervencion

| Tipo | Descripcion | Requiere contrato |
|------|-------------|-------------------|
| `correctiva` | Reparacion de averia | No |
| `preventiva` | Mantenimiento programado | Habitualmente si |
| `instalacion` | Nueva instalacion | No |
| `inspeccion` | Revision/diagnostico | Puede |
| `urgencia` | Atencion urgente | No |

---

## 4. Migracion SQL: `038_crm_sat.sql`

```sql
BEGIN;

-- ============================================================
-- 1. Tabla: contratos_mantenimiento
-- ============================================================
CREATE TABLE IF NOT EXISTS contratos_mantenimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relaciones
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  comunidad_id UUID REFERENCES comunidades(id) ON DELETE SET NULL,
  
  -- Identificacion
  numero_contrato TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  
  -- Tipo y alcance
  tipo TEXT NOT NULL DEFAULT 'mantenimiento'
    CHECK (tipo IN ('mantenimiento', 'garantia', 'servicio_completo', 'puntual')),
  equipos_cubiertos TEXT[], -- Ej: ['Caldera', 'ACS', 'Climatizacion']
  
  -- Vigencia
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  renovacion_automatica BOOLEAN NOT NULL DEFAULT false,
  
  -- Condiciones
  periodicidad TEXT DEFAULT 'mensual'
    CHECK (periodicidad IN ('semanal', 'quincenal', 'mensual', 'trimestral', 'semestral', 'anual')),
  precio DECIMAL(10,2),
  condiciones TEXT,
  
  -- Estado
  estado TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'activo', 'suspendido', 'finalizado', 'cancelado')),
  
  -- Documentacion
  documento_url TEXT,
  firma_cliente TEXT, -- Base64 SVG de firma digital
  fecha_firma DATE,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON contratos_mantenimiento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_comunidad ON contratos_mantenimiento(comunidad_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estado ON contratos_mantenimiento(estado);
CREATE INDEX IF NOT EXISTS idx_contratos_vigencia ON contratos_mantenimiento(fecha_inicio, fecha_fin);

CREATE TRIGGER contratos_mantenimiento_updated_at
  BEFORE UPDATE ON contratos_mantenimiento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. Tabla: intervenciones (partes de trabajo)
-- ============================================================
CREATE TABLE IF NOT EXISTS intervenciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relaciones
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  comunidad_id UUID REFERENCES comunidades(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES contratos_mantenimiento(id) ON DELETE SET NULL,
  tecnico_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  encargado_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Identificacion
  numero_parte TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  
  -- Tipo y prioridad
  tipo TEXT NOT NULL DEFAULT 'correctiva'
    CHECK (tipo IN ('correctiva', 'preventiva', 'instalacion', 'inspeccion', 'urgencia')),
  prioridad TEXT NOT NULL DEFAULT 'normal'
    CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
  
  -- Estado
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'asignada', 'programada', 'en_camino', 'en_curso', 'completada', 'facturada', 'cancelada')),
  
  -- Descripcion y resolucion
  descripcion TEXT,
  diagnostico TEXT,
  solucion TEXT,
  observaciones_internas TEXT,
  
  -- Ubicacion
  direccion TEXT,
  codigo_postal TEXT,
  ciudad TEXT,
  coordenadas_lat DECIMAL(10,7),
  coordenadas_lng DECIMAL(10,7),
  
  -- Tiempos
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_programada TIMESTAMPTZ,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  duracion_minutos INTEGER,
  
  -- Materiales y costes
  coste_materiales DECIMAL(10,2) DEFAULT 0,
  coste_mano_obra DECIMAL(10,2) DEFAULT 0,
  coste_desplazamiento DECIMAL(10,2) DEFAULT 0,
  coste_total DECIMAL(10,2) DEFAULT 0,
  
  -- Documentacion
  fotos TEXT[],          -- URLs de fotos tomadas
  firma_cliente TEXT,    -- Base64 SVG de firma digital
  firma_tecnico TEXT,    -- Base64 SVG de firma del tecnico
  fecha_firma TIMESTAMPTZ,
  
  -- Vinculacion a factura (futuro)
  factura_id UUID, -- Se llenara cuando se facture
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intervenciones_cliente ON intervenciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_intervenciones_comunidad ON intervenciones(comunidad_id);
CREATE INDEX IF NOT EXISTS idx_intervenciones_contrato ON intervenciones(contrato_id);
CREATE INDEX IF NOT EXISTS idx_intervenciones_tecnico ON intervenciones(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_intervenciones_estado ON intervenciones(estado);
CREATE INDEX IF NOT EXISTS idx_intervenciones_tipo ON intervenciones(tipo);
CREATE INDEX IF NOT EXISTS idx_intervenciones_prioridad ON intervenciones(prioridad);
CREATE INDEX IF NOT EXISTS idx_intervenciones_fecha_prog ON intervenciones(fecha_programada);

CREATE TRIGGER intervenciones_updated_at
  BEFORE UPDATE ON intervenciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. Tabla: citas
-- ============================================================
CREATE TABLE IF NOT EXISTS citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relaciones
  intervencion_id UUID REFERENCES intervenciones(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  tecnico_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Programacion
  fecha_hora TIMESTAMPTZ NOT NULL,
  duracion_minutos INTEGER NOT NULL DEFAULT 60,
  fecha_hora_fin TIMESTAMPTZ GENERATED ALWAYS AS 
    (fecha_hora + (duracion_minutos || ' minutes')::INTERVAL) STORED,
  
  -- Ubicacion
  direccion TEXT,
  notas TEXT,
  
  -- Estado
  estado TEXT NOT NULL DEFAULT 'programada'
    CHECK (estado IN ('programada', 'confirmada', 'en_curso', 'completada', 'cancelada', 'no_show')),
  
  -- Integracion calendario
  google_calendar_event_id TEXT,
  
  -- Notificaciones
  notificacion_enviada BOOLEAN DEFAULT false,
  recordatorio_enviado BOOLEAN DEFAULT false,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_citas_intervencion ON citas(intervencion_id);
CREATE INDEX IF NOT EXISTS idx_citas_tecnico ON citas(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);
CREATE INDEX IF NOT EXISTS idx_citas_google ON citas(google_calendar_event_id);

CREATE TRIGGER citas_updated_at
  BEFORE UPDATE ON citas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. Tabla: materiales (catalogo)
-- ============================================================
CREATE TABLE IF NOT EXISTS materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  nombre TEXT NOT NULL,
  referencia TEXT UNIQUE,
  descripcion TEXT,
  categoria TEXT DEFAULT 'general'
    CHECK (categoria IN ('general', 'fontaneria', 'electricidad', 'climatizacion', 'calefaccion', 'repuestos')),
  
  -- Precios
  precio_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  unidad_medida TEXT NOT NULL DEFAULT 'unidad',
  
  -- Stock
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 0,
  
  -- Estado
  activo BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_materiales_referencia ON materiales(referencia);
CREATE INDEX IF NOT EXISTS idx_materiales_categoria ON materiales(categoria);

CREATE TRIGGER materiales_updated_at
  BEFORE UPDATE ON materiales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. Tabla: intervenciones_materiales (materiales usados)
-- ============================================================
CREATE TABLE IF NOT EXISTS intervenciones_materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  intervencion_id UUID NOT NULL REFERENCES intervenciones(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materiales(id) ON DELETE RESTRICT,
  
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  
  notas TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_int_mat_intervencion ON intervenciones_materiales(intervencion_id);
CREATE INDEX IF NOT EXISTS idx_int_mat_material ON intervenciones_materiales(material_id);

-- ============================================================
-- 6. Politicas RLS
-- ============================================================
ALTER TABLE contratos_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervenciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervenciones_materiales ENABLE ROW LEVEL SECURITY;

-- Contratos: admin y encargado ven todo, tecnico solo lectura
CREATE POLICY "Admin y encargado gestionan contratos"
  ON contratos_mantenimiento FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'encargado')
    )
  );

CREATE POLICY "Tecnico lee contratos"
  ON contratos_mantenimiento FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'tecnico'
    )
  );

CREATE POLICY "Cliente ve sus contratos"
  ON contratos_mantenimiento FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN clientes c ON c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      WHERE p.id = auth.uid() AND p.rol = 'cliente'
      AND contratos_mantenimiento.cliente_id = c.id
    )
  );

-- Intervenciones: admin y encargado ven todo, tecnico sus propias
CREATE POLICY "Admin y encargado gestionan intervenciones"
  ON intervenciones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'encargado')
    )
  );

CREATE POLICY "Tecnico ve y edita sus intervenciones"
  ON intervenciones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'tecnico'
    )
    AND tecnico_id = auth.uid()
  );

-- Citas: similar a intervenciones
CREATE POLICY "Admin y encargado gestionan citas"
  ON citas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'encargado')
    )
  );

CREATE POLICY "Tecnico ve y edita sus citas"
  ON citas FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'tecnico'
    )
    AND tecnico_id = auth.uid()
  );

-- Materiales: todos CRM leen, admin y encargado modifican
CREATE POLICY "Roles CRM leen materiales"
  ON materiales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'tecnico', 'encargado')
    )
  );

CREATE POLICY "Admin y encargado modifican materiales"
  ON materiales FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'encargado')
    )
  );

-- Intervenciones_materiales: hereda acceso de intervenciones
CREATE POLICY "Acceso a materiales de intervencion"
  ON intervenciones_materiales FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'tecnico', 'encargado')
    )
  );

-- ============================================================
-- 7. Vistas
-- ============================================================

CREATE OR REPLACE VIEW v_intervenciones_resumen AS
SELECT 
  i.id,
  i.numero_parte,
  i.titulo,
  i.tipo,
  i.prioridad,
  i.estado,
  i.descripcion,
  i.fecha_solicitud,
  i.fecha_programada,
  i.fecha_inicio,
  i.fecha_fin,
  i.duracion_minutos,
  i.coste_total,
  i.firma_cliente IS NOT NULL AS tiene_firma,
  -- Cliente
  c.id AS cliente_id,
  c.nombre || ' ' || c.apellidos AS cliente_nombre,
  c.telefono AS cliente_telefono,
  -- Comunidad
  com.id AS comunidad_id,
  com.nombre AS comunidad_nombre,
  -- Tecnico
  pt.id AS tecnico_id,
  pt.nombre_completo AS tecnico_nombre,
  -- Encargado
  pe.id AS encargado_id,
  pe.nombre_completo AS encargado_nombre,
  -- Contrato
  ct.numero_contrato,
  ct.titulo AS contrato_titulo,
  -- Materiales usados
  COALESCE(
    (SELECT SUM(im.subtotal) FROM intervenciones_materiales im WHERE im.intervencion_id = i.id),
    0
  ) AS coste_materiales_total,
  COALESCE(
    (SELECT COUNT(*) FROM intervenciones_materiales im WHERE im.intervencion_id = i.id),
    0
  ) AS num_materiales
FROM intervenciones i
LEFT JOIN clientes c ON i.cliente_id = c.id
LEFT JOIN comunidades com ON i.comunidad_id = com.id
LEFT JOIN profiles pt ON i.tecnico_id = pt.id
LEFT JOIN profiles pe ON i.encargado_id = pe.id
LEFT JOIN contratos_mantenimiento ct ON i.contrato_id = ct.id;

CREATE OR REPLACE VIEW v_agenda_tecnicos AS
SELECT 
  ci.id AS cita_id,
  ci.fecha_hora,
  ci.duracion_minutos,
  ci.fecha_hora_fin,
  ci.estado AS cita_estado,
  ci.direccion,
  ci.notas,
  -- Intervencion asociada
  i.id AS intervencion_id,
  i.numero_parte,
  i.titulo AS intervencion_titulo,
  i.tipo AS intervencion_tipo,
  i.prioridad,
  -- Tecnico
  p.id AS tecnico_id,
  p.nombre_completo AS tecnico_nombre,
  -- Cliente
  c.nombre || ' ' || c.apellidos AS cliente_nombre,
  c.telefono AS cliente_telefono
FROM citas ci
LEFT JOIN intervenciones i ON ci.intervencion_id = i.id
LEFT JOIN profiles p ON ci.tecnico_id = p.id
LEFT JOIN clientes c ON ci.cliente_id = c.id
ORDER BY ci.fecha_hora;

CREATE OR REPLACE VIEW v_contratos_activos AS
SELECT 
  ct.id,
  ct.numero_contrato,
  ct.titulo,
  ct.tipo,
  ct.estado,
  ct.fecha_inicio,
  ct.fecha_fin,
  ct.periodicidad,
  ct.precio,
  ct.renovacion_automatica,
  -- Cliente
  c.id AS cliente_id,
  c.nombre || ' ' || c.apellidos AS cliente_nombre,
  -- Comunidad
  com.id AS comunidad_id,
  com.nombre AS comunidad_nombre,
  -- Intervenciones vinculadas
  COALESCE(
    (SELECT COUNT(*) FROM intervenciones i WHERE i.contrato_id = ct.id),
    0
  ) AS num_intervenciones,
  COALESCE(
    (SELECT COUNT(*) FROM intervenciones i WHERE i.contrato_id = ct.id AND i.estado = 'completada'),
    0
  ) AS num_completadas
FROM contratos_mantenimiento ct
LEFT JOIN clientes c ON ct.cliente_id = c.id
LEFT JOIN comunidades com ON ct.comunidad_id = com.id
WHERE ct.estado IN ('activo', 'borrador');

-- ============================================================
-- 8. Funciones
-- ============================================================

-- Generar numero de parte automatico
CREATE OR REPLACE FUNCTION generar_numero_parte()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_anio TEXT;
  v_secuencia INTEGER;
  v_numero TEXT;
BEGIN
  v_anio := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero_parte, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_secuencia
  FROM intervenciones
  WHERE numero_parte LIKE 'SAT-' || v_anio || '-%';
  
  v_numero := 'SAT-' || v_anio || '-' || LPAD(v_secuencia::TEXT, 5, '0');
  
  RETURN v_numero;
END;
$$;

GRANT EXECUTE ON FUNCTION generar_numero_parte TO authenticated;

-- Generar numero de contrato automatico
CREATE OR REPLACE FUNCTION generar_numero_contrato()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_anio TEXT;
  v_secuencia INTEGER;
BEGIN
  v_anio := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(numero_contrato, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_secuencia
  FROM contratos_mantenimiento
  WHERE numero_contrato LIKE 'CTR-' || v_anio || '-%';
  
  RETURN 'CTR-' || v_anio || '-' || LPAD(v_secuencia::TEXT, 4, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION generar_numero_contrato TO authenticated;

-- Crear intervencion con numero automatico
CREATE OR REPLACE FUNCTION crear_intervencion(
  p_titulo TEXT,
  p_tipo TEXT DEFAULT 'correctiva',
  p_prioridad TEXT DEFAULT 'normal',
  p_descripcion TEXT DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_comunidad_id UUID DEFAULT NULL,
  p_contrato_id UUID DEFAULT NULL,
  p_tecnico_id UUID DEFAULT NULL,
  p_direccion TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numero TEXT;
  v_id UUID;
BEGIN
  v_numero := generar_numero_parte();
  
  INSERT INTO intervenciones (
    numero_parte, titulo, tipo, prioridad, descripcion,
    cliente_id, comunidad_id, contrato_id, tecnico_id,
    direccion, estado, created_by
  ) VALUES (
    v_numero, p_titulo, p_tipo, p_prioridad, p_descripcion,
    p_cliente_id, p_comunidad_id, p_contrato_id, p_tecnico_id,
    p_direccion,
    CASE WHEN p_tecnico_id IS NOT NULL THEN 'asignada' ELSE 'pendiente' END,
    auth.uid()
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crear_intervencion TO authenticated;

-- Cerrar intervencion
CREATE OR REPLACE FUNCTION cerrar_intervencion(
  p_intervencion_id UUID,
  p_diagnostico TEXT DEFAULT NULL,
  p_solucion TEXT DEFAULT NULL,
  p_firma_cliente TEXT DEFAULT NULL,
  p_firma_tecnico TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intervencion intervenciones%ROWTYPE;
  v_duracion INTEGER;
  v_coste_mat DECIMAL(10,2);
BEGIN
  -- Obtener intervencion
  SELECT * INTO v_intervencion FROM intervenciones WHERE id = p_intervencion_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intervencion no encontrada';
  END IF;
  
  IF v_intervencion.estado NOT IN ('en_curso', 'programada', 'asignada') THEN
    RAISE EXCEPTION 'La intervencion no esta en un estado que permita cierre (estado actual: %)', v_intervencion.estado;
  END IF;
  
  -- Calcular duracion
  IF v_intervencion.fecha_inicio IS NOT NULL THEN
    v_duracion := EXTRACT(EPOCH FROM (NOW() - v_intervencion.fecha_inicio)) / 60;
  END IF;
  
  -- Calcular coste materiales
  SELECT COALESCE(SUM(subtotal), 0) INTO v_coste_mat
  FROM intervenciones_materiales
  WHERE intervencion_id = p_intervencion_id;
  
  -- Actualizar intervencion
  UPDATE intervenciones SET
    estado = 'completada',
    diagnostico = COALESCE(p_diagnostico, diagnostico),
    solucion = COALESCE(p_solucion, solucion),
    firma_cliente = COALESCE(p_firma_cliente, firma_cliente),
    firma_tecnico = COALESCE(p_firma_tecnico, firma_tecnico),
    fecha_firma = CASE WHEN p_firma_cliente IS NOT NULL THEN NOW() ELSE fecha_firma END,
    fecha_fin = NOW(),
    duracion_minutos = COALESCE(v_duracion, duracion_minutos),
    coste_materiales = v_coste_mat,
    coste_total = v_coste_mat + COALESCE(coste_mano_obra, 0) + COALESCE(coste_desplazamiento, 0)
  WHERE id = p_intervencion_id;
  
  -- Actualizar stock de materiales usados
  UPDATE materiales m SET
    stock_actual = m.stock_actual - im.cantidad
  FROM intervenciones_materiales im
  WHERE im.intervencion_id = p_intervencion_id
    AND im.material_id = m.id;
  
  RETURN json_build_object(
    'success', true,
    'duracion_minutos', v_duracion,
    'coste_materiales', v_coste_mat
  );
END;
$$;

GRANT EXECUTE ON FUNCTION cerrar_intervencion TO authenticated;

-- Obtener agenda de un tecnico
CREATE OR REPLACE FUNCTION get_agenda_tecnico(
  p_tecnico_id UUID,
  p_fecha_inicio DATE DEFAULT CURRENT_DATE,
  p_fecha_fin DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days')::DATE
)
RETURNS TABLE (
  cita_id UUID,
  fecha_hora TIMESTAMPTZ,
  duracion_minutos INTEGER,
  cita_estado TEXT,
  intervencion_id UUID,
  numero_parte TEXT,
  titulo TEXT,
  tipo TEXT,
  prioridad TEXT,
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  direccion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.fecha_hora,
    ci.duracion_minutos,
    ci.estado,
    i.id,
    i.numero_parte,
    i.titulo,
    i.tipo,
    i.prioridad,
    c.nombre || ' ' || c.apellidos,
    c.telefono,
    COALESCE(ci.direccion, i.direccion)
  FROM citas ci
  LEFT JOIN intervenciones i ON ci.intervencion_id = i.id
  LEFT JOIN clientes c ON ci.cliente_id = c.id
  WHERE ci.tecnico_id = p_tecnico_id
    AND ci.fecha_hora >= p_fecha_inicio
    AND ci.fecha_hora < p_fecha_fin + INTERVAL '1 day'
    AND ci.estado NOT IN ('cancelada')
  ORDER BY ci.fecha_hora;
END;
$$;

GRANT EXECUTE ON FUNCTION get_agenda_tecnico TO authenticated;

COMMIT;
```

---

## 5. Integracion Google Calendar

### 5.1 Flujo via n8n

```
Crear/editar cita en app
        │
        ▼
  n8n Webhook (cita creada/editada)
        │
        ▼
  Google Calendar API
  (crear/actualizar evento)
        │
        ▼
  Guardar google_calendar_event_id en citas
        │
        ▼
  (Bidireccional) Cambio en Google Calendar
        │
        ▼
  n8n polling/webhook
        │
        ▼
  Actualizar cita en Supabase
```

### 5.2 Configuracion necesaria

1. Crear proyecto en Google Cloud Console
2. Habilitar Google Calendar API
3. Crear credenciales OAuth2 (o Service Account para calendario compartido)
4. Configurar en n8n como credencial de Google Calendar
5. Crear calendario compartido "A360 SAT" para todos los tecnicos

---

## 6. Frontend

### 6.1 Estructura de Paginas SAT

```
/sat                          -> Dashboard SAT
/sat/intervenciones           -> Lista de intervenciones
/sat/intervenciones/nueva     -> Crear intervencion
/sat/intervenciones/:id       -> Detalle de intervencion
/sat/contratos                -> Lista de contratos
/sat/contratos/nuevo          -> Crear contrato
/sat/contratos/:id            -> Detalle contrato
/sat/materiales               -> Catalogo de materiales
/calendario                   -> Vista calendario global
```

### 6.2 Pantalla: Dashboard SAT

**Ruta:** `/sat`

**KPIs:**
- Intervenciones abiertas (por estado)
- Intervenciones hoy
- Tiempo medio de resolucion
- Proximas citas (hoy y manana)

**Secciones:**
- Grafico de intervenciones por tipo (ultimos 30 dias)
- Lista de urgencias activas
- Tecnicos y su estado actual (disponible/en intervencion)

### 6.3 Pantalla: Lista de Intervenciones

**Ruta:** `/sat/intervenciones`

**Tabla con columnas:**
- Nro Parte, Titulo, Tipo, Prioridad, Estado, Tecnico, Cliente, Comunidad, Fecha

**Filtros:**
- Estado (todos, pendientes, en curso, completadas)
- Tipo (correctiva, preventiva, etc.)
- Tecnico (select)
- Comunidad (select)
- Fecha (rango)

### 6.4 Pantalla: Detalle de Intervencion

**Ruta:** `/sat/intervenciones/:id`

**Tabs:**
1. **Datos Generales** - Info basica, tipo, prioridad, estado con timeline
2. **Diagnostico y Solucion** - Campos de texto para diagnostico y solucion
3. **Materiales** - Lista de materiales usados, buscar/anadir del catalogo
4. **Fotos** - Galeria de fotos (antes/despues)
5. **Firma** - Canvas de firma digital del cliente
6. **Historial** - Timeline de cambios de estado con timestamps

### 6.5 Pantalla: Calendario

**Ruta:** `/calendario`

**Vista:**
- Calendario semanal/mensual con libreria `@fullcalendar/react` o similar
- Eventos coloreados por tipo de intervencion
- Click en evento abre detalle de cita/intervencion
- Filtro por tecnico
- Vista "hoy" para tecnicos (lista cronologica)

### 6.6 Componente: Firma Digital

**Archivo:** `src/features/sat/FirmaDigital.jsx`

Canvas HTML5 para captura de firma:
- Dibuja con dedo (movil) o raton (desktop)
- Botones: Borrar, Guardar
- Exporta como Base64 SVG/PNG
- Se almacena en `intervenciones.firma_cliente`

### 6.7 Vista Mobile-First para Tecnicos

Cuando `profile.rol === 'tecnico'`, la experiencia se optimiza:
- Dashboard simplificado: solo "Mis intervenciones de hoy"
- Lista de citas del dia con navegacion GPS (link a Google Maps)
- Formulario rapido de cierre (diagnostico + solucion + firma)
- Botones grandes y tactiles
- Funciona en pantallas de 320px+

---

## 7. Hooks

### 7.1 Hooks de Intervenciones

**Archivo:** `src/hooks/useIntervenciones.js`

```javascript
useIntervenciones({ estado, tipo, tecnicoId, comunidadId })
useIntervencion(id)
useCrearIntervencion()     // Llama a crear_intervencion()
useCerrarIntervencion()    // Llama a cerrar_intervencion()
useActualizarIntervencion()
useMaterialesIntervencion(intervencionId)
useAnadirMaterial()
useEliminarMaterial()
```

### 7.2 Hooks de Citas

**Archivo:** `src/hooks/useCitas.js`

```javascript
useCitas({ tecnicoId, fechaInicio, fechaFin })
useCita(id)
useCrearCita()
useActualizarCita()
useCancelarCita()
useAgendaTecnico(tecnicoId, fechaInicio, fechaFin)
```

### 7.3 Hooks de Contratos

**Archivo:** `src/hooks/useContratos.js`

```javascript
useContratos({ estado, clienteId, comunidadId })
useContrato(id)
useCrearContrato()
useActualizarContrato()
```

### 7.4 Hooks de Materiales

**Archivo:** `src/hooks/useMateriales.js`

```javascript
useMateriales({ categoria, activo })
useMaterial(id)
useCrearMaterial()
useActualizarMaterial()
```

---

## 8. Tareas de Implementacion

### 8.1 Base de Datos

- [ ] Crear `supabase/migrations/038_crm_sat.sql`
- [ ] Ejecutar en local/staging
- [ ] Verificar sin impacto en tablas existentes
- [ ] Ejecutar en produccion (con backup)

### 8.2 Frontend - Intervenciones

- [ ] Crear `src/hooks/useIntervenciones.js`
- [ ] Crear `src/features/sat/IntervencionesLista.jsx`
- [ ] Crear `src/features/sat/IntervencionDetalle.jsx`
- [ ] Crear `src/features/sat/IntervencionForm.jsx`
- [ ] Crear `src/features/sat/IntervencionTimeline.jsx`
- [ ] Crear `src/features/sat/MaterialesIntervencion.jsx`
- [ ] Crear `src/features/sat/FirmaDigital.jsx`

### 8.3 Frontend - Citas y Calendario

- [ ] Instalar dependencia de calendario (ej: `@fullcalendar/react`)
- [ ] Crear `src/hooks/useCitas.js`
- [ ] Crear `src/features/sat/CalendarioVista.jsx`
- [ ] Crear `src/features/sat/CitaForm.jsx`
- [ ] Crear `src/features/sat/AgendaTecnico.jsx`

### 8.4 Frontend - Contratos

- [ ] Crear `src/hooks/useContratos.js`
- [ ] Crear `src/features/sat/ContratosLista.jsx`
- [ ] Crear `src/features/sat/ContratoDetalle.jsx`
- [ ] Crear `src/features/sat/ContratoForm.jsx`

### 8.5 Frontend - Materiales

- [ ] Crear `src/hooks/useMateriales.js`
- [ ] Crear `src/features/sat/MaterialesCatalogo.jsx`
- [ ] Crear `src/features/sat/MaterialForm.jsx`

### 8.6 Frontend - Vista Tecnico

- [ ] Crear `src/features/sat/TecnicoDashboard.jsx` (mobile-first)
- [ ] Crear `src/features/sat/TecnicoAgendaHoy.jsx`
- [ ] Crear `src/features/sat/TecnicoCierreRapido.jsx`

### 8.7 Integracion Google Calendar

- [ ] Configurar proyecto en Google Cloud Console
- [ ] Crear workflow n8n: Cita creada -> Google Calendar
- [ ] Crear workflow n8n: Google Calendar -> Actualizar cita
- [ ] Probar sincronizacion bidireccional

### 8.8 Rutas y Navegacion

- [ ] Expandir `src/pages/SAT.jsx` con subrutas
- [ ] Expandir `src/pages/Calendario.jsx` con vista calendario
- [ ] Actualizar sidebar con subitems SAT
- [ ] Verificar build: `npm run build`

---

## 9. Criterios de Aceptacion

| # | Criterio | Verificacion |
|---|----------|--------------|
| 1 | **CRUD Intervenciones** | Se pueden crear, asignar, cerrar y cancelar partes de trabajo |
| 2 | **Numeracion automatica** | Los partes tienen formato SAT-YYYY-NNNNN |
| 3 | **Materiales** | Se pueden anadir materiales a una intervencion con calculo de costes |
| 4 | **Firma digital** | El tecnico puede capturar firma del cliente en movil |
| 5 | **Calendario** | Vista calendario muestra citas de todos los tecnicos |
| 6 | **Agenda tecnico** | Cada tecnico ve solo sus citas y partes |
| 7 | **Contratos** | Se pueden crear y gestionar contratos de mantenimiento |
| 8 | **Google Calendar** | Citas se sincronizan con Google Calendar |
| 9 | **Mobile-first** | Vista tecnico funciona correctamente en pantalla movil |
| 10 | **BD sin impacto** | Tablas existentes funcionan identicas |

---

## 10. Dependencias

### 10.1 Requiere

- CRM Fase 0 completada (roles y estructura de rutas)
- CRM Fase 1 es recomendable pero no obligatoria (comunicaciones para notificaciones)

### 10.2 Bloquea

- **CRM Fase 3** (Portal Cliente): Clientes veran sus intervenciones y citas
- Facturacion de intervenciones (futuro: vincular intervencion con factura)

---

## 11. Notas para Agentes de IA

### Orden de Implementacion

1. **Primero:** Migracion SQL completa
2. **Segundo:** Hooks de intervenciones y citas
3. **Tercero:** Componentes SAT (lista, detalle, formulario)
4. **Cuarto:** Firma digital y materiales
5. **Quinto:** Calendario visual
6. **Sexto:** Vista tecnico mobile-first
7. **Septimo:** Contratos
8. **Octavo:** Integracion Google Calendar (n8n)

### Archivos que se CREAN

- `supabase/migrations/038_crm_sat.sql`
- `src/hooks/useIntervenciones.js`
- `src/hooks/useCitas.js`
- `src/hooks/useContratos.js`
- `src/hooks/useMateriales.js`
- `src/features/sat/*.jsx` (multiples componentes)
- `src/pages/SAT.jsx` (expandir placeholder)
- `src/pages/Calendario.jsx` (expandir placeholder)

### Archivos que se MODIFICAN

- `src/hooks/index.js` - Anadir exports
- `src/components/layout/Sidebar.jsx` - Expandir subitems SAT
- `package.json` - Anadir dependencia de calendario

### Consideraciones de rendimiento

- Las intervenciones pueden crecer mucho: usar paginacion desde el inicio
- Calendario: limitar consultas a rango de fechas visible
- Fotos: usar Supabase Storage con URLs firmadas, no base64 en la BD

---

*Fin del PRD CRM Fase 2*
