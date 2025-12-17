# Plan de Desarrollo - Sistema de Facturación Energética A360

**Documento de referencia para el desarrollo del proyecto**

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energéticos S.L. |
| **Proyecto** | Sistema de Facturación Energética |
| **Versión** | 1.0 |
| **Fecha** | Diciembre 2025 |
| **Estado** | Pendiente de aprobación |

---

## 1. Contexto del Negocio

A360 Servicios Energéticos gestiona la facturación de consumos energéticos para comunidades de vecinos. El sistema debe manejar:

### 1.1 Conceptos Facturables

| Concepto | Código | Unidad | Tipo |
|----------|--------|--------|------|
| Agua Caliente Sanitaria | ACS | m³ | Variable |
| Calefacción | CAL | Kcal | Variable |
| Climatización | CLI | Frig | Variable |
| Término Fijo | TF | unidad | Fijo (mensual) |

### 1.2 Datos Clave

| Concepto | Valor |
|----------|-------|
| Comunidades actuales | 35 (escalable) |
| Clientes actuales | 4.000 (escalable) |
| Usuarios internos | 5 personas de administración |
| Serie de facturación | Serie 2, desde 230371945 |
| IVA aplicable | 21% (siempre) |

### 1.3 Jerarquía de Datos

```
Comunidad (configura nomenclatura)
└── Agrupación (Portal / Bloque / Escalera)
    └── Ubicación (Vivienda / Piso / Local)
        ├── Contador (Nº serie único)
        │   └── Conceptos medidos (ACS, CAL, CLI)
        └── Cliente actual (Propietario / Inquilino)
```

### 1.4 Reglas de Negocio Principales

1. **Contador permanente:** Vinculado a ubicación física, nunca cambia aunque cambien ocupantes
2. **Multiconcepto:** Un contador puede medir varios conceptos (ej: ACS + Calefacción)
3. **Ocupante actual:** Una ubicación tiene siempre un ocupante actual, con histórico
4. **Precios por comunidad:** Cada comunidad puede tener precios diferentes
5. **Término fijo prorrateado:** En periodos parciales se calcula proporcional a los días
6. **Numeración sin huecos:** Las facturas deben ser secuenciales sin saltos

---

## 2. Stack Tecnológico

### 2.1 Tecnologías Principales

| Componente | Tecnología | Justificación |
|------------|------------|---------------|
| Frontend | React 18 + Vite | Rendimiento y DX moderno |
| Estilos | Tailwind CSS | Productividad y consistencia |
| Estado | TanStack Query | Caché y sincronización |
| Formularios | React Hook Form + Zod | Validación robusta |
| Backend/DB | Supabase (PostgreSQL) | BaaS con SQL robusto |
| Hosting | Vercel | Deploy automático con GitHub |
| Emails | Resend | Emails transaccionales fiables |
| Almacenamiento | OneDrive API | Aprovecha licencias M365 |

### 2.2 Dependencias NPM

**Producción:**
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
  "date-fns": "^3.x",
  "xlsx": "^0.x",
  "react-dropzone": "^14.x",
  "@react-pdf/renderer": "^3.x",
  "recharts": "^2.x",
  "resend": "^2.x",
  "@react-email/components": "^0.x",
  "@microsoft/microsoft-graph-client": "^3.x",
  "xmlbuilder2": "^3.x",
  "jspdf": "^2.x",
  "jspdf-autotable": "^3.x"
}
```

### 2.3 Variables de Entorno

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx

# Microsoft Graph (OneDrive)
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MICROSOFT_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ONEDRIVE_DRIVE_ID=xxxxxxxxxxxxxxxx
ONEDRIVE_ROOT_FOLDER=Facturas_Clientes

# Entorno
VITE_APP_ENV=development
```

---

## 3. Arquitectura del Sistema

### 3.1 Diagrama General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                         React + Vite + Tailwind                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Comunidades │  │  Clientes   │  │ Contadores  │  │  Lecturas   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Facturación │  │   Envíos    │  │   Remesas   │  │  Reportes   │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             SUPABASE                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        PostgreSQL                                │    │
│  │  comunidades, agrupaciones, ubicaciones, clientes, contadores   │    │
│  │  lecturas, facturas, envios_email, remesas, mandatos_sepa       │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │     Auth     │  │     RLS      │  │   Storage    │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Resend    │    │   OneDrive   │    │    Vercel    │
│   (Emails)   │    │   (Storage)  │    │   (Hosting)  │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 3.2 Estructura de Carpetas

```
a360-facturacion/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/              # Button, Input, Modal, DataTable...
│   │   └── layout/          # MainLayout, Sidebar, Header
│   ├── features/
│   │   ├── auth/            # Autenticación
│   │   ├── comunidades/     # Gestión de comunidades
│   │   ├── clientes/        # Gestión de clientes
│   │   ├── contadores/      # Gestión de contadores
│   │   ├── lecturas/        # Importación de lecturas
│   │   ├── facturacion/     # Motor de facturación
│   │   ├── envios/          # Envío de emails
│   │   ├── remesas/         # Remesas SEPA
│   │   └── reportes/        # Sistema de reportes
│   ├── hooks/               # Custom hooks globales
│   ├── lib/                 # Configuración y utilidades
│   │   ├── supabase.js
│   │   ├── resend.js
│   │   └── microsoft-graph.js
│   ├── pages/               # Páginas/Rutas
│   ├── styles/              # Estilos globales
│   ├── App.jsx
│   └── main.jsx
├── api/                     # Serverless functions (Vercel)
│   ├── webhooks/
│   └── export/
├── supabase/
│   └── migrations/
├── docs/
│   └── PRD/
└── package.json
```

---

## 4. Fases de Desarrollo

### 4.1 FASE 0: Configuración del Proyecto y Arquitectura Base

**Objetivo:** Establecer los cimientos técnicos del proyecto.

**Entregables:**
- [ ] Repositorio GitHub configurado con estructura de proyecto
- [ ] Proyecto React + Vite + Tailwind CSS funcionando
- [ ] Base de datos Supabase con esquema inicial (profiles, configuracion)
- [ ] Sistema de autenticación operativo
- [ ] Layout con sidebar y rutas protegidas
- [ ] Primer deploy en Vercel operativo
- [ ] README.md con instrucciones de instalación

**Criterios de Aceptación:**
1. La aplicación está accesible en una URL de Vercel
2. Un usuario puede registrarse, iniciar sesión y cerrar sesión
3. El layout con navegación funciona correctamente

---

### 4.2 FASE 1: Modelo de Datos y CRUD de Entidades Maestras

**Objetivo:** Implementar el modelo de datos completo y las interfaces CRUD.

**Tablas a crear:**
- `comunidades` - Con nomenclatura flexible
- `agrupaciones` - Portales/Bloques
- `ubicaciones` - Viviendas/Pisos
- `clientes` - Con datos bancarios
- `ubicaciones_clientes` - Histórico de ocupantes
- `conceptos` - Predefinidos (ACS, CAL, CLI, TF)
- `contadores` - Con número de serie único
- `contadores_conceptos` - Relación N:M
- `precios` - Por comunidad y concepto

**Interfaces:**
- [ ] CRUD Comunidades con tabs (Datos, Agrupaciones, Ubicaciones, Precios)
- [ ] CRUD Clientes con validación NIF/IBAN
- [ ] CRUD Contadores con selector jerárquico
- [ ] Gestión de Conceptos

**Criterios de Aceptación:**
1. Se pueden gestionar comunidades completas con su jerarquía
2. Se pueden crear clientes con validación de datos
3. Se pueden asignar contadores a ubicaciones con conceptos
4. La navegación jerárquica funciona fluidamente

---

### 4.3 FASE 2: Sistema de Importación y Validación de Lecturas

**Objetivo:** Permitir importar lecturas desde Excel y validarlas.

**Flujo:**
1. Subir archivo Excel
2. Mapear columnas automáticamente
3. Matching de contadores por número de serie
4. Cálculo de consumos (lectura actual - anterior)
5. Detección de alertas
6. Validación manual y corrección
7. Confirmación de lecturas

**Tablas a crear:**
- `importaciones` - Registro de cada importación
- `importaciones_detalle` - Filas parseadas
- `lecturas` - Lecturas confirmadas
- `alertas_configuracion` - Tipos y umbrales

**Alertas configurables:**
| Tipo | Severidad | Bloquea |
|------|-----------|---------|
| Lectura negativa | Error | Sí |
| Consumo alto (>3x media) | Warning | No |
| Consumo cero | Info | No |
| Contador no encontrado | Error | Sí |
| Cliente bloqueado | Warning | No |
| Fecha futura | Error | Sí |

**Criterios de Aceptación:**
1. Se puede subir un Excel y mapear columnas
2. Los contadores se identifican correctamente
3. Los consumos se calculan automáticamente
4. Las alertas se muestran con colores según severidad
5. Se pueden corregir lecturas manualmente
6. Las lecturas confirmadas se guardan en la tabla `lecturas`

---

### 4.4 FASE 3: Motor de Facturación y Generación de PDFs

**Objetivo:** Generar facturas a partir de lecturas con PDF profesional.

**Reglas de cálculo:**
- Base imponible = Suma de conceptos
- IVA = Base imponible × 21%
- Total = Base imponible + IVA
- Término fijo proporcional en periodos parciales

**Estados de factura:**
```
BORRADOR → EMITIDA → PAGADA
              ↓
           ANULADA
```

**Tablas a crear:**
- `facturas` - Con snapshot de datos del cliente
- `facturas_lineas` - Detalle por concepto
- `facturas_consumo_historico` - Para gráfico
- Secuencia `seq_factura_numero` (desde 230371945)

**PDF de factura:**
- Cabecera con logo y datos empresa
- Datos del cliente (snapshot)
- Periodo de facturación
- Detalle de consumos con lecturas
- **Gráfico de evolución de consumo (6 meses)**
- Resumen con Base + IVA + Total
- Datos bancarios para domiciliación

**Criterios de Aceptación:**
1. Se pueden generar facturas desde lecturas pendientes
2. Los cálculos de importes son correctos
3. El término fijo se prorratea en periodos parciales
4. La numeración es secuencial sin huecos
5. El PDF incluye gráfico de evolución
6. Se puede previsualizar antes de emitir

---

### 4.5 FASE 4: Envío de Facturas y Almacenamiento

**Objetivo:** Enviar facturas por email y almacenarlas en OneDrive.

**Integración Resend:**
- Plantilla de email profesional
- Adjunto PDF
- Tracking de estados (enviado, entregado, abierto, rebotado)
- Webhook para actualizaciones
- Reintentos automáticos

**Integración OneDrive:**
- Estructura: `Facturas_Clientes/Comunidad_XXX/Cliente_NIF_Nombre/YYYY/`
- Subida automática tras envío
- URLs de descarga

**Tablas a crear:**
- `envios_email` - Registro de envíos
- `almacenamiento_documentos` - Documentos en OneDrive
- `configuracion_email` - Plantilla y ajustes

**Criterios de Aceptación:**
1. Se pueden enviar facturas por email individualmente
2. El envío masivo funciona con progreso visible
3. Los estados se actualizan via webhook
4. Los PDFs se suben a OneDrive automáticamente
5. La estructura de carpetas es correcta

---

### 4.6 FASE 5: Remesas Bancarias y Reportes

**Objetivo:** Generar ficheros SEPA y sistema de reportes.

**Fichero SEPA (pain.008.001.02):**
- Formato XML ISO 20022
- Datos del acreedor
- Transacciones por factura
- Referencia de mandato
- Validación de IBAN

**Tablas a crear:**
- `remesas` - Cada remesa generada
- `remesas_recibos` - Recibos incluidos
- `mandatos_sepa` - Mandatos por cliente
- `configuracion_sepa` - Datos del acreedor

**Sistema de reportes:**
- Dashboard con métricas
- Consumos por vivienda/comunidad
- Facturación por periodo
- Morosidad
- Exportación: Excel, CSV, PDF

**API para ERP:**
- `GET /api/export/clientes`
- `GET /api/export/facturas?desde=&hasta=`
- Autenticación por API key

**Criterios de Aceptación:**
1. Se pueden crear remesas seleccionando facturas
2. El XML cumple formato SEPA pain.008.001.02
3. Solo se incluyen facturas con mandato válido
4. El dashboard muestra métricas correctas
5. Los reportes se exportan en múltiples formatos
6. La API de exportación funciona con autenticación

---

## 5. Dependencias entre Fases

```
FASE 0 ──────► FASE 1 ──────► FASE 2 ──────► FASE 3 ──────► FASE 4 ──────► FASE 5
Configuración  Entidades     Lecturas      Facturación    Envíos        SEPA +
               Maestras                    + PDF                        Reportes
```

Cada fase bloquea la siguiente. No se puede avanzar sin completar los criterios de aceptación.

---

## 6. Convenciones de Desarrollo

### 6.1 Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|------------|---------|
| Componentes React | PascalCase | `ClienteForm.jsx` |
| Archivos utilidad | camelCase | `formatCurrency.js` |
| Hooks personalizados | use + PascalCase | `useClientes.js` |
| Carpetas | kebab-case | `comunidades/` |
| Tablas SQL | snake_case plural | `comunidades` |
| Columnas SQL | snake_case | `fecha_lectura` |
| Variables JS | camelCase | `totalFactura` |
| Constantes | UPPER_SNAKE_CASE | `IVA_PORCENTAJE` |

### 6.2 Formato de Commits

```
tipo(alcance): descripción breve

Tipos: feat, fix, docs, style, refactor, test, chore
Ejemplo: feat(auth): implementar login con Supabase
```

### 6.3 Gestión de Ramas

| Rama | Propósito |
|------|-----------|
| `main` | Producción, solo merges desde develop |
| `develop` | Rama de integración |
| `feature/nombre` | Nuevas funcionalidades |
| `fix/nombre` | Correcciones |
| `phase/N` | Ramas para cada fase del PRD |

### 6.4 Localización

- **Idioma de interfaz:** Español
- **Formato de fecha:** DD/MM/YYYY
- **Formato numérico:** Coma decimal, punto miles (1.234,56 €)
- **Zona horaria:** Europe/Madrid

---

## 7. Checklist de Entrega Final

Con la finalización de todas las fases, verificar:

- [ ] Todas las funcionalidades implementadas según PRDs
- [ ] Tests realizados en todas las fases
- [ ] Documentación completa en `/docs`
- [ ] Variables de entorno documentadas
- [ ] Código en rama `main` estable
- [ ] Deploy en producción en Vercel
- [ ] Base de datos en producción en Supabase
- [ ] Dominio `factu.a360se.com` configurado
- [ ] Manual de usuario
- [ ] Sesión de formación a usuarios

---

## 8. Referencias

- [PRD Fase 0](./PRD/PRD-Fase0-A360-Facturacion.md)
- [PRD Fase 1](./PRD/PRD-Fase1-A360-Facturacion.md)
- [PRD Fase 2](./PRD/PRD-Fase2-A360-Facturacion.md)
- [PRD Fase 3](./PRD/PRD-Fase3-A360-Facturacion.md)
- [PRD Fase 4](./PRD/PRD-Fase4-A360-Facturacion.md)
- [PRD Fase 5](./PRD/PRD-Fase5-A360-Facturacion.md)

---

*Documento generado como referencia para el desarrollo del proyecto. Consultar los PRDs individuales para detalles específicos de cada fase.*

