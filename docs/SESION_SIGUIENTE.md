# Proxima Sesion - Funcionalidad Plena Modulo Comunicaciones

**Fecha prevista:** 22 Enero 2026
**Prerequisito completado:** CRM Fase 0 + CRM Fase 1 (SQL, frontend, VPS, n8n workflows)

---

## Objetivo

Dotar de funcionalidad plena a las 3 secciones del modulo **Comunicaciones** que ya existen en la aplicacion como componentes React con datos basicos. Actualmente muestran datos de Supabase pero no tienen interactividad completa ni integracion real con Chatwoot/Evolution API.

---

## 1. Dashboard de Comunicaciones (`ComunicacionesDashboard.jsx`)

### Estado actual
- Muestra KPIs desde `get_comunicaciones_stats()` RPC
- Grafico de barras por canal (Recharts)
- Lista de ultimos mensajes pendientes (componente `UltimosMensajes`)
- Boton "Abrir Chatwoot" (enlace externo)

### Mejoras pendientes
- [ ] **Filtro por rango de fechas** en KPIs y grafico (actualmente solo ultimos 30 dias)
- [ ] **Click en mensaje pendiente** -> abrir conversacion en Chatwoot (deep link con ID conversacion)
- [ ] **Indicador de tiempo de respuesta medio** (nuevo KPI)
- [ ] **Grafico temporal** (linea de tendencia por dia/semana, no solo por canal)
- [ ] **Busqueda de mensajes** por contenido, telefono, nombre
- [ ] **Paginacion** en lista de mensajes (actualmente limitada a 10)
- [ ] **Auto-refresh** visual (indicador de actualizacion, ya tiene refetchInterval: 30s)
- [ ] **Vinculacion con cliente**: click en telefono -> ir a ficha de cliente en la app

---

## 2. Plantillas de Mensaje (`PlantillasList.jsx`)

### Estado actual
- CRUD completo (crear, editar, copiar al portapapeles)
- Filtro por canal (WhatsApp, Email, Chat, Todos)
- Extraccion automatica de variables `{{variable}}`
- Categorias: general, facturacion, sat, urgencias, bienvenida

### Mejoras pendientes
- [ ] **Envio real de plantilla**: seleccionar cliente/telefono, rellenar variables, enviar via Chatwoot API o Evolution API
- [ ] **Preview con variables rellenas** antes de enviar
- [ ] **Eliminar plantilla** (soft delete con `activa = false`)
- [ ] **Duplicar plantilla** como nueva
- [ ] **Importar/Exportar** plantillas (JSON)
- [ ] **Asociar plantilla a workflow** n8n (para envios automaticos)

---

## 3. Configuracion de Canales (`CanalesConfig.jsx`)

### Estado actual
- Lista todos los canales desde `canales_configuracion` (Supabase)
- Activar/desactivar canal (toggle)
- Editar configuracion JSON por canal
- Enlaces rapidos a Chatwoot, Evolution API Manager, n8n

### Mejoras pendientes
- [ ] **Test de conexion**: boton para verificar que Evolution API responde
- [ ] **Test de Chatwoot**: verificar que la API de Chatwoot esta accesible
- [ ] **Estado en tiempo real**: indicador verde/rojo de si el servicio esta up
- [ ] **Estadisticas por canal**: mensajes enviados/recibidos en ultimas 24h
- [ ] **Configuracion guiada**: wizard para configurar un canal nuevo paso a paso
- [ ] **WhatsApp activo**: cambiar estado a "Activo" cuando Evolution API esta conectado

---

## Archivos clave a modificar

| Archivo | Descripcion |
|---------|-------------|
| `src/features/comunicaciones/ComunicacionesDashboard.jsx` | Dashboard principal |
| `src/features/comunicaciones/UltimosMensajes.jsx` | Lista mensajes pendientes |
| `src/features/comunicaciones/PlantillasList.jsx` | CRUD plantillas |
| `src/features/comunicaciones/CanalesConfig.jsx` | Config canales |
| `src/hooks/useComunicaciones.js` | Hooks react-query (6 hooks) |
| `supabase/migrations/037_crm_comunicaciones.sql` | Referencia tablas SQL |

## Hooks existentes (`useComunicaciones.js`)

| Hook | Tabla/RPC | Funcion |
|------|-----------|---------|
| `useComunicaciones` | `v_comunicaciones_resumen` | Lista mensajes con filtros |
| `useComunicacionesStats` | `get_comunicaciones_stats()` | KPIs del dashboard |
| `useRegistrarComunicacion` | `comunicaciones` INSERT | Registrar nuevo mensaje |
| `usePlantillas` | `plantillas_mensaje` | Listar plantillas |
| `useCreatePlantilla` | `plantillas_mensaje` INSERT | Crear plantilla |
| `useUpdatePlantilla` | `plantillas_mensaje` UPDATE | Editar plantilla |
| `useCanalesConfig` | `canales_configuracion` | Config canales |
| `useUpdateCanalConfig` | `canales_configuracion` UPDATE | Actualizar canal |

## Datos de integracion (VPS)

| Servicio | URL |
|----------|-----|
| Chatwoot | `https://chat.a360se.com` |
| Evolution API | `https://crm-evolution-api-a360.vcheqs.easypanel.host` |
| n8n | `https://n8n-n8n.vcheqs.easypanel.host` |
| Evolution API Key | `429683C4C977415CAAFCCE10F7D57E11` |
| Chatwoot API Token | `C2D4BxQadaEwN5wAwBaGHC6e` |
| Instance name | `a360` |

## n8n Workflows operativos

| Workflow | Archivo JSON | Funcion |
|----------|-------------|---------|
| WF1 | `crm_n8n/workflow_1_evolution_supabase_mensajes.json` | Evolution -> Supabase (mensajes WhatsApp) |
| WF2 | `crm_n8n/workflow_2_sync_clientes_chatwoot.json` | Supabase -> Chatwoot (sync clientes cada 6h) |

---

## Orden sugerido de implementacion

1. **Dashboard**: filtros de fecha + busqueda + paginacion + deep links Chatwoot
2. **Plantillas**: envio real via API + preview con variables
3. **Canales**: test de conexion + estado real-time
4. **Tras completar** -> Pasar a CRM Fase 2 (SAT)
