# PRD Fase 1: Modelo de Datos y CRUD de Entidades Maestras

## Sistema de Facturación de Gestión Energética A360

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energéticos S.L. |
| **Proyecto** | Sistema de Facturación Energética |
| **Versión** | 1.0 |
| **Fecha** | Diciembre 2025 |
| **Fase** | 1 de 5 |
| **Dependencia** | Requiere Fase 0 completada |

---

## 1. Objetivo de esta Fase

Esta fase implementa el modelo de datos completo del negocio y las interfaces de administración (CRUD) para todas las entidades maestras. Al completarla, el sistema permitirá gestionar comunidades, clientes, contadores y conceptos de facturación, estableciendo la base sobre la que se construirán las funcionalidades de importación de lecturas y facturación.

### Entregables principales

- Esquema de base de datos completo con todas las tablas del negocio
- CRUD de Comunidades con configuración de nomenclatura flexible
- CRUD de Agrupaciones (Portales/Bloques)
- CRUD de Ubicaciones (Viviendas/Pisos)
- CRUD de Contadores con asignación de conceptos
- CRUD de Clientes (propietarios e inquilinos)
- CRUD de Conceptos de Facturación
- CRUD de Precios por Comunidad
- Sistema de navegación jerárquica entre entidades

---

## 2. Modelo de Datos

### 2.1 Diagrama de Entidades (Conceptual)

```
┌─────────────────┐
│   COMUNIDADES   │
│─────────────────│
│ Configuración   │
│ de nomenclatura │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐
│  AGRUPACIONES   │
│─────────────────│
│ Portal / Bloque │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│   UBICACIONES   │       │    CLIENTES     │
│─────────────────│       │─────────────────│
│ Vivienda / Piso │◄──────│ Propietario o   │
└────────┬────────┘  N:1  │ Inquilino       │
         │                └─────────────────┘
         │ 1:N
         ▼
┌─────────────────┐       ┌─────────────────┐
│   CONTADORES    │       │   CONCEPTOS     │
│─────────────────│       │─────────────────│
│ Nº Serie único  │◄──────│ ACS, Calef...   │
└─────────────────┘  N:M  └─────────────────┘
                          
┌─────────────────┐
│     PRECIOS     │
│─────────────────│
│ Por comunidad   │
│ y concepto      │
└─────────────────┘
```

### 2.2 Reglas de Negocio del Modelo

1. **Jerarquía flexible:** Cada comunidad define cómo nombrar sus agrupaciones (Portal/Bloque/Escalera) y ubicaciones (Vivienda/Piso/Local).

2. **Contador permanente:** El contador está vinculado a una ubicación física y nunca cambia, aunque cambien los ocupantes.

3. **Multiconcepto:** Un contador puede medir varios conceptos (ej: ACS + Calefacción), cada uno con su propio precio.

4. **Ocupante actual:** Una ubicación tiene siempre un ocupante actual (propietario o inquilino). El histórico de ocupantes se mantiene.

5. **Precios por comunidad:** Cada comunidad puede tener precios diferentes para los mismos conceptos.

6. **Término fijo:** Es un concepto especial que no depende de lecturas, se factura íntegro mensualmente.

---

## 3. Esquema de Base de Datos

### 3.1 Tabla: `comunidades`

Almacena las comunidades de vecinos gestionadas.

```sql
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
```

### 3.2 Tabla: `agrupaciones`

Representa los portales, bloques o escaleras dentro de una comunidad.

```sql
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
```

### 3.3 Tabla: `ubicaciones`

Representa las viviendas, pisos o locales dentro de una agrupación.

```sql
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
```

### 3.4 Tabla: `clientes`

Almacena propietarios e inquilinos.

```sql
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
```

### 3.5 Tabla: `ubicaciones_clientes`

Relaciona ubicaciones con clientes (histórico de ocupantes).

```sql
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
```

### 3.6 Tabla: `conceptos`

Define los tipos de consumo facturables.

```sql
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
```

### 3.7 Tabla: `contadores`

Almacena los contadores físicos instalados.

```sql
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
```

### 3.8 Tabla: `contadores_conceptos`

Relaciona contadores con los conceptos que miden.

```sql
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
```

### 3.9 Tabla: `precios`

Define los precios por concepto para cada comunidad.

```sql
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
```

### 3.10 Políticas RLS

```sql
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
-- (En producción se restringiría por rol)
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
```

### 3.11 Vistas Útiles

```sql
-- Vista: Información completa de ubicaciones con su jerarquía
CREATE VIEW v_ubicaciones_completas AS
SELECT 
  u.id AS ubicacion_id,
  u.nombre AS ubicacion_nombre,
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
LEFT JOIN clientes cli ON uc.cliente_id = cli.id
WHERE u.activa = true;

-- Vista: Contadores con sus conceptos y precios actuales
CREATE VIEW v_contadores_completos AS
SELECT 
  cont.id AS contador_id,
  cont.numero_serie,
  u.id AS ubicacion_id,
  u.nombre AS ubicacion_nombre,
  a.nombre AS agrupacion_nombre,
  com.id AS comunidad_id,
  com.nombre AS comunidad_nombre,
  conc.id AS concepto_id,
  conc.codigo AS concepto_codigo,
  conc.nombre AS concepto_nombre,
  conc.unidad_medida,
  conc.es_termino_fijo,
  cc.lectura_actual,
  cc.fecha_lectura_actual,
  p.precio_unitario
FROM contadores cont
JOIN ubicaciones u ON cont.ubicacion_id = u.id
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades com ON a.comunidad_id = com.id
JOIN contadores_conceptos cc ON cont.id = cc.contador_id AND cc.activo = true
JOIN conceptos conc ON cc.concepto_id = conc.id
LEFT JOIN precios p ON com.id = p.comunidad_id 
  AND conc.id = p.concepto_id 
  AND p.activo = true 
  AND p.fecha_fin IS NULL
WHERE cont.activo = true;
```

---

## 4. Interfaces de Usuario

### 4.1 Estructura de Navegación

```
📍 Comunidades
   └── Lista de comunidades
       └── Detalle Comunidad
           ├── Datos generales
           ├── Agrupaciones (Portales)
           │   └── Ubicaciones (Viviendas)
           │       └── Contadores
           └── Precios

👥 Clientes
   └── Lista de clientes
       └── Detalle Cliente
           ├── Datos personales
           ├── Datos bancarios
           └── Ubicaciones asociadas

🔢 Contadores
   └── Lista de contadores
       └── Detalle Contador
           ├── Datos del contador
           ├── Conceptos asignados
           └── Historial de lecturas

⚙️ Configuración
   └── Conceptos de facturación
```

### 4.2 Pantalla: Lista de Comunidades

**Ruta:** `/comunidades`

**Componentes:**
- Tabla con columnas: Código, Nombre, Ciudad, Nº Agrupaciones, Nº Ubicaciones, Estado
- Buscador por nombre o código
- Filtro por estado (activa/inactiva)
- Botón "Nueva Comunidad"
- Acciones por fila: Ver, Editar, Desactivar

**Funcionalidades:**
- Ordenación por columnas
- Paginación (20 registros por página)
- Click en fila navega al detalle

### 4.3 Pantalla: Detalle/Edición de Comunidad

**Ruta:** `/comunidades/:id`

**Tabs:**
1. **Datos Generales**
   - Formulario con campos de la tabla `comunidades`
   - Selector de nomenclatura (nombre_agrupacion, nombre_ubicacion)
   
2. **Agrupaciones**
   - Lista de agrupaciones de esta comunidad
   - CRUD inline o modal
   - Expandible para ver ubicaciones de cada agrupación
   
3. **Ubicaciones**
   - Vista árbol: Agrupación > Ubicaciones
   - Cada ubicación muestra: nombre, ocupante actual, nº contadores
   - CRUD de ubicaciones
   
4. **Precios**
   - Tabla: Concepto, Precio Unitario, Desde, Hasta
   - Permite añadir/editar precios por concepto
   - Histórico de precios anteriores

### 4.4 Pantalla: Lista de Clientes

**Ruta:** `/clientes`

**Componentes:**
- Tabla con columnas: Código, Nombre, NIF, Email, Tipo, Comunidad, Ubicación, Estado
- Buscador por nombre, NIF o código
- Filtros: Tipo (propietario/inquilino), Estado (activo/bloqueado), Comunidad
- Botón "Nuevo Cliente"
- Acciones por fila: Ver, Editar, Bloquear/Desbloquear

### 4.5 Pantalla: Detalle/Edición de Cliente

**Ruta:** `/clientes/:id`

**Secciones:**
1. **Datos Personales**
   - Nombre, Apellidos, NIF
   - Email, Teléfonos
   - Tipo (propietario/inquilino)
   
2. **Dirección de Correspondencia**
   - Campos de dirección
   - Checkbox "Usar dirección de la ubicación"
   
3. **Datos Bancarios**
   - IBAN con validación de formato
   - Titular de la cuenta
   
4. **Ubicaciones**
   - Lista de ubicaciones actuales y anteriores
   - Permite asignar a nueva ubicación
   - Historial de ocupación

5. **Estado**
   - Activo/Inactivo
   - Bloqueado (con motivo)

### 4.6 Pantalla: Lista de Contadores

**Ruta:** `/contadores`

**Componentes:**
- Tabla: Nº Serie, Comunidad, Agrupación, Ubicación, Conceptos, Última Lectura
- Buscador por número de serie
- Filtros: Comunidad, Concepto, Estado
- Botón "Nuevo Contador"

### 4.7 Pantalla: Detalle/Edición de Contador

**Ruta:** `/contadores/:id`

**Secciones:**
1. **Datos del Contador**
   - Número de serie (solo lectura si ya tiene lecturas)
   - Marca, Modelo
   - Fecha instalación, Última verificación
   - Ubicación (selector jerárquico: Comunidad > Agrupación > Ubicación)

2. **Conceptos Asignados**
   - Lista de conceptos que mide este contador
   - Para cada concepto: Lectura inicial, Lectura actual, Fecha
   - Permite añadir/quitar conceptos

3. **Historial de Lecturas** (solo visualización, las lecturas se gestionan en Fase 2)
   - Tabla: Fecha, Concepto, Lectura, Consumo

### 4.8 Pantalla: Conceptos de Facturación

**Ruta:** `/configuracion/conceptos`

**Componentes:**
- Tabla: Código, Nombre, Unidad, Tipo, Estado
- Solo admins pueden añadir/editar conceptos
- Los conceptos predefinidos (ACS, CAL, CLI, TF) no se pueden eliminar

---

## 5. Componentes Reutilizables

### 5.1 Componentes de Formulario

| Componente | Descripción |
|------------|-------------|
| `FormInput` | Input de texto con label, error y validación |
| `FormSelect` | Select con opciones dinámicas |
| `FormCheckbox` | Checkbox con label |
| `FormTextarea` | Textarea con contador de caracteres |
| `FormIBAN` | Input especializado para IBAN con validación |
| `FormNIF` | Input especializado para NIF/CIF con validación |
| `FormDate` | Selector de fecha en formato DD/MM/YYYY |
| `FormNumber` | Input numérico con formato español |

### 5.2 Componentes de UI

| Componente | Descripción |
|------------|-------------|
| `DataTable` | Tabla con ordenación, paginación y acciones |
| `SearchInput` | Buscador con debounce |
| `FilterDropdown` | Dropdown de filtros múltiples |
| `Modal` | Modal genérico con variantes (confirm, form) |
| `Tabs` | Navegación por pestañas |
| `Badge` | Etiquetas de estado (activo, bloqueado, etc.) |
| `EmptyState` | Mensaje cuando no hay datos |
| `LoadingSpinner` | Indicador de carga |
| `Toast` | Notificaciones temporales |
| `Breadcrumb` | Navegación de migas de pan |

### 5.3 Selectores Jerárquicos

| Componente | Descripción |
|------------|-------------|
| `ComunidadSelector` | Selector de comunidad |
| `AgrupacionSelector` | Selector de agrupación (filtrado por comunidad) |
| `UbicacionSelector` | Selector de ubicación (filtrado por agrupación) |
| `JerarquiaSelector` | Selector combinado Comunidad > Agrupación > Ubicación |
| `ClienteSelector` | Buscador/selector de cliente por nombre o NIF |
| `ConceptoSelector` | Selector múltiple de conceptos |

---

## 6. Hooks Personalizados

### 6.1 Hooks de Datos

```javascript
// Comunidades
useComunidades()           // Lista todas las comunidades
useComunidad(id)           // Detalle de una comunidad
useCreateComunidad()       // Crear comunidad
useUpdateComunidad()       // Actualizar comunidad
useDeleteComunidad()       // Eliminar/desactivar comunidad

// Agrupaciones
useAgrupaciones(comunidadId)
useAgrupacion(id)
useCreateAgrupacion()
useUpdateAgrupacion()
useDeleteAgrupacion()

// Ubicaciones
useUbicaciones(agrupacionId)
useUbicacion(id)
useCreateUbicacion()
useUpdateUbicacion()
useDeleteUbicacion()

// Clientes
useClientes(filtros)
useCliente(id)
useCreateCliente()
useUpdateCliente()
useDeleteCliente()
useAsignarClienteUbicacion()

// Contadores
useContadores(filtros)
useContador(id)
useCreateContador()
useUpdateContador()
useDeleteContador()
useAsignarConceptoContador()

// Conceptos
useConceptos()
useConcepto(id)

// Precios
usePrecios(comunidadId)
useCreatePrecio()
useUpdatePrecio()
```

### 6.2 Hooks de Utilidad

```javascript
useDebounce(value, delay)      // Debounce para búsquedas
usePagination(data, pageSize)  // Paginación local
useSort(data, config)          // Ordenación de tablas
useFilter(data, filters)       // Filtrado de datos
useModal()                     // Control de modales
useToast()                     // Notificaciones
```

---

## 7. Validaciones

### 7.1 Esquemas Zod

```javascript
// Comunidad
const comunidadSchema = z.object({
  nombre: z.string().min(3, 'Mínimo 3 caracteres').max(100),
  codigo: z.string().min(2).max(20).regex(/^[A-Z0-9]+$/, 'Solo mayúsculas y números'),
  cif: z.string().regex(/^[A-Z]\d{8}$/, 'Formato CIF inválido').optional().or(z.literal('')),
  direccion: z.string().min(5).max(200),
  codigo_postal: z.string().regex(/^\d{5}$/, 'Código postal inválido'),
  ciudad: z.string().min(2).max(100),
  provincia: z.string().min(2).max(100),
  nombre_agrupacion: z.enum(['Portal', 'Bloque', 'Escalera']),
  nombre_ubicacion: z.enum(['Vivienda', 'Piso', 'Local']),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().max(20).optional(),
});

// Cliente
const clienteSchema = z.object({
  nombre: z.string().min(2).max(50),
  apellidos: z.string().min(2).max(100),
  nif: z.string().regex(/^[0-9]{8}[A-Z]$|^[A-Z][0-9]{8}$/, 'NIF/CIF inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().max(20).optional(),
  iban: z.string()
    .regex(/^ES\d{22}$/, 'IBAN español inválido')
    .optional()
    .or(z.literal('')),
  tipo: z.enum(['propietario', 'inquilino']),
});

// Contador
const contadorSchema = z.object({
  numero_serie: z.string().min(5).max(50),
  ubicacion_id: z.string().uuid('Debe seleccionar una ubicación'),
  marca: z.string().max(50).optional(),
  modelo: z.string().max(50).optional(),
  fecha_instalacion: z.date().optional(),
});

// Precio
const precioSchema = z.object({
  comunidad_id: z.string().uuid(),
  concepto_id: z.string().uuid(),
  precio_unitario: z.number().positive('El precio debe ser mayor que 0'),
  fecha_inicio: z.date(),
});
```

### 7.2 Validación de IBAN Español

```javascript
function validarIBAN(iban) {
  // Eliminar espacios y convertir a mayúsculas
  iban = iban.replace(/\s/g, '').toUpperCase();
  
  // Verificar formato español
  if (!/^ES\d{22}$/.test(iban)) return false;
  
  // Mover los 4 primeros caracteres al final
  const reordenado = iban.slice(4) + iban.slice(0, 4);
  
  // Convertir letras a números (A=10, B=11, ..., Z=35)
  const numerico = reordenado.replace(/[A-Z]/g, c => c.charCodeAt(0) - 55);
  
  // Verificar módulo 97
  return mod97(numerico) === 1;
}

function mod97(numStr) {
  let remainder = 0;
  for (let i = 0; i < numStr.length; i++) {
    remainder = (remainder * 10 + parseInt(numStr[i])) % 97;
  }
  return remainder;
}
```

### 7.3 Validación de NIF/CIF

```javascript
function validarNIF(nif) {
  nif = nif.toUpperCase().trim();
  
  // NIF personal: 8 dígitos + letra
  if (/^\d{8}[A-Z]$/.test(nif)) {
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const numero = parseInt(nif.slice(0, 8));
    return nif[8] === letras[numero % 23];
  }
  
  // CIF empresarial: letra + 7 dígitos + control
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[A-J0-9]$/.test(nif)) {
    return true; // Simplificado, validación completa más compleja
  }
  
  // NIE extranjero: X/Y/Z + 7 dígitos + letra
  if (/^[XYZ]\d{7}[A-Z]$/.test(nif)) {
    const niePrefix = { X: '0', Y: '1', Z: '2' };
    const converted = niePrefix[nif[0]] + nif.slice(1, 8);
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE';
    return nif[8] === letras[parseInt(converted) % 23];
  }
  
  return false;
}
```

---

## 8. Tareas de Implementación

### 8.1 Base de Datos

- [ ] Crear archivo `supabase/migrations/002_business_schema.sql`
- [ ] Ejecutar migración de tablas principales
- [ ] Ejecutar migración de políticas RLS
- [ ] Crear vistas útiles
- [ ] Insertar datos de conceptos predefinidos
- [ ] Verificar triggers funcionan correctamente

### 8.2 Estructura de Carpetas

- [ ] Crear `src/features/comunidades/`
- [ ] Crear `src/features/clientes/`
- [ ] Crear `src/features/contadores/`
- [ ] Crear `src/components/ui/` con componentes base
- [ ] Crear `src/lib/validations/` con esquemas Zod

### 8.3 Componentes UI Base

- [ ] Implementar `FormInput`
- [ ] Implementar `FormSelect`
- [ ] Implementar `FormCheckbox`
- [ ] Implementar `FormTextarea`
- [ ] Implementar `FormDate`
- [ ] Implementar `FormNumber`
- [ ] Implementar `DataTable`
- [ ] Implementar `Modal`
- [ ] Implementar `Tabs`
- [ ] Implementar `Badge`
- [ ] Implementar `Toast`
- [ ] Implementar `Breadcrumb`
- [ ] Implementar `EmptyState`
- [ ] Implementar `LoadingSpinner`

### 8.4 Módulo Comunidades

- [ ] Implementar `useComunidades` hook
- [ ] Implementar `useComunidad` hook
- [ ] Implementar `useCreateComunidad` hook
- [ ] Implementar `useUpdateComunidad` hook
- [ ] Crear página `ComunidadesListPage`
- [ ] Crear página `ComunidadDetailPage`
- [ ] Crear componente `ComunidadForm`
- [ ] Crear componente `AgrupacionesList`
- [ ] Crear componente `AgrupacionForm`
- [ ] Crear componente `UbicacionesList`
- [ ] Crear componente `UbicacionForm`
- [ ] Crear componente `PreciosList`
- [ ] Crear componente `PrecioForm`

### 8.5 Módulo Clientes

- [ ] Implementar hooks de clientes
- [ ] Crear página `ClientesListPage`
- [ ] Crear página `ClienteDetailPage`
- [ ] Crear componente `ClienteForm`
- [ ] Crear componente `FormIBAN`
- [ ] Crear componente `FormNIF`
- [ ] Crear componente `UbicacionesClienteList`
- [ ] Crear componente `AsignarUbicacionModal`

### 8.6 Módulo Contadores

- [ ] Implementar hooks de contadores
- [ ] Crear página `ContadoresListPage`
- [ ] Crear página `ContadorDetailPage`
- [ ] Crear componente `ContadorForm`
- [ ] Crear componente `JerarquiaSelector`
- [ ] Crear componente `ConceptosContadorList`
- [ ] Crear componente `AsignarConceptoModal`

### 8.7 Configuración

- [ ] Crear página `ConceptosPage`
- [ ] Crear componente `ConceptoForm`

### 8.8 Navegación y Rutas

- [ ] Añadir rutas a React Router
- [ ] Actualizar Sidebar con nuevas secciones
- [ ] Implementar Breadcrumbs en todas las páginas

### 8.9 Testing y Validación

- [ ] Probar CRUD completo de comunidades
- [ ] Probar CRUD completo de clientes
- [ ] Probar CRUD completo de contadores
- [ ] Probar asignación cliente-ubicación
- [ ] Probar asignación concepto-contador
- [ ] Probar validaciones de formularios
- [ ] Verificar navegación jerárquica

### 8.10 Documentación

- [ ] Actualizar README con nuevas funcionalidades
- [ ] Documentar estructura de carpetas actualizada
- [ ] Crear `docs/PRD/fase-1.md`
- [ ] Merge de `phase/1` a `develop`

---

## 9. Criterios de Aceptación

| # | Criterio | Verificación |
|---|----------|--------------|
| 1 | **Esquema de BD completo** | Todas las tablas creadas con RLS habilitado |
| 2 | **CRUD Comunidades** | Se pueden crear, editar, listar y desactivar comunidades |
| 3 | **CRUD Agrupaciones** | Se pueden gestionar agrupaciones dentro de comunidades |
| 4 | **CRUD Ubicaciones** | Se pueden gestionar ubicaciones dentro de agrupaciones |
| 5 | **CRUD Clientes** | Se pueden crear y editar clientes con validación de NIF/IBAN |
| 6 | **Asignación ocupantes** | Se puede asignar un cliente a una ubicación como ocupante actual |
| 7 | **CRUD Contadores** | Se pueden crear contadores y asignarles conceptos |
| 8 | **Gestión de precios** | Se pueden definir precios por concepto para cada comunidad |
| 9 | **Navegación jerárquica** | Se puede navegar fluidamente entre comunidad > agrupación > ubicación > contador |
| 10 | **Validaciones** | Todos los formularios validan correctamente los datos |

---

## 10. Dependencias

### 10.1 Requiere de Fase 0

- Proyecto React configurado
- Supabase inicializado con tabla `profiles`
- Autenticación funcionando
- Layout y navegación base

### 10.2 Bloquea Fase 2

La Fase 2 (Importación de Lecturas) requiere:
- Tabla `contadores` con contadores dados de alta
- Tabla `contadores_conceptos` con conceptos asignados
- Vista `v_contadores_completos` funcionando

---

## 11. Notas para Agentes de IA

### Orden de Implementación Recomendado

1. **Primero:** Base de datos completa (todas las migraciones)
2. **Segundo:** Componentes UI base (se reutilizarán en todo)
3. **Tercero:** Módulo de Comunidades (es la raíz de la jerarquía)
4. **Cuarto:** Módulo de Clientes (independiente de la jerarquía)
5. **Quinto:** Módulo de Contadores (depende de ubicaciones)
6. **Sexto:** Configuración de conceptos

### Patrones a Seguir

**Estructura de página lista:**
```jsx
function EntidadListPage() {
  const { data, isLoading, error } = useEntidades();
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState mensaje="No hay registros" />;
  
  return (
    <div>
      <PageHeader titulo="Entidades" accion={<BotonNuevo />} />
      <Filtros />
      <DataTable data={data} columns={columns} />
    </div>
  );
}
```

**Estructura de página detalle:**
```jsx
function EntidadDetailPage() {
  const { id } = useParams();
  const { data, isLoading } = useEntidad(id);
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      <Breadcrumb items={[...]} />
      <PageHeader titulo={data.nombre} />
      <Tabs>
        <Tab label="Datos">
          <EntidadForm data={data} />
        </Tab>
        <Tab label="Relacionados">
          <RelacionadosList entidadId={id} />
        </Tab>
      </Tabs>
    </div>
  );
}
```

### Manejo de Errores en Supabase

```javascript
async function handleSubmit(data) {
  try {
    const { error } = await supabase.from('tabla').insert(data);
    if (error) throw error;
    toast.success('Guardado correctamente');
    navigate('/lista');
  } catch (error) {
    console.error('Error:', error);
    toast.error(error.message || 'Error al guardar');
  }
}
```

### Formato de Números

```javascript
// Formatear número como moneda española
function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

// Formatear número decimal español
function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}
```

---

## Anexo: SQL Completo de Migración

El archivo `supabase/migrations/002_business_schema.sql` debe contener todo el SQL de las secciones 3.1 a 3.11 en orden.

---

*Fin del PRD Fase 1*
