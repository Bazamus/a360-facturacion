# PRD CRM Fase 0: Cimientos Seguros

## Sistema CRM/SAT - Expansion sobre Facturacion A360

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energeticos S.L. |
| **Proyecto** | CRM / SAT sobre Sistema de Facturacion |
| **Version** | 2.0 |
| **Fecha** | Enero 2026 |
| **Fase CRM** | 0 de 4 |
| **Dependencia** | Requiere Fases 0-5 de Facturacion completadas |

---

## 1. Objetivo de esta Fase

Establecer los cimientos del sistema CRM/SAT sin alterar el funcionamiento actual de la aplicacion de facturacion en produccion. Al completar esta fase, la aplicacion tendra soporte para nuevos roles de usuario, proteccion de rutas por rol, y la estructura de navegacion preparada para incorporar modulos CRM de forma progresiva.

### Entregables principales

- Constraint de `profiles.rol` ampliado para soportar nuevos roles
- Tabla de permisos CRM
- AuthContext ampliado con helpers de rol (sin tocar logica existente)
- Componente `RoleProtectedRoute` para rutas CRM
- Seccion CRM/SAT en Sidebar (visible solo para roles CRM)
- Rutas placeholder para modulos CRM
- Paginas placeholder con `EmptyState`

### Principio fundamental: CERO impacto en produccion

Esta fase sigue una regla estricta: **los usuarios actuales (`admin` y `usuario`) no deben notar ningun cambio**. Toda la funcionalidad nueva esta oculta detras de verificaciones de rol.

---

## 2. Garantias de Seguridad

### 2.1 Analisis de Impacto

Se ha realizado un analisis completo de la base de datos actual para garantizar que los cambios no afectan al sistema en produccion.

**Elementos existentes que NO se modifican:**

| Elemento | Cantidad | Estado |
|----------|----------|--------|
| Tablas existentes | 25 | Sin cambios |
| Vistas existentes | 25+ | Sin cambios |
| Funciones/RPCs | 40+ | Sin cambios |
| Politicas RLS | 7 que verifican admin | Sin cambios |
| Trigger `handle_new_user()` | 1 | Sin cambios |
| Funciones admin (`actualizar_usuario`, `eliminar_usuario`, `reset_datos_sistema`) | 3 | Sin cambios |
| Enums | 13 | Sin cambios |

**Unica modificacion en datos existentes:**

```sql
-- ANTES: CHECK (rol IN ('admin', 'usuario'))
-- DESPUES: CHECK (rol IN ('admin', 'usuario', 'tecnico', 'encargado', 'cliente'))
```

Esta modificacion es **aditiva** - solo amplia los valores permitidos. Los registros existentes con `admin` o `usuario` no se ven afectados.

### 2.2 Reglas de Migracion

1. Cada script SQL usa `BEGIN/COMMIT` - si algo falla, nada se aplica
2. Se usa `IF NOT EXISTS` en creacion de tablas
3. Se verifica existencia de constraint antes de modificar
4. Se ejecuta en entorno local/staging antes de produccion
5. Se realiza backup de base de datos antes de cada migracion

---

## 3. Nuevos Roles del Sistema

### 3.1 Definicion de Roles

| Rol | Descripcion | Acceso Facturacion | Acceso CRM | Dispositivo |
|-----|-------------|-------------------|------------|-------------|
| `admin` | Administrador completo | Total | Total | Desktop |
| `usuario` | Personal administrativo | Total | No | Desktop |
| `tecnico` | Tecnico de campo | Solo lectura facturas | Intervenciones propias, calendario | Mobile-first |
| `encargado` | Responsable tecnico | Lectura completa | Supervision SAT, calendario global | Desktop |
| `cliente` | Cliente final | Sus facturas | Sus contratos, citas, chat | Portal web |

### 3.2 Matriz de Permisos

| Recurso | admin | usuario | tecnico | encargado | cliente |
|---------|-------|---------|---------|-----------|---------|
| Dashboard facturacion | RW | RW | - | R | - |
| Comunidades | RW | RW | - | R | - |
| Clientes | RW | RW | - | R | Propio |
| Contadores | RW | RW | - | R | - |
| Lecturas | RW | RW | - | R | - |
| Facturas | RW | RW | - | R | Propias |
| Remesas | RW | RW | - | - | - |
| Reportes | RW | RW | - | R | - |
| Configuracion | RW | - | - | - | - |
| Comunicaciones | RW | - | - | R | Chat |
| Intervenciones | RW | - | Propias | RW | R |
| Calendario | RW | - | Propio | RW | Propias |
| Contratos | RW | - | R | RW | Propios |
| Portal cliente | - | - | - | - | RW |

*R = Lectura, W = Escritura, RW = Lectura y Escritura*

---

## 4. Migracion SQL: `036_crm_roles_base.sql`

### 4.1 Ampliar Constraint de Roles

```sql
BEGIN;

-- ============================================================
-- 1. Ampliar constraint de roles en profiles
--    SEGURO: Solo anade valores nuevos, no modifica existentes
-- ============================================================
DO $$
BEGIN
  -- Verificar que el constraint existe antes de intentar eliminarlo
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_rol_check' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_rol_check;
  END IF;
  
  ALTER TABLE profiles ADD CONSTRAINT profiles_rol_check 
    CHECK (rol IN ('admin', 'usuario', 'tecnico', 'encargado', 'cliente'));
    
  RAISE NOTICE 'Constraint profiles_rol_check actualizado correctamente';
END $$;

-- ============================================================
-- 2. Tabla de permisos CRM (NUEVA - no toca nada existente)
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_permisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rol TEXT NOT NULL,
  recurso TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('leer', 'crear', 'editar', 'eliminar')),
  condicion TEXT, -- Ej: 'propio' para tecnicos que solo ven sus intervenciones
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(rol, recurso, accion)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_crm_permisos_rol ON crm_permisos(rol);
CREATE INDEX IF NOT EXISTS idx_crm_permisos_recurso ON crm_permisos(recurso);

-- RLS
ALTER TABLE crm_permisos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden leer permisos CRM"
  ON crm_permisos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admin puede modificar permisos CRM"
  ON crm_permisos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- ============================================================
-- 3. Insertar permisos base por rol
-- ============================================================

-- Permisos de tecnico
INSERT INTO crm_permisos (rol, recurso, accion, condicion) VALUES
  ('tecnico', 'intervenciones', 'leer', 'propio'),
  ('tecnico', 'intervenciones', 'crear', NULL),
  ('tecnico', 'intervenciones', 'editar', 'propio'),
  ('tecnico', 'citas', 'leer', 'propio'),
  ('tecnico', 'citas', 'crear', NULL),
  ('tecnico', 'citas', 'editar', 'propio'),
  ('tecnico', 'contratos', 'leer', NULL),
  ('tecnico', 'materiales', 'leer', NULL),
  ('tecnico', 'clientes', 'leer', NULL),
  ('tecnico', 'comunidades', 'leer', NULL)
ON CONFLICT (rol, recurso, accion) DO NOTHING;

-- Permisos de encargado
INSERT INTO crm_permisos (rol, recurso, accion, condicion) VALUES
  ('encargado', 'intervenciones', 'leer', NULL),
  ('encargado', 'intervenciones', 'crear', NULL),
  ('encargado', 'intervenciones', 'editar', NULL),
  ('encargado', 'intervenciones', 'eliminar', NULL),
  ('encargado', 'citas', 'leer', NULL),
  ('encargado', 'citas', 'crear', NULL),
  ('encargado', 'citas', 'editar', NULL),
  ('encargado', 'citas', 'eliminar', NULL),
  ('encargado', 'contratos', 'leer', NULL),
  ('encargado', 'contratos', 'crear', NULL),
  ('encargado', 'contratos', 'editar', NULL),
  ('encargado', 'materiales', 'leer', NULL),
  ('encargado', 'materiales', 'crear', NULL),
  ('encargado', 'materiales', 'editar', NULL),
  ('encargado', 'comunicaciones', 'leer', NULL),
  ('encargado', 'clientes', 'leer', NULL),
  ('encargado', 'comunidades', 'leer', NULL),
  ('encargado', 'facturas', 'leer', NULL),
  ('encargado', 'reportes', 'leer', NULL)
ON CONFLICT (rol, recurso, accion) DO NOTHING;

-- Permisos de cliente (portal)
INSERT INTO crm_permisos (rol, recurso, accion, condicion) VALUES
  ('cliente', 'facturas', 'leer', 'propio'),
  ('cliente', 'contratos', 'leer', 'propio'),
  ('cliente', 'citas', 'leer', 'propio'),
  ('cliente', 'comunicaciones', 'leer', 'propio'),
  ('cliente', 'comunicaciones', 'crear', 'propio')
ON CONFLICT (rol, recurso, accion) DO NOTHING;

-- Admin tiene acceso total implicitamente (se verifica en frontend/funciones)

-- ============================================================
-- 4. Funcion helper para verificar permisos
-- ============================================================
CREATE OR REPLACE FUNCTION verificar_permiso_crm(
  p_recurso TEXT,
  p_accion TEXT
)
RETURNS TABLE (
  tiene_permiso BOOLEAN,
  condicion TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rol TEXT;
BEGIN
  -- Obtener rol del usuario actual
  SELECT profiles.rol INTO v_rol
  FROM profiles
  WHERE profiles.id = auth.uid();
  
  -- Admin siempre tiene permiso total
  IF v_rol = 'admin' THEN
    RETURN QUERY SELECT true::BOOLEAN, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Verificar en tabla de permisos
  RETURN QUERY
  SELECT 
    true::BOOLEAN,
    cp.condicion
  FROM crm_permisos cp
  WHERE cp.rol = v_rol
    AND cp.recurso = p_recurso
    AND cp.accion = p_accion
    AND cp.activo = true;
  
  -- Si no hay filas, no tiene permiso
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION verificar_permiso_crm TO authenticated;

COMMIT;
```

---

## 5. Cambios en Frontend

### 5.1 Ampliar AuthContext

**Archivo:** `src/features/auth/AuthContext.jsx`

**Regla:** No tocar `isAdmin` ni ninguna logica existente. Solo anadir nuevas propiedades al objeto `value`.

**Propiedades a anadir:**

```javascript
const value = {
  // === EXISTENTE - NO TOCAR ===
  user,
  profile,
  loading,
  signIn,
  signUp,
  signOut,
  isAuthenticated: !!user,
  isAdmin: profile?.rol === 'admin',
  
  // === NUEVO - SOLO ANADIR ===
  isTecnico: profile?.rol === 'tecnico',
  isEncargado: profile?.rol === 'encargado',
  isCliente: profile?.rol === 'cliente',
  hasRole: (...roles) => roles.includes(profile?.rol),
  canAccessCRM: ['admin', 'tecnico', 'encargado'].includes(profile?.rol),
  canAccessSAT: ['admin', 'tecnico', 'encargado'].includes(profile?.rol),
  canAccessPortal: profile?.rol === 'cliente',
  canAccessFacturacion: ['admin', 'usuario'].includes(profile?.rol),
}
```

### 5.2 Crear RoleProtectedRoute

**Archivo nuevo:** `src/features/auth/RoleProtectedRoute.jsx`

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function RoleProtectedRoute({ children, roles = [], fallback = '/dashboard' }) {
  const { profile, loading } = useAuth()
  
  if (loading) return null
  
  if (!profile || !roles.includes(profile.rol)) {
    return <Navigate to={fallback} replace />
  }
  
  return children
}
```

**Nota:** Este componente se usa DENTRO de `ProtectedRoute` (que ya verifica autenticacion). `RoleProtectedRoute` solo anade la verificacion de rol.

### 5.3 Anadir Rutas CRM en App.jsx

**Archivo:** `src/App.jsx`

**Regla:** Solo anadir rutas nuevas. No modificar ni reordenar las existentes.

```jsx
// Importaciones nuevas (anadir al final de las existentes)
import { RoleProtectedRoute } from '@/features/auth/RoleProtectedRoute'
import { ComunicacionesPage } from '@/pages/Comunicaciones'
import { SATPage } from '@/pages/SAT'
import { CalendarioPage } from '@/pages/Calendario'
import { PortalPage } from '@/pages/Portal'

// Dentro del Route path="/" (anadir DESPUES de las rutas existentes)
// Las rutas existentes NO se tocan:
//   dashboard, comunidades/*, clientes/*, contadores/*,
//   importar-exportar, lecturas/*, facturacion/*,
//   remesas/*, reportes/*, notas, configuracion/*

// === RUTAS CRM (NUEVAS) ===
<Route path="comunicaciones/*" element={
  <RoleProtectedRoute roles={['admin', 'encargado']}>
    <ComunicacionesPage />
  </RoleProtectedRoute>
} />
<Route path="sat/*" element={
  <RoleProtectedRoute roles={['admin', 'tecnico', 'encargado']}>
    <SATPage />
  </RoleProtectedRoute>
} />
<Route path="calendario/*" element={
  <RoleProtectedRoute roles={['admin', 'tecnico', 'encargado']}>
    <CalendarioPage />
  </RoleProtectedRoute>
} />
<Route path="portal/*" element={
  <RoleProtectedRoute roles={['admin', 'cliente']}>
    <PortalPage />
  </RoleProtectedRoute>
} />
```

### 5.4 Anadir Seccion CRM al Sidebar

**Archivo:** `src/components/layout/Sidebar.jsx`

**Regla:** Solo anadir una nueva entrada al array `sections`. No modificar las secciones existentes.

```javascript
// Importaciones de iconos nuevas (anadir a las existentes)
import {
  MessageSquare,  // Comunicaciones
  Wrench,         // SAT / Intervenciones
  Calendar,       // Calendario
  ClipboardList,  // Contratos
  Globe,          // Portal
} from 'lucide-react'

// Nueva seccion a anadir al array sections (despues de OPERACIONES)
{
  label: 'CRM / SAT',
  requiredRoles: ['admin', 'tecnico', 'encargado'], // Control de visibilidad
  items: [
    { name: 'Comunicaciones', href: '/comunicaciones', icon: MessageSquare },
    {
      name: 'SAT',
      href: '/sat',
      icon: Wrench,
      children: [
        { name: 'Intervenciones', href: '/sat/intervenciones', icon: ClipboardList },
        { name: 'Contratos', href: '/sat/contratos', icon: FileText },
      ]
    },
    { name: 'Calendario', href: '/calendario', icon: Calendar },
  ]
}
```

**Logica de filtrado en renderizado:**

```javascript
// En el map de sections, filtrar por rol
{sections
  .filter(section => {
    if (!section.requiredRoles) return true
    return section.requiredRoles.includes(profile?.rol)
  })
  .map((section, sIdx) => (
    // ... render existente sin cambios ...
  ))
}
```

**Resultado visual:**
- Usuarios `admin` y `usuario`: Ven el sidebar exactamente igual que ahora
- Usuarios `admin` con CRM activado: Ven la nueva seccion "CRM / SAT"
- Usuarios `tecnico` y `encargado`: Ven solo Dashboard + CRM / SAT
- Usuarios `cliente`: Redirigidos al Portal (layout diferente)

### 5.5 Paginas Placeholder

Crear paginas minimas con `EmptyState` para cada modulo CRM:

**`src/pages/Comunicaciones.jsx`**
```jsx
import { Routes, Route } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { MessageSquare } from 'lucide-react'

export function ComunicacionesPage() {
  return (
    <Routes>
      <Route index element={
        <EmptyState
          icon={MessageSquare}
          title="Comunicaciones"
          description="Modulo de comunicaciones en desarrollo. Proximamente: WhatsApp, email y chat centralizado."
        />
      } />
    </Routes>
  )
}
```

Crear equivalentes para: `SAT.jsx`, `Calendario.jsx`, `Portal.jsx`

---

## 6. Hooks Nuevos

### 6.1 Hook de Permisos CRM

**Archivo nuevo:** `src/hooks/usePermisosCRM.js`

```javascript
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthContext'

export function usePermisoCRM(recurso, accion) {
  const { profile } = useAuth()
  
  return useQuery({
    queryKey: ['permiso-crm', profile?.rol, recurso, accion],
    queryFn: async () => {
      // Admin siempre tiene acceso total (optimizacion frontend)
      if (profile?.rol === 'admin') {
        return { tiene_permiso: true, condicion: null }
      }
      
      const { data, error } = await supabase
        .rpc('verificar_permiso_crm', {
          p_recurso: recurso,
          p_accion: accion
        })
      
      if (error) throw error
      return data?.[0] || { tiene_permiso: false, condicion: null }
    },
    enabled: !!profile?.rol && !!recurso && !!accion,
    staleTime: 5 * 60 * 1000, // Cache 5 minutos (permisos cambian poco)
  })
}
```

---

## 7. Tareas de Implementacion

### 7.1 Base de Datos

- [ ] Crear archivo `supabase/migrations/036_crm_roles_base.sql`
- [ ] Ejecutar en entorno local/staging primero
- [ ] Verificar que usuarios admin y usuario existentes no se ven afectados
- [ ] Ejecutar en produccion (con backup previo)

### 7.2 Frontend - AuthContext

- [ ] Anadir helpers de rol a `AuthContext.jsx` (isTecnico, isEncargado, etc.)
- [ ] Verificar que `isAdmin` sigue funcionando exactamente igual
- [ ] Verificar que no hay regresion en login/logout

### 7.3 Frontend - Proteccion de Rutas

- [ ] Crear `src/features/auth/RoleProtectedRoute.jsx`
- [ ] Anadir rutas CRM en `App.jsx` (despues de las existentes)
- [ ] Crear paginas placeholder (Comunicaciones, SAT, Calendario, Portal)

### 7.4 Frontend - Sidebar

- [ ] Anadir seccion CRM/SAT al array `sections` en Sidebar.jsx
- [ ] Implementar filtrado por `requiredRoles`
- [ ] Verificar que usuarios admin y usuario ven el sidebar exactamente igual
- [ ] Verificar que la seccion CRM aparece para roles habilitados

### 7.5 Hooks

- [ ] Crear `src/hooks/usePermisosCRM.js`
- [ ] Exportar desde `src/hooks/index.js`

### 7.6 Validacion

- [ ] `npm run build` compila sin errores
- [ ] Login con usuario admin: ve todo + seccion CRM
- [ ] Login con usuario normal: ve todo MENOS seccion CRM
- [ ] Rutas existentes funcionan identicas (/facturacion, /contadores, etc.)
- [ ] Acceso directo a /sat por URL redirige si no tiene rol

---

## 8. Criterios de Aceptacion

| # | Criterio | Verificacion |
|---|----------|--------------|
| 1 | **Constraint ampliado** | `profiles.rol` acepta los 5 valores sin error |
| 2 | **Usuarios existentes intactos** | Login con admin y usuario funciona exactamente igual |
| 3 | **Sidebar sin cambios para usuario** | Usuarios con rol `usuario` no ven seccion CRM |
| 4 | **Sidebar con CRM para admin** | Usuarios admin ven la seccion CRM/SAT |
| 5 | **Rutas protegidas** | Acceso a /sat redirige si el rol no es valido |
| 6 | **AuthContext ampliado** | `isAdmin`, `isTecnico`, `hasRole()` funcionan correctamente |
| 7 | **Permisos en BD** | La funcion `verificar_permiso_crm()` retorna resultados correctos |
| 8 | **Build exitoso** | `npm run build` compila sin errores ni warnings |

---

## 9. Dependencias

### 9.1 Requiere

- Fases 0-5 de Facturacion completadas y en produccion
- Acceso admin a la base de datos Supabase para ejecutar migracion

### 9.2 Bloquea

- **CRM Fase 1** (Comunicaciones): Requiere roles ampliados y estructura de rutas
- **CRM Fase 2** (SAT): Requiere roles y permisos configurados
- **CRM Fase 3** (Portal Cliente): Requiere rol `cliente` en profiles

---

## 10. Notas para Agentes de IA

### Orden de Implementacion

1. **Primero:** Migracion SQL (ejecutar en Supabase)
2. **Segundo:** AuthContext (solo anadir propiedades nuevas al value)
3. **Tercero:** RoleProtectedRoute (componente nuevo)
4. **Cuarto:** Paginas placeholder (componentes nuevos minimos)
5. **Quinto:** Rutas en App.jsx (solo anadir, no modificar)
6. **Sexto:** Sidebar (anadir seccion con filtrado por rol)
7. **Septimo:** Hook usePermisosCRM

### Reglas criticas

- **NUNCA** eliminar o renombrar propiedades existentes del AuthContext
- **NUNCA** modificar la logica de `isAdmin`
- **NUNCA** cambiar el orden de las rutas existentes en App.jsx
- **NUNCA** modificar secciones existentes del array `sections` en Sidebar
- **SIEMPRE** usar `IF NOT EXISTS` en creacion de tablas SQL
- **SIEMPRE** verificar build antes de commit

### Archivos que se CREAN (nuevos)

- `supabase/migrations/036_crm_roles_base.sql`
- `src/features/auth/RoleProtectedRoute.jsx`
- `src/pages/Comunicaciones.jsx`
- `src/pages/SAT.jsx`
- `src/pages/Calendario.jsx`
- `src/pages/Portal.jsx`
- `src/hooks/usePermisosCRM.js`

### Archivos que se MODIFICAN (con cuidado)

- `src/features/auth/AuthContext.jsx` - Solo anadir propiedades al value
- `src/App.jsx` - Solo anadir rutas al final
- `src/components/layout/Sidebar.jsx` - Solo anadir seccion al array
- `src/hooks/index.js` - Solo anadir export

---

*Fin del PRD CRM Fase 0*
