# PRD CRM Fase 3: Portal de Cliente

## Sistema CRM/SAT - Expansion sobre Facturacion A360

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energeticos S.L. |
| **Proyecto** | CRM / SAT sobre Sistema de Facturacion |
| **Version** | 2.0 |
| **Fecha** | Enero 2026 |
| **Fase CRM** | 3 de 4 |
| **Dependencia** | Requiere CRM Fases 0-2 completadas |

---

## 1. Objetivo de esta Fase

Proporcionar a los clientes finales de A360 un portal web donde puedan consultar sus facturas, contratos, citas programadas, y comunicarse con el equipo de soporte sin necesidad de llamar por telefono. Al completar esta fase, los clientes tendran acceso autoservicio a su informacion, reduciendo la carga del equipo administrativo.

### Entregables principales

- Sistema de autenticacion separado para clientes (magic link o credenciales)
- Layout diferenciado para el portal (sin sidebar completo)
- Vista de facturas del cliente (read-only, descarga PDF)
- Vista de contratos activos
- Vista de citas programadas
- Widget de chat integrado (Chatwoot)
- Sistema de notificaciones para clientes
- Landing page publica del portal

### Alcance de acceso del cliente

| Puede hacer | NO puede hacer |
|-------------|----------------|
| Ver sus facturas | Modificar facturas |
| Descargar PDFs de facturas | Ver facturas de otros |
| Ver sus contratos | Modificar contratos |
| Ver sus citas programadas | Crear/cancelar citas |
| Chatear con soporte | Acceder al sistema interno |
| Ver su historial de consumos | Ver datos de otros clientes |
| Actualizar datos de contacto | Cambiar datos bancarios |

---

## 2. Garantias de Seguridad

### 2.1 Impacto en Base de Datos Existente

| Accion | Detalle |
|--------|---------|
| Tablas nuevas | 2 (`portal_sesiones`, `portal_notificaciones`) |
| Tablas modificadas | 0 |
| Funciones modificadas | 0 |
| Vistas modificadas | 0 |
| Politicas RLS nuevas | Se anaden a tablas CRM (de fases anteriores), NO a tablas originales |

**Riesgo para produccion: NULO**

### 2.2 Aislamiento del Portal

El portal del cliente esta completamente aislado del sistema interno:
- Layout diferente (sin sidebar de administracion)
- Rutas bajo `/portal/*` (no interfieren con rutas existentes)
- Las RLS garantizan que un cliente solo ve SUS datos
- No hay escritura sobre tablas de facturacion, solo lectura

---

## 3. Autenticacion de Clientes

### 3.1 Opciones de Acceso

**Opcion A: Magic Link (Recomendada para inicio)**
- El cliente recibe un email con enlace de acceso unico
- No necesita recordar contrasena
- Valido por 24 horas
- Se genera desde el panel admin o automaticamente via comunicacion

**Opcion B: Credenciales Supabase Auth (Futuro)**
- El cliente se registra con email y contrasena
- Requiere verificacion de email
- El trigger `handle_new_user()` crea perfil con `rol = 'cliente'`

### 3.2 Vinculacion Cliente-Usuario

Para que un usuario con `rol = 'cliente'` vea sus datos, necesitamos vincular su `auth.users.id` con su `clientes.id`. Esto se hace mediante:

```sql
-- Opcion 1: Por email (el email del usuario auth coincide con clientes.email)
-- Opcion 2: Tabla de vinculacion explicita (mas robusto)
```

Para esta fase usaremos la vinculacion por email (mas simple). En el futuro se puede crear una tabla de vinculacion.

### 3.3 Flujo de Onboarding

```
Admin crea cliente en sistema
        │
        ▼
Admin pulsa "Invitar al portal"
        │
        ▼
Sistema crea usuario en Supabase Auth con rol='cliente'
        │
        ▼
Cliente recibe email con magic link
        │
        ▼
Cliente accede al portal
        │
        ▼
Portal identifica cliente por email
        │
        ▼
Cliente ve SUS datos (facturas, contratos, citas)
```

---

## 4. Migracion SQL: `039_crm_portal_cliente.sql`

```sql
BEGIN;

-- ============================================================
-- 1. Tabla: portal_sesiones
--    Control de acceso al portal de clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS portal_sesiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Token de acceso (para magic links)
  token TEXT UNIQUE,
  token_expira TIMESTAMPTZ,
  
  -- Actividad
  ultimo_acceso TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  
  -- Estado
  activa BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_sesiones_cliente ON portal_sesiones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_portal_sesiones_token ON portal_sesiones(token);
CREATE INDEX IF NOT EXISTS idx_portal_sesiones_user ON portal_sesiones(user_id);

-- ============================================================
-- 2. Tabla: portal_notificaciones
--    Notificaciones para clientes en el portal
-- ============================================================
CREATE TABLE IF NOT EXISTS portal_notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  
  -- Contenido
  tipo TEXT NOT NULL CHECK (tipo IN ('factura', 'contrato', 'cita', 'comunicacion', 'sistema')),
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  
  -- Referencia al recurso
  recurso_tipo TEXT, -- 'factura', 'contrato', 'cita'
  recurso_id UUID,   -- ID del recurso
  
  -- Estado
  leida BOOLEAN NOT NULL DEFAULT false,
  fecha_lectura TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_notif_cliente ON portal_notificaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_portal_notif_leida ON portal_notificaciones(cliente_id, leida);

-- ============================================================
-- 3. Politicas RLS
-- ============================================================
ALTER TABLE portal_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_notificaciones ENABLE ROW LEVEL SECURITY;

-- Sesiones: admin gestiona, cliente ve las suyas
CREATE POLICY "Admin gestiona sesiones portal"
  ON portal_sesiones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

CREATE POLICY "Cliente ve sus sesiones"
  ON portal_sesiones FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Notificaciones: admin gestiona, cliente ve las suyas
CREATE POLICY "Admin gestiona notificaciones portal"
  ON portal_notificaciones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

CREATE POLICY "Cliente ve sus notificaciones"
  ON portal_notificaciones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clientes c
      WHERE c.id = portal_notificaciones.cliente_id
      AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Cliente marca notificaciones como leidas"
  ON portal_notificaciones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clientes c
      WHERE c.id = portal_notificaciones.cliente_id
      AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clientes c
      WHERE c.id = portal_notificaciones.cliente_id
      AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- ============================================================
-- 4. Funcion: obtener datos del portal para el cliente actual
-- ============================================================
CREATE OR REPLACE FUNCTION get_portal_cliente_datos()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_cliente_id UUID;
  v_result JSON;
BEGIN
  -- Obtener email del usuario autenticado
  SELECT email INTO v_user_email FROM auth.users WHERE id = auth.uid();
  
  -- Buscar cliente por email
  SELECT id INTO v_cliente_id FROM clientes WHERE email = v_user_email LIMIT 1;
  
  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro un cliente vinculado a este email';
  END IF;
  
  SELECT json_build_object(
    'cliente', (
      SELECT json_build_object(
        'id', c.id,
        'nombre', c.nombre,
        'apellidos', c.apellidos,
        'email', c.email,
        'telefono', c.telefono
      )
      FROM clientes c WHERE c.id = v_cliente_id
    ),
    'facturas_recientes', (
      SELECT COALESCE(json_agg(f ORDER BY f.fecha_emision DESC), '[]')
      FROM (
        SELECT 
          id, serie, numero, fecha_emision, 
          periodo_desde, periodo_hasta,
          base_imponible, importe_iva, total,
          estado
        FROM facturas 
        WHERE cliente_id = v_cliente_id
        AND estado IN ('emitida', 'pagada')
        ORDER BY fecha_emision DESC
        LIMIT 12
      ) f
    ),
    'contratos_activos', (
      SELECT COALESCE(json_agg(ct), '[]')
      FROM (
        SELECT 
          id, numero_contrato, titulo, tipo,
          fecha_inicio, fecha_fin, estado, periodicidad
        FROM contratos_mantenimiento
        WHERE cliente_id = v_cliente_id
        AND estado = 'activo'
      ) ct
    ),
    'proximas_citas', (
      SELECT COALESCE(json_agg(ci ORDER BY ci.fecha_hora), '[]')
      FROM (
        SELECT 
          ci.id, ci.fecha_hora, ci.duracion_minutos,
          ci.estado, ci.direccion, ci.notas,
          i.numero_parte, i.titulo AS intervencion_titulo,
          p.nombre_completo AS tecnico_nombre
        FROM citas ci
        LEFT JOIN intervenciones i ON ci.intervencion_id = i.id
        LEFT JOIN profiles p ON ci.tecnico_id = p.id
        WHERE ci.cliente_id = v_cliente_id
        AND ci.fecha_hora >= NOW()
        AND ci.estado NOT IN ('cancelada', 'completada')
        ORDER BY ci.fecha_hora
        LIMIT 5
      ) ci
    ),
    'notificaciones_no_leidas', (
      SELECT COUNT(*)
      FROM portal_notificaciones
      WHERE cliente_id = v_cliente_id AND leida = false
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_portal_cliente_datos TO authenticated;

-- ============================================================
-- 5. Funcion: invitar cliente al portal
-- ============================================================
CREATE OR REPLACE FUNCTION invitar_cliente_portal(p_cliente_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente clientes%ROWTYPE;
  v_user_exists BOOLEAN;
BEGIN
  -- Verificar que el usuario es admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin'
  ) THEN
    RAISE EXCEPTION 'Solo administradores pueden invitar clientes al portal';
  END IF;
  
  -- Obtener datos del cliente
  SELECT * INTO v_cliente FROM clientes WHERE id = p_cliente_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;
  
  IF v_cliente.email IS NULL OR v_cliente.email = '' THEN
    RAISE EXCEPTION 'El cliente no tiene email configurado';
  END IF;
  
  -- Verificar si ya tiene cuenta
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = v_cliente.email
  ) INTO v_user_exists;
  
  RETURN json_build_object(
    'cliente_id', v_cliente.id,
    'email', v_cliente.email,
    'nombre', v_cliente.nombre || ' ' || v_cliente.apellidos,
    'ya_tiene_cuenta', v_user_exists,
    'mensaje', CASE 
      WHEN v_user_exists THEN 'El cliente ya tiene cuenta. Puede acceder al portal con su email.'
      ELSE 'Se necesita crear una cuenta para el cliente con rol=cliente.'
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION invitar_cliente_portal TO authenticated;

-- ============================================================
-- 6. Funcion: crear notificacion de portal
-- ============================================================
CREATE OR REPLACE FUNCTION crear_notificacion_portal(
  p_cliente_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_mensaje TEXT,
  p_recurso_tipo TEXT DEFAULT NULL,
  p_recurso_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO portal_notificaciones (
    cliente_id, tipo, titulo, mensaje, recurso_tipo, recurso_id
  ) VALUES (
    p_cliente_id, p_tipo, p_titulo, p_mensaje, p_recurso_tipo, p_recurso_id
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crear_notificacion_portal TO authenticated;

COMMIT;
```

---

## 5. Frontend: Portal del Cliente

### 5.1 Layout del Portal

El portal usa un layout diferente al sistema interno:

**Archivo nuevo:** `src/components/layout/PortalLayout.jsx`

```
┌─────────────────────────────────────────────────┐
│  Logo A360     Portal Cliente    [Notif] [Salir] │
├─────────────────────────────────────────────────┤
│                                                   │
│  [Nav horizontal: Inicio | Facturas | Contratos | │
│   Citas | Soporte]                                │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │                                              │ │
│  │           Contenido de la pagina             │ │
│  │                                              │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  Footer: A360 Servicios Energeticos              │
└─────────────────────────────────────────────────┘
```

Caracteristicas:
- Header con logo, nombre del cliente, badge de notificaciones, boton logout
- Navegacion horizontal (tabs) en vez de sidebar
- Sin acceso al sistema interno
- Responsive: mobile-first
- Colores corporativos pero con estilo mas "portal publico"

### 5.2 Estructura de Paginas Portal

```
/portal                    -> Login del portal / Landing
/portal/inicio             -> Dashboard del cliente
/portal/facturas           -> Lista de mis facturas
/portal/facturas/:id       -> Detalle factura con descarga PDF
/portal/contratos          -> Mis contratos
/portal/contratos/:id      -> Detalle contrato
/portal/citas              -> Mis citas programadas
/portal/soporte            -> Chat con soporte (Chatwoot widget)
/portal/perfil             -> Mis datos de contacto
/portal/notificaciones     -> Centro de notificaciones
```

### 5.3 Pantalla: Dashboard del Cliente

**Ruta:** `/portal/inicio`

**Secciones:**
- Saludo personalizado: "Hola, [Nombre]"
- Tarjeta resumen: Facturas pendientes (numero + importe total)
- Ultima factura emitida (con boton "Ver PDF")
- Proxima cita programada (con fecha, tecnico, y link a mapa)
- Contratos activos (listado simplificado)
- Notificaciones recientes no leidas

### 5.4 Pantalla: Mis Facturas

**Ruta:** `/portal/facturas`

**Tabla simplificada:**
- Numero, Fecha, Periodo, Total, Estado
- Boton "Ver" y "Descargar PDF"
- Filtro por anio
- Sin capacidad de edicion

### 5.5 Pantalla: Soporte

**Ruta:** `/portal/soporte`

Widget de Chatwoot embebido con:
- Chat en vivo con agentes de A360
- Historial de conversaciones previas
- Envio de adjuntos (fotos de averias, etc.)

El widget se configura con el `website_token` de Chatwoot y se precarga con los datos del cliente.

### 5.6 Widget Chatwoot

```javascript
// Integracion del widget de Chatwoot en el portal
window.chatwootSettings = {
  hideMessageBubble: false,
  position: 'right',
  locale: 'es',
  type: 'expanded_bubble',
  launcherTitle: 'Soporte A360'
}

// Identificar al cliente
window.$chatwoot.setUser(clienteId, {
  email: cliente.email,
  name: `${cliente.nombre} ${cliente.apellidos}`,
  phone_number: cliente.telefono,
  identifier_hash: hmacHash // Para verificacion
})
```

---

## 6. Hooks del Portal

### 6.1 Hooks Especificos del Portal

**Archivo nuevo:** `src/hooks/usePortal.js`

```javascript
// Datos completos del portal (una sola llamada)
usePortalDatos()  // Llama a get_portal_cliente_datos()

// Facturas del cliente
usePortalFacturas(anio)

// Notificaciones
usePortalNotificaciones()
useMarcarNotificacionLeida()

// Perfil
usePortalPerfil()
useActualizarPerfil() // Solo datos de contacto
```

---

## 7. Tareas de Implementacion

### 7.1 Base de Datos

- [ ] Crear `supabase/migrations/039_crm_portal_cliente.sql`
- [ ] Ejecutar en local/staging
- [ ] Ejecutar en produccion (con backup)

### 7.2 Frontend - Layout Portal

- [ ] Crear `src/components/layout/PortalLayout.jsx`
- [ ] Crear `src/components/layout/PortalNavigation.jsx`
- [ ] Crear `src/components/layout/PortalHeader.jsx`

### 7.3 Frontend - Paginas Portal

- [ ] Crear `src/features/portal/PortalDashboard.jsx`
- [ ] Crear `src/features/portal/PortalFacturas.jsx`
- [ ] Crear `src/features/portal/PortalFacturaDetalle.jsx`
- [ ] Crear `src/features/portal/PortalContratos.jsx`
- [ ] Crear `src/features/portal/PortalCitas.jsx`
- [ ] Crear `src/features/portal/PortalSoporte.jsx`
- [ ] Crear `src/features/portal/PortalPerfil.jsx`
- [ ] Crear `src/features/portal/PortalNotificaciones.jsx`

### 7.4 Frontend - Rutas

- [ ] Expandir `src/pages/Portal.jsx` con subrutas y PortalLayout
- [ ] Implementar redireccion: si `rol=cliente`, ir a `/portal/inicio`

### 7.5 Frontend - Hooks

- [ ] Crear `src/hooks/usePortal.js`
- [ ] Exportar desde `src/hooks/index.js`

### 7.6 Integracion Chatwoot

- [ ] Configurar inbox "Website" en Chatwoot
- [ ] Obtener `website_token`
- [ ] Integrar widget en PortalSoporte
- [ ] Configurar identificacion de cliente

### 7.7 Sistema de Invitaciones

- [ ] Crear boton "Invitar al portal" en detalle de cliente
- [ ] Implementar flujo de creacion de cuenta con `rol=cliente`
- [ ] Implementar envio de email de invitacion (magic link)

### 7.8 Validacion

- [ ] Login como cliente: ve solo el portal
- [ ] Login como admin: no ve el portal en sidebar, puede acceder via URL
- [ ] Cliente solo ve sus facturas (no las de otros)
- [ ] Descarga de PDF funciona desde el portal
- [ ] Chat con Chatwoot funciona
- [ ] Notificaciones se muestran correctamente
- [ ] Build exitoso: `npm run build`

---

## 8. Criterios de Aceptacion

| # | Criterio | Verificacion |
|---|----------|--------------|
| 1 | **Login de cliente** | Un cliente puede acceder al portal con su email |
| 2 | **Aislamiento** | El cliente no puede acceder a rutas del sistema interno |
| 3 | **Facturas propias** | El cliente ve solo sus facturas emitidas/pagadas |
| 4 | **Descarga PDF** | El cliente puede descargar PDF de sus facturas |
| 5 | **Contratos** | El cliente ve sus contratos activos |
| 6 | **Citas** | El cliente ve sus proximas citas programadas |
| 7 | **Chat** | El widget de Chatwoot funciona y asocia al cliente |
| 8 | **Notificaciones** | El cliente ve notificaciones y puede marcarlas leidas |
| 9 | **Mobile** | El portal funciona correctamente en movil |
| 10 | **BD sin impacto** | Sistema de facturacion funciona identico |

---

## 9. Dependencias

### 9.1 Requiere

- CRM Fase 0 (rol `cliente` en profiles)
- CRM Fase 1 (Chatwoot desplegado para widget de chat)
- CRM Fase 2 (tablas de contratos y citas)

### 9.2 Bloquea

- CRM Fase 4 (el portal sera el punto de interaccion con IA/chatbot)

---

## 10. Notas para Agentes de IA

### Reglas criticas

- El portal NUNCA escribe en `facturas`, `lecturas`, `contadores` ni ninguna tabla original
- El portal solo LEE datos del cliente autenticado
- La unica tabla existente que se LEE con filtro es `facturas` (WHERE cliente_id = mi_id)
- Usar `SECURITY DEFINER` en funciones para garantizar que el filtro por cliente se aplica siempre

### Archivos que se CREAN

- `supabase/migrations/039_crm_portal_cliente.sql`
- `src/components/layout/PortalLayout.jsx`
- `src/components/layout/PortalNavigation.jsx`
- `src/components/layout/PortalHeader.jsx`
- `src/features/portal/*.jsx` (8+ componentes)
- `src/hooks/usePortal.js`

### Archivos que se MODIFICAN

- `src/pages/Portal.jsx` - Expandir con subrutas
- `src/hooks/index.js` - Anadir exports
- `src/features/auth/AuthContext.jsx` - Ya tiene `isCliente` y `canAccessPortal` de Fase 0

---

*Fin del PRD CRM Fase 3*
