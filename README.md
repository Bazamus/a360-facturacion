# A360 Facturación - Sistema de Gestión Energética

Sistema de facturación de gestión energética para A360 Servicios Energéticos S.L.

## Descripción

Aplicación web para la gestión completa del ciclo de facturación de servicios energéticos en comunidades de vecinos:

- **Gestión de Comunidades:** Organización jerárquica de portales, viviendas y contadores
- **Gestión de Clientes:** Propietarios e inquilinos con histórico de ocupación
- **Importación de Lecturas:** Subida de archivos Excel con validación automática
- **Facturación:** Generación de facturas con PDF profesional
- **Envío Masivo:** Emails automáticos con facturas adjuntas
- **Remesas Bancarias:** Generación de ficheros SEPA para domiciliación

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Frontend | React 18 + Vite |
| Estilos | Tailwind CSS |
| Estado | TanStack Query |
| Backend/DB | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Emails | Resend |
| Almacenamiento | OneDrive API |

## Requisitos Previos

- Node.js 18+ 
- Cuenta en [Supabase](https://supabase.com)
- (Opcional) Cuenta en [Vercel](https://vercel.com) para deploy

## Instalación

1. **Clonar el repositorio**

```bash
git clone <url-repositorio>
cd a360-facturacion
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_APP_ENV=development
```

4. **Configurar base de datos**

Ejecuta la migración inicial en Supabase:
- Accede al SQL Editor de tu proyecto Supabase
- Ejecuta el contenido de `supabase/migrations/001_initial_schema.sql`

5. **Iniciar en desarrollo**

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera build de producción |
| `npm run preview` | Preview del build de producción |
| `npm run lint` | Ejecuta ESLint |

## Estructura del Proyecto

```
a360-facturacion/
├── public/              # Archivos estáticos
├── src/
│   ├── components/      # Componentes reutilizables
│   │   ├── ui/          # Componentes UI base
│   │   └── layout/      # Layout y navegación
│   ├── features/        # Módulos por funcionalidad
│   │   ├── auth/        # Autenticación
│   │   ├── comunidades/ # Gestión de comunidades
│   │   ├── clientes/    # Gestión de clientes
│   │   └── ...
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilidades y configuración
│   ├── pages/           # Páginas/Rutas
│   └── styles/          # Estilos globales
├── supabase/
│   └── migrations/      # Migraciones SQL
├── docs/                # Documentación
│   ├── PRD/             # Product Requirements Documents
│   └── PLAN_DESARROLLO.md
└── package.json
```

## Fases de Desarrollo

El proyecto se desarrolla en 6 fases:

1. **Fase 0:** ✅ Configuración del Proyecto
2. **Fase 1:** 🔄 Modelo de Datos y CRUD
3. **Fase 2:** ⏳ Importación de Lecturas
4. **Fase 3:** ⏳ Motor de Facturación
5. **Fase 4:** ⏳ Envío de Facturas
6. **Fase 5:** ⏳ Remesas SEPA y Reportes

Ver documentación detallada en `/docs/PRD/`

## Convenciones

- **Idioma de interfaz:** Español
- **Formato de fecha:** DD/MM/YYYY
- **Formato numérico:** 1.234,56 € (coma decimal)
- **Zona horaria:** Europe/Madrid

## Contribución

1. Crear rama desde `develop`: `git checkout -b feature/mi-feature`
2. Commits descriptivos: `feat(modulo): descripción`
3. Pull request hacia `develop`

## Licencia

Propiedad de A360 Servicios Energéticos S.L. - Todos los derechos reservados.

---

Desarrollado con ❤️ para A360 Servicios Energéticos




