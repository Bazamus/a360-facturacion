# PRD CRM Fase 4: IA y Chatbot Avanzado

## Sistema CRM/SAT - Expansion sobre Facturacion A360

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energeticos S.L. |
| **Proyecto** | CRM / SAT sobre Sistema de Facturacion |
| **Version** | 2.0 |
| **Fecha** | Enero 2026 |
| **Fase CRM** | 4 de 4 |
| **Dependencia** | Requiere CRM Fases 0-3 completadas |

---

## 1. Objetivo de esta Fase

Implementar un asistente IA que responda automaticamente a consultas frecuentes de clientes via WhatsApp y chat web, utilizando Chatwoot Captain como motor de IA. El objetivo es que el chatbot resuelva el 60-70% de las consultas sin intervencion humana, escalando al agente humano solo cuando sea necesario.

### Entregables principales

- Base de conocimiento en Chatwoot con FAQs y documentacion
- Configuracion de Chatwoot Captain (AI agent) 
- Workflows n8n para consultas que requieren datos de Supabase
- Tabla de log de conversaciones IA para mejora continua
- Metricas de resolucion automatica vs escalacion

### Tipos de consultas que la IA debe resolver

| Tipo de consulta | Ejemplo | Fuente de datos |
|------------------|---------|-----------------|
| Estado de factura | "Cual es mi ultima factura?" | Supabase: `facturas` |
| Importe pendiente | "Cuanto debo?" | Supabase: `facturas` (emitidas no pagadas) |
| Proxima cita | "Cuando viene el tecnico?" | Supabase: `citas` |
| Info de contrato | "Mi contrato esta vigente?" | Supabase: `contratos_mantenimiento` |
| Horarios/contacto | "Cual es vuestro horario?" | Base de conocimiento |
| Averias comunes | "No sale agua caliente" | Base de conocimiento |
| Solicitar cita | "Necesito un tecnico" | Escalacion a agente |
| Reclamaciones | "No estoy de acuerdo con mi factura" | Escalacion a agente |

---

## 2. Garantias de Seguridad

### 2.1 Impacto en Base de Datos Existente

| Accion | Detalle |
|--------|---------|
| Tablas nuevas | 2 (`base_conocimiento`, `ia_conversaciones_log`) |
| Tablas modificadas | 0 |
| Funciones modificadas | 0 |
| Vistas modificadas | 0 |

**Riesgo para produccion: NULO**

### 2.2 La IA Nunca Escribe en Tablas de Produccion

La IA solo tiene acceso de LECTURA a datos del cliente (via funciones `SECURITY DEFINER` que filtran por cliente). No puede:
- Modificar facturas
- Crear intervenciones (solo escalar a un agente humano)
- Cambiar datos de clientes
- Acceder a datos de otros clientes

---

## 3. Arquitectura de IA

### 3.1 Diagrama de Flujo

```
Cliente envia mensaje (WhatsApp/Chat)
        │
        ▼
┌──────────────────┐
│    Chatwoot       │
│  (recibe mensaje) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────────┐
│ Chatwoot Captain │────►│ Base de Conocimiento  │
│   (AI Agent)     │     │ (articulos FAQ)       │
└────────┬─────────┘     └──────────────────────┘
         │
    ¿Puede responder?
    ┌────┴────┐
    │ SI      │ NO
    ▼         ▼
 Responde   ¿Necesita datos
 con FAQ     del cliente?
             ┌────┴────┐
             │ SI      │ NO
             ▼         ▼
        ┌─────────┐  Escala a
        │   n8n   │  agente humano
        │ Webhook │
        └────┬────┘
             │
             ▼
        ┌──────────────┐
        │  Supabase    │
        │ (consulta    │
        │  datos)      │
        └────┬─────────┘
             │
             ▼
        Responde con datos
        personalizados
```

### 3.2 Componentes

| Componente | Funcion | Configuracion |
|------------|---------|---------------|
| Chatwoot Captain | Motor IA (LLM integrado) | Configurar en Settings > Integrations > Captain |
| Base de Conocimiento | Articulos FAQ indexados | Chatwoot > Help Center |
| n8n Webhooks | Consultar Supabase cuando la IA necesita datos reales | Workflows dedicados |
| Log de IA | Registrar interacciones para mejora | Tabla `ia_conversaciones_log` |

---

## 4. Chatwoot Captain - Configuracion

### 4.1 Activar Captain

1. Acceder a Chatwoot Admin > Settings > Integrations
2. Activar "Captain" (AI Assistant)
3. Configurar LLM provider:
   - **OpenAI** (GPT-4o-mini recomendado por coste/rendimiento)
   - O **Claude** via API de Anthropic
4. Configurar instrucciones del sistema (system prompt)

### 4.2 System Prompt para Captain

```
Eres el asistente virtual de A360 Servicios Energeticos, una empresa de gestion 
energetica que mantiene y factura consumos de agua caliente, calefaccion y 
climatizacion en comunidades de vecinos.

Tu objetivo es ayudar a los clientes de forma amable, profesional y en espanol.

REGLAS:
1. Responde SIEMPRE en espanol.
2. Se conciso pero amable. Maximo 2-3 frases por respuesta.
3. Si el cliente pregunta por su factura, cita o contrato, indica que vas a 
   consultar sus datos y usa la herramienta correspondiente.
4. Si no puedes resolver la consulta, indica amablemente que vas a pasar la 
   conversacion a un agente humano.
5. NUNCA inventes datos. Si no tienes la informacion, di que lo estas consultando.
6. Para urgencias (fugas de agua, fallos de calefaccion), escala inmediatamente 
   a un agente humano e indica que es urgente.

HORARIO DE ATENCION:
- Lunes a Viernes: 8:00 - 18:00
- Urgencias: disponible 24/7 (se escala al tecnico de guardia)

DATOS DE CONTACTO:
- Telefono: 91 159 11 70
- Email: clientes@a360se.com
- Web: www.a360se.com
- Direccion: C/ Polvoranca 138, 28923 Alcorcon (Madrid)
```

### 4.3 Base de Conocimiento (Help Center)

Crear articulos en Chatwoot Help Center:

| Categoria | Articulos |
|-----------|-----------|
| **Facturacion** | Como se calcula mi factura, Que conceptos aparecen, Formas de pago, Reclamacion de factura |
| **Lecturas** | Como se leen los contadores, Frecuencia de lectura, Que hacer si la lectura parece incorrecta |
| **Averias** | No sale agua caliente, La calefaccion no funciona, Ruido en tuberias, Fuga de agua |
| **Contratos** | Que incluye mi contrato, Duracion y renovacion, Como cancelar |
| **General** | Horario de atencion, Como contactar, Donde estamos, Cambio de titular |
| **Portal** | Como acceder al portal, Descargar facturas, Ver citas programadas |

---

## 5. Migracion SQL: `040_crm_ia.sql`

```sql
BEGIN;

-- ============================================================
-- 1. Tabla: base_conocimiento
--    Articulos FAQ/documentacion (espejo de Chatwoot Help Center)
-- ============================================================
CREATE TABLE IF NOT EXISTS base_conocimiento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contenido
  titulo TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'facturacion', 'lecturas', 'averias', 'contratos', 'general', 'portal', 'sat'
  )),
  contenido TEXT NOT NULL,
  palabras_clave TEXT[], -- Para busqueda rapida
  
  -- Vinculacion con Chatwoot
  chatwoot_article_id TEXT,
  
  -- Estado
  publicado BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_base_conocimiento_categoria ON base_conocimiento(categoria);
CREATE INDEX IF NOT EXISTS idx_base_conocimiento_publicado ON base_conocimiento(publicado);

CREATE TRIGGER base_conocimiento_updated_at
  BEFORE UPDATE ON base_conocimiento
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. Tabla: ia_conversaciones_log
--    Log de interacciones IA para mejora continua
-- ============================================================
CREATE TABLE IF NOT EXISTS ia_conversaciones_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificacion
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  chatwoot_conversation_id TEXT,
  canal TEXT CHECK (canal IN ('whatsapp', 'chat', 'email')),
  
  -- Mensaje y respuesta
  mensaje_cliente TEXT NOT NULL,
  respuesta_ia TEXT,
  
  -- Clasificacion
  intencion_detectada TEXT, -- 'consulta_factura', 'pedir_cita', 'averia', etc.
  resuelto_por_ia BOOLEAN DEFAULT false,
  escalado_a_agente BOOLEAN DEFAULT false,
  
  -- Datos consultados
  datos_consultados TEXT[], -- ['facturas', 'citas', 'contratos']
  funcion_ejecutada TEXT,   -- Nombre de la funcion RPC llamada
  
  -- Evaluacion
  satisfaccion_cliente INTEGER CHECK (satisfaccion_cliente BETWEEN 1 AND 5),
  feedback TEXT,
  
  -- Metadata
  tokens_usados INTEGER,
  tiempo_respuesta_ms INTEGER,
  modelo_llm TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ia_log_cliente ON ia_conversaciones_log(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ia_log_resuelto ON ia_conversaciones_log(resuelto_por_ia);
CREATE INDEX IF NOT EXISTS idx_ia_log_fecha ON ia_conversaciones_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ia_log_intencion ON ia_conversaciones_log(intencion_detectada);

-- ============================================================
-- 3. Politicas RLS
-- ============================================================
ALTER TABLE base_conocimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_conversaciones_log ENABLE ROW LEVEL SECURITY;

-- Base de conocimiento: todos leen, admin modifica
CREATE POLICY "Todos leen base de conocimiento"
  ON base_conocimiento FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin modifica base de conocimiento"
  ON base_conocimiento FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- Log IA: admin y encargado leen, sistema inserta
CREATE POLICY "Admin y encargado leen log IA"
  ON ia_conversaciones_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol IN ('admin', 'encargado')
    )
  );

CREATE POLICY "Sistema inserta log IA"
  ON ia_conversaciones_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- 4. Funciones para consultas de la IA (via n8n)
-- ============================================================

-- Consultar facturas de un cliente (para la IA)
CREATE OR REPLACE FUNCTION ia_consultar_facturas_cliente(p_telefono TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id UUID;
  v_result JSON;
BEGIN
  -- Buscar cliente por telefono
  SELECT c.id INTO v_cliente_id
  FROM clientes c
  WHERE REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '+34', '') = 
        REPLACE(REPLACE(REPLACE(p_telefono, ' ', ''), '-', ''), '+34', '')
  LIMIT 1;
  
  IF v_cliente_id IS NULL THEN
    RETURN json_build_object('encontrado', false, 'mensaje', 'Cliente no encontrado');
  END IF;
  
  SELECT json_build_object(
    'encontrado', true,
    'ultima_factura', (
      SELECT json_build_object(
        'numero', serie || '/' || numero,
        'fecha', fecha_emision,
        'total', total,
        'estado', estado
      )
      FROM facturas
      WHERE cliente_id = v_cliente_id AND estado IN ('emitida', 'pagada')
      ORDER BY fecha_emision DESC
      LIMIT 1
    ),
    'total_pendiente', (
      SELECT COALESCE(SUM(total), 0)
      FROM facturas
      WHERE cliente_id = v_cliente_id AND estado = 'emitida'
    ),
    'num_facturas_pendientes', (
      SELECT COUNT(*)
      FROM facturas
      WHERE cliente_id = v_cliente_id AND estado = 'emitida'
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION ia_consultar_facturas_cliente TO authenticated;

-- Consultar proxima cita de un cliente (para la IA)
CREATE OR REPLACE FUNCTION ia_consultar_proxima_cita(p_telefono TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id UUID;
  v_result JSON;
BEGIN
  SELECT c.id INTO v_cliente_id
  FROM clientes c
  WHERE REPLACE(REPLACE(REPLACE(c.telefono, ' ', ''), '-', ''), '+34', '') = 
        REPLACE(REPLACE(REPLACE(p_telefono, ' ', ''), '-', ''), '+34', '')
  LIMIT 1;
  
  IF v_cliente_id IS NULL THEN
    RETURN json_build_object('encontrado', false);
  END IF;
  
  SELECT json_build_object(
    'encontrado', true,
    'proxima_cita', (
      SELECT json_build_object(
        'fecha', ci.fecha_hora,
        'duracion', ci.duracion_minutos,
        'estado', ci.estado,
        'tecnico', p.nombre_completo,
        'motivo', i.titulo
      )
      FROM citas ci
      LEFT JOIN profiles p ON ci.tecnico_id = p.id
      LEFT JOIN intervenciones i ON ci.intervencion_id = i.id
      WHERE ci.cliente_id = v_cliente_id
      AND ci.fecha_hora >= NOW()
      AND ci.estado NOT IN ('cancelada', 'completada')
      ORDER BY ci.fecha_hora
      LIMIT 1
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION ia_consultar_proxima_cita TO authenticated;

-- Estadisticas de la IA
CREATE OR REPLACE FUNCTION get_ia_stats(
  p_dias INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'total_interacciones', COUNT(*),
      'resueltas_por_ia', COUNT(*) FILTER (WHERE resuelto_por_ia = true),
      'escaladas_a_agente', COUNT(*) FILTER (WHERE escalado_a_agente = true),
      'tasa_resolucion_ia', ROUND(
        COUNT(*) FILTER (WHERE resuelto_por_ia = true)::DECIMAL / 
        NULLIF(COUNT(*), 0) * 100, 1
      ),
      'intenciones_frecuentes', (
        SELECT COALESCE(json_agg(x), '[]')
        FROM (
          SELECT intencion_detectada, COUNT(*) as total
          FROM ia_conversaciones_log
          WHERE created_at >= NOW() - (p_dias || ' days')::INTERVAL
          AND intencion_detectada IS NOT NULL
          GROUP BY intencion_detectada
          ORDER BY total DESC
          LIMIT 10
        ) x
      ),
      'satisfaccion_media', ROUND(AVG(satisfaccion_cliente)::DECIMAL, 1),
      'tiempo_respuesta_medio_ms', ROUND(AVG(tiempo_respuesta_ms)::DECIMAL, 0)
    )
    FROM ia_conversaciones_log
    WHERE created_at >= NOW() - (p_dias || ' days')::INTERVAL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_ia_stats TO authenticated;

-- Insertar articulos iniciales de base de conocimiento
INSERT INTO base_conocimiento (titulo, categoria, contenido, palabras_clave) VALUES
  ('Como se calcula mi factura', 'facturacion',
   'Su factura se calcula en base al consumo real medido por su contador. El consumo se obtiene de la diferencia entre la lectura actual y la anterior, multiplicado por el precio por unidad vigente en su comunidad. Ademas, puede incluir un termino fijo mensual por el mantenimiento del servicio.',
   ARRAY['factura', 'calculo', 'consumo', 'precio', 'importe']),
  
  ('Formas de pago', 'facturacion',
   'Las facturas se cobran por domiciliacion bancaria (adeudo SEPA). Si tiene domiciliacion activa, el cobro se realizara automaticamente en su cuenta. Si necesita cambiar sus datos bancarios, contacte con nuestro equipo.',
   ARRAY['pago', 'domiciliacion', 'banco', 'SEPA', 'IBAN']),
  
  ('No sale agua caliente', 'averias',
   'Si no tiene agua caliente, compruebe: 1) Que la llave de paso esta abierta. 2) Que el contador de ACS marca lecturas (el dial se mueve al abrir grifo). 3) Si el problema persiste, contactenos para enviar un tecnico. En caso de urgencia, llame al 91 159 11 70.',
   ARRAY['agua caliente', 'ACS', 'averia', 'no sale', 'grifo']),
  
  ('La calefaccion no funciona', 'averias',
   'Si su calefaccion no funciona: 1) Verifique que los radiadores estan abiertos. 2) Compruebe que la calefaccion central de la comunidad esta encendida (temporada de octubre a abril). 3) Purgue los radiadores si tienen aire. 4) Si el problema persiste, contactenos.',
   ARRAY['calefaccion', 'radiador', 'no funciona', 'frio', 'calentar']),
  
  ('Horario de atencion', 'general',
   'Nuestro horario de atencion es de lunes a viernes de 8:00 a 18:00. Para urgencias fuera de horario (fugas, averias graves), contacte al 91 159 11 70.',
   ARRAY['horario', 'atencion', 'horario oficina', 'cuando']),
  
  ('Como acceder al portal de cliente', 'portal',
   'Puede acceder a su portal de cliente desde nuestra web. Si es la primera vez, solicite acceso contactando con nuestro equipo y le enviaremos un enlace a su email registrado. Desde el portal podra ver sus facturas, contratos y proximas citas.',
   ARRAY['portal', 'acceso', 'login', 'entrar', 'web'])
ON CONFLICT DO NOTHING;

COMMIT;
```

---

## 6. Workflows n8n para la IA

### 6.1 Workflow: Consulta de Factura via IA

**Trigger:** Webhook de Chatwoot (Captain solicita datos)

**Flujo:**
1. Captain detecta intencion: "consultar factura"
2. Chatwoot llama webhook n8n con telefono del cliente
3. n8n llama a `ia_consultar_facturas_cliente(telefono)`
4. n8n formatea respuesta natural
5. n8n envia respuesta a Chatwoot
6. n8n inserta log en `ia_conversaciones_log`

### 6.2 Workflow: Consulta de Cita via IA

Similar al anterior pero llama a `ia_consultar_proxima_cita(telefono)`.

### 6.3 Workflow: Escalacion a Agente

Cuando Captain no puede resolver:
1. Cambia estado de conversacion a "open" (para agente humano)
2. Anade nota interna con resumen de la consulta
3. Registra en `ia_conversaciones_log` con `escalado_a_agente = true`

---

## 7. Frontend: Dashboard de IA

### 7.1 Pagina de Metricas IA

**Ruta:** `/comunicaciones/ia` (dentro del modulo de comunicaciones)

**KPIs:**
- Tasa de resolucion IA (% de consultas resueltas sin agente)
- Total de interacciones (ultimos 30 dias)
- Satisfaccion media del cliente
- Tiempo medio de respuesta

**Graficos:**
- Evolucion de interacciones IA vs escalaciones (lineas)
- Intenciones mas frecuentes (barras)
- Distribucion por canal (pie)

### 7.2 Gestion de Base de Conocimiento

**Ruta:** `/comunicaciones/conocimiento`

- CRUD de articulos
- Categorias con filtros
- Editor de contenido
- Boton "Sincronizar con Chatwoot" (crea/actualiza articulos en Help Center)

---

## 8. Tareas de Implementacion

### 8.1 Base de Datos

- [ ] Crear `supabase/migrations/040_crm_ia.sql`
- [ ] Ejecutar en local/staging
- [ ] Ejecutar en produccion (con backup)

### 8.2 Chatwoot Captain

- [ ] Activar Captain en Chatwoot Settings
- [ ] Configurar API key del LLM (OpenAI o Anthropic)
- [ ] Escribir system prompt
- [ ] Crear articulos en Help Center (base de conocimiento)
- [ ] Probar respuestas automaticas

### 8.3 Workflows n8n

- [ ] Crear workflow: Consulta de facturas via IA
- [ ] Crear workflow: Consulta de citas via IA
- [ ] Crear workflow: Escalacion a agente con log
- [ ] Probar flujo completo end-to-end

### 8.4 Frontend

- [ ] Crear `src/features/comunicaciones/IADashboard.jsx`
- [ ] Crear `src/features/comunicaciones/BaseConocimiento.jsx`
- [ ] Crear `src/features/comunicaciones/ArticuloForm.jsx`
- [ ] Crear `src/hooks/useIA.js` (stats, log, articulos)
- [ ] Anadir subrutas en Comunicaciones
- [ ] Verificar build: `npm run build`

### 8.5 Validacion

- [ ] Enviar "Cual es mi ultima factura?" por WhatsApp -> IA responde con datos reales
- [ ] Enviar "Cuando viene el tecnico?" -> IA responde con proxima cita
- [ ] Enviar "Quiero reclamar" -> IA escala a agente humano
- [ ] Verificar que el log registra todas las interacciones
- [ ] Verificar metricas en dashboard

---

## 9. Criterios de Aceptacion

| # | Criterio | Verificacion |
|---|----------|--------------|
| 1 | **Captain activo** | Chatwoot Captain responde automaticamente |
| 2 | **FAQ resueltas** | Consultas de FAQ se responden sin agente |
| 3 | **Datos reales** | La IA consulta facturas y citas reales del cliente |
| 4 | **Escalacion** | Consultas complejas se escalan correctamente |
| 5 | **Log completo** | Todas las interacciones se registran |
| 6 | **Metricas** | Dashboard muestra tasa de resolucion y satisfaccion |
| 7 | **Base de conocimiento** | Articulos gestionables desde la app |
| 8 | **BD sin impacto** | Sistema de facturacion funciona identico |

---

## 10. Dependencias

### 10.1 Requiere

- CRM Fase 0 (roles y estructura)
- CRM Fase 1 (Chatwoot y Evolution API desplegados, n8n operativo)
- CRM Fase 2 (tablas de citas para consultas de IA)
- CRM Fase 3 (portal con chat widget)
- API key de OpenAI o Anthropic

### 10.2 Evoluciones Futuras

- Chatbot proactivo (notificaciones automaticas de facturas, recordatorios de citas)
- Analisis de sentimiento en conversaciones
- Clasificacion automatica de urgencias
- Sugerencias de respuesta para agentes humanos

---

## 11. Notas para Agentes de IA

### Reglas criticas

- Las funciones `ia_consultar_*` son `SECURITY DEFINER`: SIEMPRE filtran por cliente
- La IA NUNCA debe inventar datos: si la funcion devuelve null, debe decir que no tiene informacion
- Las API keys del LLM son SECRETAS: solo en variables de entorno del VPS, nunca en el repo
- El log de IA puede crecer mucho: implementar retencion (ej: eliminar logs > 90 dias)

### Archivos que se CREAN

- `supabase/migrations/040_crm_ia.sql`
- `src/hooks/useIA.js`
- `src/features/comunicaciones/IADashboard.jsx`
- `src/features/comunicaciones/BaseConocimiento.jsx`
- `src/features/comunicaciones/ArticuloForm.jsx`

### Archivos que se MODIFICAN

- `src/pages/Comunicaciones.jsx` - Anadir subrutas /ia y /conocimiento
- `src/hooks/index.js` - Anadir exports

### Consideraciones de coste

- OpenAI GPT-4o-mini: ~$0.15/1M tokens input, ~$0.60/1M tokens output
- Estimar ~500-1000 tokens por conversacion
- Con 100 consultas/dia: ~$3-5/mes
- Monitorizar tokens_usados en el log para control de costes

---

*Fin del PRD CRM Fase 4*
