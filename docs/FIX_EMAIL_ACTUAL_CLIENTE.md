# Fix: Usar Email Actual del Cliente para Envíos

## Problema Identificado

**Síntoma:**
Cuando un usuario actualiza el email de un cliente en su ficha, los cambios NO se reflejan al enviar facturas. El sistema seguía usando el email antiguo (snapshot histórico).

**Ejemplo:**
1. Cliente Carlos López Hernández tenía email: `old@email.com`
2. Se crea factura → guarda snapshot con `old@email.com`
3. Usuario actualiza email a `carlos.lopez@email.com` en la ficha del cliente
4. Al intentar enviar la factura, sigue usando `old@email.com` ❌

## Causa Raíz

### Diseño de Snapshot Histórico

La tabla `facturas` usa un patrón de **snapshot** para guardar los datos del cliente tal como estaban al momento de crear la factura:

```sql
-- Datos del cliente (snapshot al momento de facturar)
cliente_nombre TEXT NOT NULL,
cliente_nif TEXT NOT NULL,
cliente_direccion TEXT NOT NULL,
cliente_cp TEXT,
cliente_ciudad TEXT,
cliente_provincia TEXT,
cliente_email TEXT,  -- ⚠️ Este es el snapshot histórico
cliente_iban TEXT,
```

**Propósito del snapshot:** Mantener registro histórico exacto de los datos del cliente en el momento de la facturación (requerimiento contable/legal).

### Dónde se Usaba el Email Incorrecto

1. **Vista `v_facturas_pendientes_envio`** (línea 6):
   ```sql
   f.cliente_email  -- ❌ Usaba snapshot histórico
   ```

2. **Servicio `emailService.js`** (líneas 55, 59, 63, 196):
   ```javascript
   factura.cliente_email  // ❌ Usaba snapshot histórico
   ```

3. **Servicio `envioMasivoService.js`** (línea 63):
   ```javascript
   factura.cliente_email  // ❌ Usaba snapshot histórico
   ```

## Solución Implementada

### Principio de la Solución

**Para envíos de facturas, usar el email ACTUAL del cliente de la tabla `clientes`, no el snapshot histórico.**

Justificación:
- ✅ El envío debe llegar al email actual del cliente
- ✅ Si el cliente actualizó su email, quiere recibir facturas ahí
- ✅ El snapshot histórico se mantiene intacto para auditoría
- ✅ Fallback al snapshot si el cliente fue eliminado

### Cambios Realizados

#### 1. Migración de Base de Datos

**Archivo:** `supabase/migrations/007_fix_email_actual_cliente.sql`

```sql
CREATE OR REPLACE VIEW v_facturas_pendientes_envio AS
SELECT
  f.id,
  f.numero_completo,
  f.fecha_factura,
  f.cliente_id,
  f.cliente_nombre,
  -- ✅ Email actual del cliente (no el snapshot de la factura)
  COALESCE(cli.email, f.cliente_email) AS cliente_email,
  f.total,
  f.comunidad_id,
  c.nombre AS comunidad_nombre,
  c.codigo AS comunidad_codigo,
  CASE
    WHEN cli.email IS NULL OR cli.email = '' THEN 'sin_email'
    WHEN f.email_enviado = true THEN 'enviado'
    ELSE 'pendiente'
  END AS estado_envio
FROM facturas f
JOIN comunidades c ON f.comunidad_id = c.id
LEFT JOIN clientes cli ON f.cliente_id = cli.id  -- ✅ JOIN con tabla clientes
WHERE f.estado = 'emitida';
```

**Cambios clave:**
- `LEFT JOIN clientes cli` para obtener datos actuales del cliente
- `COALESCE(cli.email, f.cliente_email)` - Usa email actual, fallback a snapshot

#### 2. Servicio de Envío Individual

**Archivo:** `src/features/envios/services/emailService.js`

**Antes:**
```javascript
let emailDestino = factura.cliente_email  // ❌ Snapshot
```

**Después:**
```javascript
// ✅ Obtener email actual del cliente (no el snapshot de la factura)
const emailActualCliente = factura.cliente?.email || factura.cliente_email

let emailDestino = emailActualCliente
```

**Nota:** El query ya incluía `cliente:clientes(*)` (línea 45), solo faltaba usarlo.

#### 3. Servicio de Envío Masivo

**Archivo:** `src/features/envios/services/envioMasivoService.js`

**Antes:**
```javascript
.select('numero_completo, cliente_email, email_enviado, estado')

if (!factura.cliente_email) {  // ❌ Snapshot
```

**Después:**
```javascript
.select('numero_completo, cliente_email, email_enviado, estado, cliente:clientes(email)')

const emailActual = factura.cliente?.email || factura.cliente_email

if (!emailActual) {  // ✅ Email actual
```

## Ventajas de Esta Solución

1. ✅ **Usa email actualizado** - Los envíos llegan al email correcto
2. ✅ **Mantiene snapshot histórico** - No se pierde registro contable
3. ✅ **Fallback seguro** - Si se borra el cliente, usa el snapshot
4. ✅ **Sin cambios en facturas existentes** - No requiere migración de datos
5. ✅ **Consistente** - Todos los servicios usan la misma lógica

## Aplicar la Migración

### Paso 1: Ejecutar Migración SQL

Ir a **Supabase Dashboard → SQL Editor** y ejecutar:

```bash
# O desde CLI de Supabase:
supabase db push
```

### Paso 2: Verificar la Vista

```sql
SELECT * FROM v_facturas_pendientes_envio LIMIT 5;
```

Verificar que el campo `cliente_email` ahora muestra emails actualizados.

### Paso 3: Deploy del Frontend

Los cambios en los servicios de envío se desplegarán automáticamente con el próximo push a GitHub → Vercel.

## Testing

### Test Case 1: Email Actualizado

1. Cliente con email `old@email.com` tiene factura pendiente
2. Actualizar email del cliente a `new@email.com`
3. Ir a "Envío de Facturas"
4. **Resultado esperado:** Debe mostrar `new@email.com` ✅

### Test Case 2: Cliente Eliminado (Edge Case)

1. Factura con cliente_email snapshot = `deleted@email.com`
2. Cliente eliminado de la base de datos
3. Ir a "Envío de Facturas"
4. **Resultado esperado:** Debe mostrar `deleted@email.com` (fallback) ✅

### Test Case 3: Envío Real

1. Actualizar email de cliente existente
2. Seleccionar factura para envío
3. Enviar email
4. **Resultado esperado:** Email llega a la dirección actualizada ✅

## Archivos Modificados

1. `supabase/migrations/007_fix_email_actual_cliente.sql` - Nueva migración
2. `src/features/envios/services/emailService.js` - Usar email actual
3. `src/features/envios/services/envioMasivoService.js` - Usar email actual
4. `docs/FIX_EMAIL_ACTUAL_CLIENTE.md` - Esta documentación

## Próximos Pasos

- [ ] Aplicar migración en Supabase Dashboard
- [ ] Deploy a producción (GitHub → Vercel)
- [ ] Verificar en producción que emails actualizados funcionan
- [ ] Informar a usuarios del cambio (si aplica)

## Notas Técnicas

### ¿Por Qué No Actualizar las Facturas?

**Opción descartada:** Crear trigger que actualice `facturas.cliente_email` cuando cambie `clientes.email`.

**Razones para NO hacerlo:**
1. ❌ Rompe el propósito del snapshot histórico
2. ❌ Problemas de auditoría contable
3. ❌ Complejidad innecesaria (triggers, race conditions)
4. ❌ No es estándar en sistemas de facturación

### Patrón de Diseño

Este fix implementa el patrón **"Snapshot + Join for Current Data"**:

- **Snapshot:** Datos históricos inmutables en la factura
- **Join:** Datos actuales cuando se necesitan para operaciones vivas
- **COALESCE:** Fallback al snapshot si el registro padre fue eliminado

Este patrón es común en:
- Sistemas de facturación
- Sistemas de pedidos (e-commerce)
- Sistemas de contratos
- Cualquier sistema que requiera auditoría histórica

---

**Fecha:** 2026-01-12
**Versión:** 1.0
**Autor:** Claude Sonnet 4.5
