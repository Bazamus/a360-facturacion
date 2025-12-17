# PRD Fase 0: Configuración del Proyecto y Arquitectura Base

## Sistema de Facturación de Gestión Energética A360

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energéticos S.L. |
| **Proyecto** | Sistema de Facturación Energética |
| **Versión** | 1.0 |
| **Fecha** | Diciembre 2025 |
| **Fase** | 0 de 5 |

---

## 1. Objetivo de esta Fase

Esta fase establece los cimientos técnicos del proyecto. Al completarla, tendremos un entorno de desarrollo completamente funcional, con el repositorio configurado, la base de datos inicializada, el proyecto React desplegado en Vercel, y toda la documentación de arquitectura necesaria para que los agentes de IA puedan trabajar de forma autónoma en las siguientes fases.

### Entregables principales

- Repositorio GitHub configurado con estructura de proyecto
- Proyecto React + Vite + Tailwind CSS funcionando
- Base de datos Supabase con esquema inicial
- Primer deploy en Vercel operativo
- Documentación de arquitectura y convenciones

---

## 2. Contexto del Proyecto

### 2.1 Descripción General

A360 Servicios Energéticos es una empresa de gestión energética que mantiene y mide la energía consumida en comunidades de vecinos, facturando mensualmente estos consumos. El sistema a desarrollar gestionará todo el ciclo de facturación: desde la importación de lecturas de contadores hasta el envío de facturas por email y la generación de remesas bancarias.

### 2.2 Alcance del Sistema Completo

El proyecto completo se divide en 6 fases:

- **Fase 0 (actual):** Configuración del Proyecto y Arquitectura Base
- **Fase 1:** Modelo de Datos y CRUD de Entidades Maestras
- **Fase 2:** Sistema de Importación y Validación de Lecturas
- **Fase 3:** Motor de Facturación y Generación de PDFs
- **Fase 4:** Envío de Facturas y Almacenamiento
- **Fase 5:** Remesas Bancarias y Reportes

### 2.3 Datos Clave del Negocio

| Concepto | Valor |
|----------|-------|
| Comunidades actuales | 35 (escalable) |
| Clientes actuales | 4.000 (escalable) |
| Usuarios internos | 5 personas de administración |
| Serie de facturación | Serie 2, desde 230371945 |
| IVA aplicable | 21% (siempre) |

---

## 3. Stack Tecnológico

### 3.1 Tecnologías Principales

| Componente | Tecnología | Justificación |
|------------|------------|---------------|
| Frontend | React 18 + Vite | Rendimiento y DX moderno |
| Estilos | Tailwind CSS | Productividad y consistencia |
| Backend/DB | Supabase (PostgreSQL) | BaaS con SQL robusto |
| Hosting | Vercel | Deploy automático con GitHub |
| Repositorio | GitHub | Control de versiones estándar |
| Emails | Resend | Emails transaccionales fiables |
| Almacenamiento | OneDrive API | Aprovecha licencias M365 |

### 3.2 Dependencias NPM Requeridas

**Dependencias de producción:**

```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "@supabase/supabase-js": "^2.x",
  "react-router-dom": "^6.x",
  "@tanstack/react-query": "^5.x",
  "react-hook-form": "^7.x",
  "zod": "^3.x",
  "lucide-react": "^0.x",
  "date-fns": "^3.x"
}
```

**Dependencias de desarrollo:**

```json
{
  "vite": "^5.x",
  "@vitejs/plugin-react": "^4.x",
  "tailwindcss": "^3.x",
  "postcss": "^8.x",
  "autoprefixer": "^10.x",
  "eslint": "^8.x",
  "eslint-plugin-react": "^7.x"
}
```

---

## 4. Estructura del Proyecto

### 4.1 Estructura de Carpetas

El proyecto seguirá una estructura modular orientada a features, facilitando el trabajo de múltiples agentes de IA en paralelo:

```
a360-facturacion/
├── public/                    # Archivos estáticos
├── src/
│   ├── components/            # Componentes reutilizables
│   │   ├── ui/                # Componentes UI base (Button, Input, Modal, etc.)
│   │   └── layout/            # Layout y navegación
│   ├── features/              # Módulos por funcionalidad
│   │   ├── auth/              # Autenticación
│   │   ├── comunidades/       # Gestión de comunidades
│   │   ├── clientes/          # Gestión de clientes
│   │   ├── contadores/        # Gestión de contadores
│   │   ├── lecturas/          # Importación de lecturas
│   │   ├── facturacion/       # Motor de facturación
│   │   └── reportes/          # Sistema de reportes
│   ├── hooks/                 # Custom hooks
│   ├── lib/                   # Utilidades y configuración
│   │   ├── supabase.js        # Cliente Supabase
│   │   └── utils.js           # Funciones utilitarias
│   ├── pages/                 # Páginas/Rutas principales
│   ├── styles/                # Estilos globales
│   ├── App.jsx                # Componente raíz
│   └── main.jsx               # Punto de entrada
├── supabase/                  # Migraciones y seeds
│   └── migrations/
├── docs/                      # Documentación del proyecto
│   ├── PRD/                   # PRDs de cada fase
│   └── architecture/          # Diagramas y decisiones
├── .env.example               # Variables de entorno (plantilla)
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## 5. Configuración de Supabase

### 5.1 Creación del Proyecto

1. Acceder a [supabase.com](https://supabase.com) y crear cuenta o iniciar sesión
2. Crear nuevo proyecto con nombre `a360-facturacion`
3. Seleccionar región **Frankfurt (eu-central-1)** para menor latencia
4. Generar y guardar de forma segura la contraseña de base de datos
5. Obtener las credenciales: URL del proyecto y anon key

### 5.2 Esquema Inicial de Base de Datos

En esta fase solo creamos las tablas esenciales para la autenticación y configuración. El esquema completo del negocio se implementará en la Fase 1.

**Tabla: `profiles`**

Extiende la tabla `auth.users` de Supabase para almacenar información adicional de los usuarios internos (administradores).

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre_completo, rol)
  VALUES (new.id, new.raw_user_meta_data->>'nombre_completo', 'usuario');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**Tabla: `configuracion`**

Almacena configuraciones globales del sistema en formato clave-valor.

```sql
CREATE TABLE configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,
  valor JSONB NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER configuracion_updated_at
  BEFORE UPDATE ON configuracion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insertar configuraciones iniciales
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('serie_facturacion', '{"serie": 2, "ultimo_numero": 230371944}', 'Serie y último número de factura emitida'),
  ('iva_porcentaje', '21', 'Porcentaje de IVA aplicable'),
  ('empresa', '{"nombre": "A360 Servicios Energéticos S.L.", "cif": "B88313473", "direccion": "C/ Polvoranca Nº 138", "cp": "28923", "ciudad": "Alcorcón", "provincia": "Madrid", "telefono": "91 159 11 70", "email": "clientes@a360se.com", "web": "www.a360se.com"}', 'Datos de la empresa para facturas');
```

### 5.3 Políticas de Seguridad (RLS)

Row Level Security debe habilitarse en todas las tablas.

```sql
-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Los admins pueden ver todos los perfiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- Políticas para configuracion
CREATE POLICY "Usuarios autenticados pueden leer configuracion"
  ON configuracion FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admins pueden modificar configuracion"
  ON configuracion FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );
```

---

## 6. Configuración de Vercel

### 6.1 Conexión con GitHub

1. Crear cuenta en [Vercel](https://vercel.com) o iniciar sesión con GitHub
2. Importar el repositorio `a360-facturacion` desde GitHub
3. Configurar el framework preset como **Vite**
4. Definir las variables de entorno
5. Realizar el primer deploy

### 6.2 Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |
| `VITE_APP_ENV` | Entorno: `development` o `production` |

**Importante:** Las variables con prefijo `VITE_` son expuestas al cliente. Nunca incluir claves secretas (service_role key) en variables `VITE_`.

### 6.3 Archivo `.env.example`

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# Entorno
VITE_APP_ENV=development
```

---

## 7. Convenciones de Código

### 7.1 Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Componentes React | PascalCase | `ClienteForm.jsx` |
| Archivos utilidad | camelCase | `formatCurrency.js` |
| Hooks personalizados | use + PascalCase | `useClientes.js` |
| Carpetas | kebab-case | `comunidades/` |
| Tablas SQL | snake_case plural | `comunidades`, `clientes` |
| Columnas SQL | snake_case | `fecha_lectura` |
| Variables JS | camelCase | `totalFactura` |
| Constantes | UPPER_SNAKE_CASE | `IVA_PORCENTAJE` |

### 7.2 Estructura de Componentes

Cada componente debe seguir esta estructura de importaciones:

1. Dependencias de React (`useState`, `useEffect`, etc.)
2. Librerías externas (`react-router-dom`, `date-fns`, etc.)
3. Componentes internos
4. Hooks personalizados
5. Utilidades y constantes
6. Estilos (si aplica)

### 7.3 Gestión de Ramas en GitHub

| Rama | Propósito |
|------|-----------|
| `main` | Producción, solo merges desde develop |
| `develop` | Rama de integración |
| `feature/nombre-feature` | Nuevas funcionalidades |
| `fix/nombre-bug` | Correcciones |
| `phase/N` | Ramas para cada fase del PRD |

### 7.4 Formato de Commits

```
tipo(alcance): descripción breve

Tipos: feat, fix, docs, style, refactor, test, chore
Ejemplo: feat(auth): implementar login con Supabase
```

---

## 8. Tareas de Implementación

El siguiente checklist debe completarse en orden. Cada tarea incluye los comandos o acciones específicas a ejecutar.

### 8.1 Configuración Inicial del Repositorio

- [ ] Crear repositorio `a360-facturacion` en GitHub (privado)
- [ ] Clonar repositorio localmente
- [ ] Crear rama `develop` desde `main`
- [ ] Crear rama `phase/0` desde `develop`

### 8.2 Inicialización del Proyecto React

```bash
# Crear proyecto con Vite
npm create vite@latest . -- --template react

# Instalar dependencias base
npm install

# Instalar Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Instalar dependencias de producción
npm install @supabase/supabase-js react-router-dom @tanstack/react-query react-hook-form zod lucide-react date-fns

# Instalar dependencias de desarrollo
npm install -D eslint eslint-plugin-react
```

- [ ] Ejecutar comandos de inicialización
- [ ] Configurar `tailwind.config.js` con rutas de contenido
- [ ] Añadir directivas Tailwind en `src/index.css`

**tailwind.config.js:**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f0f5',
          100: '#cce1eb',
          500: '#2E86AB',
          600: '#1B4F72',
          700: '#154360',
        }
      }
    },
  },
  plugins: [],
}
```

**src/index.css:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Estilos base personalizados */
body {
  @apply bg-gray-50 text-gray-900;
}
```

### 8.3 Estructura de Carpetas

- [ ] Crear estructura de carpetas según sección 4.1
- [ ] Crear archivo `.env.example` con variables de entorno
- [ ] Crear archivo `.env.local` (añadir a `.gitignore`)
- [ ] Actualizar `.gitignore` con exclusiones necesarias

**.gitignore (añadir):**

```
# Entorno local
.env.local
.env.*.local

# Logs
logs
*.log

# Editor
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

### 8.4 Configuración de Supabase

- [ ] Crear proyecto en Supabase (región: eu-central-1)
- [ ] Obtener URL y anon key del proyecto
- [ ] Añadir credenciales a `.env.local`
- [ ] Crear cliente Supabase en `src/lib/supabase.js`
- [ ] Ejecutar SQL de creación de tablas (sección 5.2)
- [ ] Ejecutar SQL de políticas RLS (sección 5.3)
- [ ] Guardar SQL de migración en `supabase/migrations/001_initial_schema.sql`

**src/lib/supabase.js:**

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno de Supabase')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 8.5 Componentes Base

- [ ] Crear layout principal (`src/components/layout/MainLayout.jsx`)
- [ ] Crear componente Sidebar (`src/components/layout/Sidebar.jsx`)
- [ ] Crear componente Header (`src/components/layout/Header.jsx`)
- [ ] Crear página de Login (`src/pages/Login.jsx`)
- [ ] Crear página Dashboard placeholder (`src/pages/Dashboard.jsx`)
- [ ] Configurar React Router con rutas protegidas
- [ ] Implementar autenticación con Supabase Auth
- [ ] Crear contexto de autenticación (`src/features/auth/AuthContext.jsx`)
- [ ] Crear componente ProtectedRoute (`src/features/auth/ProtectedRoute.jsx`)

**Estructura del menú de navegación (Sidebar):**

```
📊 Dashboard
📍 Comunidades
👥 Clientes
🔢 Contadores
📥 Lecturas
🧾 Facturación
📈 Reportes
⚙️ Configuración
```

### 8.6 Deploy en Vercel

- [ ] Hacer commit y push de todos los cambios a `phase/0`
- [ ] Crear cuenta en Vercel (si no existe)
- [ ] Importar repositorio desde GitHub
- [ ] Configurar variables de entorno en Vercel
- [ ] Realizar deploy inicial
- [ ] Verificar funcionamiento (login, navegación)
- [ ] Anotar URL del deploy para referencia

### 8.7 Documentación

- [ ] Crear `README.md` con instrucciones de instalación y desarrollo
- [ ] Crear `docs/architecture/decisions.md` con decisiones técnicas
- [ ] Copiar este PRD a `docs/PRD/fase-0.md`
- [ ] Merge de `phase/0` a `develop`

---

## 9. Criterios de Aceptación

La Fase 0 se considera completada cuando se cumplan **todos** los siguientes criterios:

| # | Criterio | Verificación |
|---|----------|--------------|
| 1 | **Repositorio funcional** | El repositorio GitHub contiene todo el código fuente organizado según la estructura definida |
| 2 | **Aplicación desplegada** | La aplicación está accesible en una URL de Vercel y carga correctamente |
| 3 | **Autenticación operativa** | Un usuario puede registrarse, iniciar sesión y cerrar sesión correctamente |
| 4 | **Base de datos configurada** | Las tablas `profiles` y `configuracion` existen con RLS habilitado |
| 5 | **Navegación funcional** | El layout con sidebar y las rutas protegidas funcionan correctamente |
| 6 | **Documentación completa** | README.md permite a cualquier desarrollador configurar el entorno local |

---

## 10. Dependencias con Otras Fases

### 10.1 Esta Fase Bloquea

Todas las fases posteriores dependen de la correcta finalización de la Fase 0. Sin el entorno configurado, no es posible avanzar.

### 10.2 Preparación para Fase 1

La Fase 1 (Modelo de Datos) requiere:

- Supabase correctamente configurado y accesible
- Estructura de carpetas `features/` lista para añadir módulos
- Cliente Supabase funcional en `src/lib/supabase.js`
- Sistema de autenticación operativo

---

## 11. Notas para Agentes de IA

### Instrucciones Generales

- Ejecutar las tareas en el orden especificado en la sección 8
- Hacer commits frecuentes con mensajes descriptivos en español
- Ante cualquier error, documentar el problema antes de intentar solucionarlo
- No instalar dependencias adicionales sin justificación documentada
- Mantener el código limpio y comentado en español

### Convenciones de Localización

- **Idioma de interfaz:** Español
- **Formato de fecha:** DD/MM/YYYY
- **Formato numérico:** Coma como separador decimal, punto como separador de miles
- **Zona horaria:** Europe/Madrid

### Estilo de Código

- Usar funciones de flecha para componentes
- Preferir destructuring en props y state
- Usar template literals para strings complejos
- Mantener componentes pequeños y enfocados (< 150 líneas)
- Extraer lógica compleja a hooks personalizados

### Manejo de Errores

- Siempre manejar errores en llamadas a Supabase
- Mostrar mensajes de error amigables al usuario
- Registrar errores en consola para debugging
- Implementar estados de loading en operaciones asíncronas

---

## Anexo: Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

---

*Fin del PRD Fase 0*
