# 📋 Resumen del Proyecto A360 Facturación

## Sistema de Facturación de Gestión Energética

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energéticos S.L. |
| **Proyecto** | Sistema de Facturación Energética |
| **Versión** | 1.0.0 |
| **Fecha Inicio** | Diciembre 2025 |
| **Estado** | ✅ 5 Fases Completadas |

---

## 🎯 Objetivo del Proyecto

Desarrollar un sistema web completo para la gestión de facturación de servicios energéticos (ACS, Calefacción, Climatización) en comunidades de vecinos, incluyendo:

- Gestión de comunidades, clientes y contadores
- Importación de lecturas desde Excel
- Generación automática de facturas con PDF
- Envío de facturas por email
- Generación de remesas bancarias SEPA
- Dashboard de reportes y métricas

---

## 🛠️ Stack Tecnológico

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.x | Framework UI |
| Vite | 6.x | Build tool |
| Tailwind CSS | 3.x | Estilos |
| TanStack Query | 5.x | Estado servidor |
| React Router | 6.x | Navegación |
| Lucide React | - | Iconos |
| XLSX | - | Parser Excel |
| @react-pdf/renderer | - | Generación PDF |

### Backend
| Tecnología | Uso |
|------------|-----|
| Supabase | BaaS (PostgreSQL + Auth + Storage) |
| PostgreSQL | Base de datos |
| Row Level Security | Seguridad a nivel de fila |

### Despliegue
| Servicio | Uso |
|----------|-----|
| Vercel | Hosting frontend |
| GitHub | Repositorio código |
| Supabase Cloud | Base de datos en la nube |

---

## ✅ Fases Completadas

### Fase 0: Configuración del Proyecto
**Estado:** ✅ Completada

**Entregables:**
- [x] Proyecto React + Vite + Tailwind configurado
- [x] Integración con Supabase (cliente)
- [x] Sistema de autenticación implementado
- [x] Layout principal con sidebar responsivo
- [x] Componentes UI base (Button, Input, Modal, DataTable, etc.)
- [x] Configuración de rutas protegidas
- [x] Deploy inicial en Vercel
- [x] Repositorio en GitHub

**Migraciones BD:**
- `001_initial_schema.sql` - Esquema inicial y autenticación
- `002_business_schema.sql` - Entidades de negocio

---

### Fase 1: Modelo de Datos y CRUD
**Estado:** ✅ Completada

**Entregables:**
- [x] CRUD completo de Comunidades
- [x] CRUD de Agrupaciones (Portales/Bloques)
- [x] CRUD de Ubicaciones (Viviendas)
- [x] CRUD completo de Clientes
- [x] Gestión de ocupantes por ubicación
- [x] CRUD de Contadores
- [x] Asignación de conceptos a contadores
- [x] Gestión de Conceptos de facturación
- [x] Sistema de Precios por comunidad y concepto
- [x] Vistas y consultas optimizadas

**Tablas creadas:**
- `comunidades`, `agrupaciones`, `ubicaciones`
- `clientes`, `ubicaciones_clientes`
- `conceptos`, `contadores`, `contadores_conceptos`
- `precios`

---

### Fase 2: Importación de Lecturas
**Estado:** ✅ Completada

**Entregables:**
- [x] Parser de archivos Excel (.xlsx, .xls)
- [x] Interfaz de drag & drop para subir archivos
- [x] Mapeo de columnas Excel ↔ campos del sistema
- [x] Vista previa de datos importados
- [x] Sistema de validación de lecturas
- [x] Detección de alertas (consumo negativo, alto, etc.)
- [x] Página de validación con estadísticas
- [x] Confirmación y guardado de lecturas
- [x] Historial de importaciones

**Migración BD:**
- `003_lecturas_schema.sql` - Tablas de lecturas e importaciones

**Tablas creadas:**
- `importaciones`, `importaciones_detalle`
- `lecturas`, `alertas_configuracion`

---

### Fase 3: Motor de Facturación y PDF
**Estado:** ✅ Completada

**Entregables:**
- [x] Selección de lecturas pendientes de facturar
- [x] Cálculo automático de consumos
- [x] Aplicación de precios vigentes
- [x] Generación de facturas en borrador
- [x] Sistema de numeración secuencial (Serie/Número)
- [x] Emisión de facturas (asignación de número oficial)
- [x] Generación de PDF profesional
- [x] Gráfico de histórico de consumos en factura
- [x] Vista de detalle de factura
- [x] Anulación de facturas
- [x] Marcar facturas como pagadas

**Migración BD:**
- `004_facturacion_schema.sql` - Tablas de facturación

**Tablas creadas:**
- `facturas`, `facturas_lineas`, `facturas_consumo_historico`
- Secuencias para numeración

---

### Fase 4: Envío de Facturas
**Estado:** ✅ Completada (UI y estructura)

**Entregables:**
- [x] Interfaz de envío masivo de facturas
- [x] Selección de facturas pendientes de envío
- [x] Componente de progreso de envío
- [x] Dashboard de estadísticas de envíos
- [x] Historial de envíos con filtros
- [x] Gestión de rebotes pendientes
- [x] Configuración de email (remitente, plantilla)
- [x] Hooks preparados para integración

**Migración BD:**
- `005_envios_schema.sql` - Tablas de envíos

**Tablas creadas:**
- `envios_email`, `almacenamiento_documentos`, `configuracion_email`

**⚠️ Pendiente:** Integración real con Resend y OneDrive (ver sección de tareas pendientes)

---

### Fase 5: Remesas SEPA y Reportes
**Estado:** ✅ Completada

**Entregables:**
- [x] Configuración de datos del acreedor SEPA
- [x] Gestión de mandatos SEPA por cliente
- [x] Validador de IBAN con obtención automática de BIC
- [x] Creación de remesas (selección de facturas)
- [x] Generación de fichero XML pain.008.001.02
- [x] Descarga de fichero SEPA
- [x] Gestión de estados de remesa
- [x] Dashboard de métricas de facturación
- [x] Gráficos de evolución y por comunidad
- [x] Generador de reportes (consumos, facturación, morosidad)
- [x] Exportación a Excel y CSV

**Migración BD:**
- `006_remesas_reportes_schema.sql` - Tablas de remesas y vistas de reportes

**Tablas creadas:**
- `configuracion_sepa`, `mandatos_sepa`
- `remesas`, `remesas_recibos`

**Vistas creadas:**
- `v_reporte_consumos_vivienda`
- `v_reporte_facturacion_comunidad`
- `v_reporte_morosidad`
- `v_facturas_pendientes_remesa`

**Funciones creadas:**
- `get_metricas_facturacion()`
- `get_metricas_cobro()`
- `get_metricas_consumo()`
- `generar_referencia_remesa()`
- `generar_referencia_mandato()`

---

## 📁 Estructura del Proyecto

```
a360-facturacion/
├── docs/                          # Documentación
│   ├── PRD/                       # Product Requirements Documents
│   │   ├── PRD-Fase0-A360-Facturacion.md
│   │   ├── PRD-Fase1-A360-Facturacion.md
│   │   ├── PRD-Fase2-A360-Facturacion.md
│   │   ├── PRD-Fase3-A360-Facturacion.md
│   │   ├── PRD-Fase4-A360-Facturacion.md
│   │   └── PRD-Fase5-A360-Facturacion.md
│   ├── PLAN_DESARROLLO.md
│   ├── EJEMPLO_EXCEL_LECTURAS.md
│   └── RESUMEN_PROYECTO_A360.md   # Este documento
├── supabase/
│   ├── migrations/                # Migraciones de BD
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_business_schema.sql
│   │   ├── 003_lecturas_schema.sql
│   │   ├── 004_facturacion_schema.sql
│   │   ├── 005_envios_schema.sql
│   │   └── 006_remesas_reportes_schema.sql
│   └── seeds/
│       └── 001_datos_demo.sql     # Datos de demostración
├── src/
│   ├── components/
│   │   ├── layout/               # MainLayout, Sidebar, Header
│   │   └── ui/                   # Componentes base reutilizables
│   ├── features/
│   │   ├── auth/                 # Autenticación
│   │   ├── comunidades/          # Gestión de comunidades
│   │   ├── clientes/             # Gestión de clientes
│   │   ├── contadores/           # Gestión de contadores
│   │   ├── lecturas/             # Importación de lecturas
│   │   ├── facturacion/          # Facturación y PDF
│   │   ├── envios/               # Envío de emails
│   │   ├── remesas/              # Remesas SEPA
│   │   └── reportes/             # Dashboard y reportes
│   ├── hooks/                    # Custom hooks (React Query)
│   ├── lib/                      # Utilidades (supabase, validators)
│   ├── pages/                    # Páginas principales
│   └── App.jsx                   # Rutas principales
├── api/                          # Serverless functions (Vercel)
├── public/
├── vercel.json                   # Configuración Vercel
├── package.json
├── tailwind.config.js
├── vite.config.js
└── env.example                   # Variables de entorno ejemplo
```

---

## 🗃️ Esquema de Base de Datos

### Diagrama de Relaciones Principales

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   comunidades   │────<│   agrupaciones  │────<│   ubicaciones   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               │
        │                                               │
        ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│     precios     │                           │   contadores    │
└─────────────────┘                           └─────────────────┘
        │                                               │
        │                                               │
        ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│    conceptos    │◄──────────────────────────│contadores_conceptos│
└─────────────────┘                           └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│    clientes     │────<│ubicaciones_clientes│
└─────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐     ┌─────────────────┐
│  mandatos_sepa  │     │    facturas     │
└─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │ facturas_lineas │
                        └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│    remesas      │────<│ remesas_recibos │
└─────────────────┘     └─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  importaciones  │────<│importaciones_detalle│
└─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │    lecturas     │
                        └─────────────────┘
```

---

## 📊 Funcionalidades por Módulo

### 🏢 Comunidades
- Listado con búsqueda y filtros
- Crear/Editar comunidad
- Gestión de agrupaciones (portales)
- Gestión de ubicaciones (viviendas)
- Configuración de precios por concepto
- Vista resumen con estadísticas

### 👥 Clientes
- Listado con búsqueda avanzada
- Crear/Editar cliente
- Asignación a ubicaciones
- Histórico de ocupaciones
- Bloqueo/Desbloqueo de clientes
- Gestión de mandatos SEPA

### 📊 Contadores
- Listado por comunidad
- Crear/Editar contador
- Asignación de conceptos medidos
- Visualización de última lectura

### 📥 Lecturas
- Importar archivo Excel
- Mapeo de columnas flexible
- Validación automática
- Detección de anomalías
- Confirmación selectiva
- Historial de importaciones

### 🧾 Facturación
- Selección de lecturas a facturar
- Generación de borradores
- Emisión con numeración automática
- Vista detalle de factura
- Generación de PDF
- Anulación de facturas
- Marcar como pagadas

### 📧 Envíos
- Panel de envío masivo
- Progreso de envío en tiempo real
- Dashboard de estadísticas
- Historial con filtros
- Gestión de rebotes
- Configuración de plantilla

### 🏦 Remesas SEPA
- Configuración del acreedor
- Gestión de mandatos
- Creación de remesas
- Generación XML pain.008
- Descarga de fichero
- Estados de remesa

### 📈 Reportes
- Dashboard de KPIs
- Métricas de facturación
- Métricas de cobro
- Gráficos de evolución
- Reportes de consumos
- Reportes de facturación
- Reportes de morosidad
- Exportación Excel/CSV

---

## ⏳ Tareas Pendientes

### 🔴 Alta Prioridad

#### 1. Integración con Resend (Envío de Emails)
**Estado:** Preparado, pendiente de implementación

**Archivos a crear/modificar:**
- [ ] `src/lib/resend.js` - Cliente Resend
- [ ] `src/features/envios/services/emailService.js` - Servicio de envío
- [ ] `api/send-email.js` - Endpoint serverless
- [ ] `api/webhooks/resend.js` - Webhook para eventos

**Configuración requerida:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=facturas@a360se.com
RESEND_FROM_NAME=A360 Servicios Energéticos
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

**Tareas:**
- [ ] Crear cuenta en Resend
- [ ] Verificar dominio de envío
- [ ] Implementar plantilla de email HTML
- [ ] Implementar endpoint de envío
- [ ] Configurar webhook para eventos (delivered, bounced, etc.)
- [ ] Implementar lógica de reintentos
- [ ] Probar envío real

#### 2. Integración con OneDrive (Almacenamiento)
**Estado:** Preparado, pendiente de implementación

**Archivos a crear/modificar:**
- [ ] `src/lib/microsoft-graph.js` - Cliente Microsoft Graph
- [ ] `src/features/envios/services/onedriveService.js` - Servicio OneDrive
- [ ] `api/onedrive-upload.js` - Endpoint de subida

**Configuración requerida:**
```env
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONEDRIVE_DRIVE_ID=xxxxxxxxxxxxxxxx
ONEDRIVE_ROOT_FOLDER=Facturas_Clientes
```

**Tareas:**
- [ ] Registrar aplicación en Azure AD
- [ ] Configurar permisos de Microsoft Graph
- [ ] Implementar autenticación Client Credentials
- [ ] Implementar creación de carpetas por cliente
- [ ] Implementar subida de PDFs
- [ ] Probar integración

### 🟡 Media Prioridad

#### 3. Generación de PDF de Reportes
- [ ] Implementar generación de PDF para reportes
- [ ] Usar jsPDF con jspdf-autotable
- [ ] Diseñar plantilla de reporte

#### 4. Procesamiento de Rechazos SEPA
- [ ] Implementar importación de fichero de devoluciones
- [ ] Actualizar estados de recibos
- [ ] Notificar facturas devueltas

#### 5. Notificaciones en la Aplicación
- [ ] Sistema de notificaciones push
- [ ] Centro de notificaciones
- [ ] Alertas de morosidad

### 🟢 Baja Prioridad

#### 6. Gestión de Usuarios
- [ ] Panel de administración de usuarios
- [ ] Roles y permisos
- [ ] Auditoría de acciones

#### 7. API REST para Integración ERP
- [ ] Endpoints de exportación
- [ ] Autenticación por API Key
- [ ] Documentación OpenAPI/Swagger

#### 8. Optimizaciones
- [ ] Code splitting por rutas
- [ ] Lazy loading de componentes
- [ ] Caché de consultas
- [ ] Service Worker para offline

---

## 🚀 Despliegue

### URLs de Producción
- **Frontend:** https://a360-facturacion.vercel.app
- **Supabase:** https://rvxmczogxoncdlxpptgb.supabase.co

### Variables de Entorno Requeridas

**Vercel (Frontend):**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxx
VITE_APP_ENV=production
```

**Serverless Functions (cuando se implementen):**
```env
RESEND_API_KEY=re_xxx
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
MICROSOFT_TENANT_ID=xxx
```

---

## 📝 Notas Importantes

### Datos de Demostración
Se han creado datos de demo ejecutando `supabase/seeds/001_datos_demo.sql`:
- 2 comunidades con sus agrupaciones y ubicaciones
- 12 clientes de ejemplo
- 12 contadores con conceptos asignados
- Precios configurados

### Usuario de Acceso
- **Email:** demo@a360se.com
- **Rol:** admin

### Números de Serie de Facturación
- **Serie actual:** 2
- **Formato:** Serie/Número (ej: 2/230371945)

### Formato SEPA
- **Versión:** pain.008.001.02
- **Tipo de adeudo:** CORE (básico)
- **Secuencia:** RCUR (recurrente)

---

## 📚 Documentación Adicional

- `/docs/PRD/` - Documentos de requisitos por fase
- `/docs/PLAN_DESARROLLO.md` - Plan de desarrollo original
- `/docs/EJEMPLO_EXCEL_LECTURAS.md` - Formato de Excel para importación
- `/docs/DATOS_DEMO_IMPORTACION.md` - Datos de prueba

---

## 🤝 Contacto

**A360 Servicios Energéticos S.L.**
- Web: www.a360se.com
- Email: clientes@a360se.com
- Teléfono: 91 159 11 70
- Dirección: C/ Polvoranca Nº 138, 28923 Alcorcón

---

*Documento generado: Diciembre 2025*
*Versión del sistema: 1.0.0*

