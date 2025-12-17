# PRD Fase 3: Motor de Facturación y Generación de PDFs

## Sistema de Facturación de Gestión Energética A360

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energéticos S.L. |
| **Proyecto** | Sistema de Facturación Energética |
| **Versión** | 1.0 |
| **Fecha** | Diciembre 2025 |
| **Fase** | 3 de 5 |
| **Dependencia** | Requiere Fase 2 completada |

---

## 1. Objetivo de esta Fase

Esta fase implementa el motor de facturación que genera facturas a partir de las lecturas validadas, y el sistema de generación de PDFs con un diseño profesional mejorado que incluye gráficos de evolución de consumo. El sistema gestionará la numeración secuencial de facturas, el cálculo de importes con IVA, y permitirá previsualizar las facturas antes de confirmarlas.

### Entregables principales

- Motor de cálculo de facturas con aplicación de precios por comunidad
- Gestión de periodos de facturación (mensual o parcial por cambio de inquilino)
- Sistema de numeración secuencial (Serie 2/XXXXXXXXX)
- Generación de PDF con diseño profesional mejorado
- Gráfico de evolución de consumo en la factura
- Previsualización de facturas antes de confirmar
- Gestión de estados de factura (borrador, emitida, pagada, anulada)
- Consulta y búsqueda de facturas emitidas

---

## 2. Reglas de Negocio de Facturación

### 2.1 Conceptos Facturables

| Concepto | Tipo | Cálculo |
|----------|------|---------|
| ACS (Agua Caliente Sanitaria) | Variable | Consumo m³ × Precio unitario |
| Calefacción | Variable | Consumo Kcal × Precio unitario |
| Climatización | Variable | Consumo Frig × Precio unitario |
| Término Fijo | Fijo | Precio mensual completo (o proporcional si periodo parcial) |

### 2.2 Reglas de Cálculo

1. **Base imponible** = Suma de todos los conceptos
2. **IVA** = Base imponible × 21%
3. **Total factura** = Base imponible + IVA

### 2.3 Periodos de Facturación

**Periodo mensual completo:**
- Fecha inicio: Primer día del mes
- Fecha fin: Último día del mes
- Término fijo: Se factura íntegro

**Periodo parcial (cambio de inquilino):**
- Fecha inicio: Día de entrada o primer día del mes
- Fecha fin: Día de salida o último día del mes
- Término fijo: Se prorratea por días (importe × días / días del mes)

### 2.4 Numeración de Facturas

- **Serie:** 2 (fija para gestión energética)
- **Número:** Secuencial, continúa desde 230371945
- **Formato:** `2/XXXXXXXXX` (ej: 2/230371945)
- **Regla:** Nunca puede haber huecos en la numeración

### 2.5 Estados de Factura

```
┌──────────┐     Confirmar     ┌──────────┐     Pagar      ┌──────────┐
│ BORRADOR │ ────────────────► │ EMITIDA  │ ─────────────► │ PAGADA   │
└──────────┘                   └──────────┘                └──────────┘
                                    │
                                    │ Anular
                                    ▼
                               ┌──────────┐
                               │ ANULADA  │
                               └──────────┘
```

- **Borrador:** Factura generada pero no confirmada. Se puede modificar o eliminar.
- **Emitida:** Factura confirmada con número asignado. No se puede modificar.
- **Pagada:** Factura cobrada. Marcada automáticamente o manualmente.
- **Anulada:** Factura cancelada. Requiere factura rectificativa.

---

## 3. Esquema de Base de Datos

### 3.1 Tabla: `facturas`

```sql
CREATE TYPE estado_factura AS ENUM ('borrador', 'emitida', 'pagada', 'anulada');
CREATE TYPE metodo_pago AS ENUM ('domiciliacion', 'transferencia', 'efectivo', 'otro');

CREATE TABLE facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Numeración
  serie INTEGER NOT NULL DEFAULT 2,
  numero INTEGER, -- NULL mientras es borrador, se asigna al emitir
  numero_completo TEXT GENERATED ALWAYS AS (
    CASE WHEN numero IS NOT NULL 
      THEN serie::TEXT || '/' || numero::TEXT 
      ELSE NULL 
    END
  ) STORED,
  
  -- Referencias
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  comunidad_id UUID NOT NULL REFERENCES comunidades(id),
  ubicacion_id UUID NOT NULL REFERENCES ubicaciones(id),
  contador_id UUID NOT NULL REFERENCES contadores(id),
  
  -- Periodo de facturación
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  es_periodo_parcial BOOLEAN NOT NULL DEFAULT false,
  dias_periodo INTEGER NOT NULL,
  
  -- Fechas
  fecha_factura DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE NOT NULL,
  
  -- Importes
  base_imponible DECIMAL(10,2) NOT NULL DEFAULT 0,
  porcentaje_iva DECIMAL(5,2) NOT NULL DEFAULT 21.00,
  importe_iva DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Pago
  estado estado_factura NOT NULL DEFAULT 'borrador',
  metodo_pago metodo_pago DEFAULT 'domiciliacion',
  fecha_pago DATE,
  
  -- Datos del cliente (snapshot al momento de facturar)
  cliente_nombre TEXT NOT NULL,
  cliente_nif TEXT NOT NULL,
  cliente_direccion TEXT NOT NULL,
  cliente_cp TEXT,
  cliente_ciudad TEXT,
  cliente_provincia TEXT,
  cliente_email TEXT,
  cliente_iban TEXT,
  
  -- Datos de la ubicación (snapshot)
  ubicacion_direccion TEXT NOT NULL,
  
  -- PDF
  pdf_generado BOOLEAN NOT NULL DEFAULT false,
  pdf_url TEXT,
  
  -- Factura rectificativa (si aplica)
  factura_rectificada_id UUID REFERENCES facturas(id),
  motivo_anulacion TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE UNIQUE INDEX idx_facturas_numero ON facturas(serie, numero) WHERE numero IS NOT NULL;
CREATE INDEX idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX idx_facturas_comunidad ON facturas(comunidad_id);
CREATE INDEX idx_facturas_estado ON facturas(estado);
CREATE INDEX idx_facturas_fecha ON facturas(fecha_factura DESC);
CREATE INDEX idx_facturas_periodo ON facturas(periodo_inicio, periodo_fin);

CREATE TRIGGER facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.2 Tabla: `facturas_lineas`

```sql
CREATE TABLE facturas_lineas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  
  -- Referencia a lectura (si aplica)
  lectura_id UUID REFERENCES lecturas(id),
  
  -- Concepto
  concepto_id UUID NOT NULL REFERENCES conceptos(id),
  concepto_codigo TEXT NOT NULL,
  concepto_nombre TEXT NOT NULL,
  unidad_medida TEXT NOT NULL,
  es_termino_fijo BOOLEAN NOT NULL DEFAULT false,
  
  -- Datos de lectura (para conceptos variables)
  contador_numero_serie TEXT,
  lectura_anterior DECIMAL(12,4),
  fecha_lectura_anterior DATE,
  lectura_actual DECIMAL(12,4),
  fecha_lectura_actual DATE,
  consumo DECIMAL(12,4),
  
  -- Cálculo
  cantidad DECIMAL(12,4) NOT NULL, -- Consumo o 1 para término fijo
  precio_unitario DECIMAL(10,4) NOT NULL,
  descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
  descuento_importe DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  
  -- Orden de visualización
  orden INTEGER NOT NULL DEFAULT 0,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_facturas_lineas_factura ON facturas_lineas(factura_id);
CREATE INDEX idx_facturas_lineas_lectura ON facturas_lineas(lectura_id);
```

### 3.3 Tabla: `facturas_consumo_historico`

Almacena datos para el gráfico de evolución de consumo.

```sql
CREATE TABLE facturas_consumo_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  
  -- Datos del periodo
  periodo DATE NOT NULL, -- Primer día del mes
  concepto_id UUID NOT NULL REFERENCES conceptos(id),
  concepto_codigo TEXT NOT NULL,
  consumo DECIMAL(12,4) NOT NULL,
  
  -- Orden
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_facturas_consumo_historico_factura 
  ON facturas_consumo_historico(factura_id);
```

### 3.4 Secuencia de Numeración

```sql
-- Crear secuencia para números de factura
CREATE SEQUENCE seq_factura_numero START WITH 230371945;

-- Función para obtener siguiente número
CREATE OR REPLACE FUNCTION get_siguiente_numero_factura()
RETURNS INTEGER AS $$
DECLARE
  v_numero INTEGER;
BEGIN
  SELECT nextval('seq_factura_numero') INTO v_numero;
  RETURN v_numero;
END;
$$ LANGUAGE plpgsql;

-- Función para emitir factura (asignar número)
CREATE OR REPLACE FUNCTION emitir_factura(p_factura_id UUID)
RETURNS TABLE (numero INTEGER, numero_completo TEXT) AS $$
DECLARE
  v_numero INTEGER;
  v_estado estado_factura;
BEGIN
  -- Verificar estado actual
  SELECT estado INTO v_estado FROM facturas WHERE id = p_factura_id;
  
  IF v_estado != 'borrador' THEN
    RAISE EXCEPTION 'Solo se pueden emitir facturas en estado borrador';
  END IF;
  
  -- Obtener siguiente número
  v_numero := get_siguiente_numero_factura();
  
  -- Actualizar factura
  UPDATE facturas
  SET numero = v_numero,
      estado = 'emitida',
      fecha_factura = CURRENT_DATE
  WHERE id = p_factura_id;
  
  -- Marcar lecturas como facturadas
  UPDATE lecturas
  SET facturada = true,
      factura_id = p_factura_id
  WHERE id IN (
    SELECT lectura_id FROM facturas_lineas 
    WHERE factura_id = p_factura_id AND lectura_id IS NOT NULL
  );
  
  RETURN QUERY
  SELECT v_numero, '2/' || v_numero::TEXT;
END;
$$ LANGUAGE plpgsql;
```

### 3.5 Políticas RLS

```sql
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_lineas ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas_consumo_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer" ON facturas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON facturas_lineas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON facturas_consumo_historico
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden modificar" ON facturas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON facturas_lineas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON facturas_consumo_historico
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

## 4. Diseño de la Factura PDF

### 4.1 Estructura del Documento

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  [LOGO]   A360 SERVICIOS ENERGÉTICOS                    FACTURA        │
│           C/ Polvoranca Nº 138                                         │
│           28923 Alcorcón, Madrid                        Nº 2/230371945 │
│           Tel: 91 159 11 70                             Fecha: 26/11/25│
│           clientes@a360se.com                           Cliente: 100970│
│           www.a360se.com                                               │
│           CIF: B88313473                                               │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  DATOS DEL CLIENTE                                                      │
│  ─────────────────                                                      │
│  OSCAR ZURRO NUÑEZ                                                      │
│  CIF: 11817440V                                                         │
│  CALLE HUERTAS DEL RIO 3, PORTAL 2 5ºH                                 │
│  28021 VILLAVERDE, Madrid                                               │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PERIODO DE FACTURACIÓN: 01/11/2025 - 30/11/2025                       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  DETALLE DE CONSUMOS                                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ ID CONTADOR: 22804168                                           │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Concepto                          Cantidad  Precio U.    Total  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Agua Caliente Sanitaria                                         │   │
│  │   Lectura anterior (21/10/2025): 20.1350 m³                     │   │
│  │   Lectura actual (23/11/2025):   21.2080 m³                     │   │
│  │   Consumo:                        1.0730 m³   6.4500    6.92 €  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │ Término fijo gestión energética   1.0000     8.2000    8.20 €  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  EVOLUCIÓN DE CONSUMO (últimos 6 meses)                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │     ▓                                                           │   │
│  │     ▓    ▓                        ▓                             │   │
│  │  ▓  ▓    ▓    ▓         ▓         ▓                             │   │
│  │  ▓  ▓    ▓    ▓    ▓    ▓    ▓    ▓                             │   │
│  │ Jun Jul  Ago  Sep  Oct  Nov                                     │   │
│  │ 0.8 1.2  1.1  0.9  0.7  1.1  m³                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                              RESUMEN                                    │
│                              ───────                                    │
│  Condición de pago: RECIBO SEPA          Base imponible:     15.12 €  │
│  IBAN: ES12 1234 5678 9012 3456 7890     IVA (21%):           3.18 €  │
│                                          ─────────────────────────────  │
│                                          TOTAL:              18.30 €  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  VENCIMIENTOS                                                           │
│  ┌───────────────┬─────────────────┬──────────────┐                    │
│  │ Fecha         │ Importe         │ Estado       │                    │
│  ├───────────────┼─────────────────┼──────────────┤                    │
│  │ 30/11/2025    │ 18.30 €         │ Pendiente    │                    │
│  └───────────────┴─────────────────┴──────────────┘                    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  A360 SERVICIOS ENERGÉTICOS S.L. - CIF: B88313473                      │
│  [ISO 50001] [ISO 14001] [ISO 9001]                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Especificaciones de Diseño

**Tipografía:**
- Títulos: Arial Bold, 14pt
- Subtítulos: Arial Bold, 11pt
- Texto normal: Arial Regular, 10pt
- Números en tablas: Arial Regular, 10pt, alineación derecha

**Colores:**
- Azul corporativo: #1B4F72 (encabezados, logo)
- Azul secundario: #2E86AB (acentos)
- Gris oscuro: #333333 (texto principal)
- Gris claro: #F5F5F5 (fondos de tabla)
- Verde: #28A745 (estado pagado)
- Rojo: #DC3545 (estado pendiente/anulado)

**Márgenes:**
- Superior: 20mm
- Inferior: 20mm
- Izquierdo: 15mm
- Derecho: 15mm

**Tamaño:** A4 (210 × 297 mm)

### 4.3 Gráfico de Evolución de Consumo

**Especificaciones:**
- Tipo: Gráfico de barras verticales
- Datos: Últimos 6 meses de consumo del concepto principal
- Ancho: 100% del área de contenido
- Alto: 60px
- Colores de barras: Gradiente de azul (#2E86AB a #1B4F72)
- Etiquetas: Mes abreviado y valor debajo de cada barra

**Datos a mostrar:**
```javascript
// Obtener últimos 6 meses de consumo
const historicoConsumo = await getHistoricoConsumo(contadorId, conceptoId, 6);
// Resultado: [
//   { periodo: '2025-06', consumo: 0.8 },
//   { periodo: '2025-07', consumo: 1.2 },
//   { periodo: '2025-08', consumo: 1.1 },
//   { periodo: '2025-09', consumo: 0.9 },
//   { periodo: '2025-10', consumo: 0.7 },
//   { periodo: '2025-11', consumo: 1.1 }
// ]
```

---

## 5. Motor de Facturación

### 5.1 Algoritmo de Generación de Facturas

```javascript
async function generarFactura(params) {
  const {
    clienteId,
    ubicacionId,
    contadorId,
    periodoInicio,
    periodoFin,
    lecturaIds // Lecturas a incluir
  } = params;
  
  // 1. Obtener datos del cliente
  const cliente = await getCliente(clienteId);
  const ubicacion = await getUbicacion(ubicacionId);
  const contador = await getContador(contadorId);
  const comunidad = await getComunidad(ubicacion.comunidad_id);
  
  // 2. Calcular días del periodo
  const diasPeriodo = differenceInDays(periodoFin, periodoInicio) + 1;
  const diasMes = getDaysInMonth(periodoInicio);
  const esParcial = diasPeriodo < diasMes;
  
  // 3. Crear factura en borrador
  const factura = await createFactura({
    cliente_id: clienteId,
    comunidad_id: comunidad.id,
    ubicacion_id: ubicacionId,
    contador_id: contadorId,
    periodo_inicio: periodoInicio,
    periodo_fin: periodoFin,
    es_periodo_parcial: esParcial,
    dias_periodo: diasPeriodo,
    fecha_vencimiento: addDays(periodoFin, 15), // Vence 15 días después
    estado: 'borrador',
    metodo_pago: cliente.iban ? 'domiciliacion' : 'transferencia',
    // Snapshot de datos del cliente
    cliente_nombre: `${cliente.nombre} ${cliente.apellidos}`,
    cliente_nif: cliente.nif,
    cliente_direccion: cliente.direccion_correspondencia || ubicacion.direccion_completa,
    cliente_cp: cliente.cp_correspondencia || ubicacion.cp,
    cliente_ciudad: cliente.ciudad_correspondencia || ubicacion.ciudad,
    cliente_provincia: cliente.provincia_correspondencia || ubicacion.provincia,
    cliente_email: cliente.email,
    cliente_iban: cliente.iban,
    ubicacion_direccion: ubicacion.direccion_completa
  });
  
  // 4. Procesar lecturas y crear líneas
  let baseImponible = 0;
  const lineas = [];
  
  for (const lecturaId of lecturaIds) {
    const lectura = await getLectura(lecturaId);
    const concepto = await getConcepto(lectura.concepto_id);
    const precio = await getPrecioVigente(comunidad.id, concepto.id);
    
    const subtotal = lectura.consumo * precio.precio_unitario;
    baseImponible += subtotal;
    
    lineas.push({
      factura_id: factura.id,
      lectura_id: lecturaId,
      concepto_id: concepto.id,
      concepto_codigo: concepto.codigo,
      concepto_nombre: concepto.nombre,
      unidad_medida: concepto.unidad_medida,
      es_termino_fijo: false,
      contador_numero_serie: contador.numero_serie,
      lectura_anterior: lectura.lectura_anterior,
      fecha_lectura_anterior: lectura.fecha_lectura_anterior,
      lectura_actual: lectura.lectura_valor,
      fecha_lectura_actual: lectura.fecha_lectura,
      consumo: lectura.consumo,
      cantidad: lectura.consumo,
      precio_unitario: precio.precio_unitario,
      subtotal: subtotal,
      orden: lineas.length
    });
  }
  
  // 5. Añadir término fijo (si aplica)
  const conceptoTF = await getConceptoByCode('TF');
  const precioTF = await getPrecioVigente(comunidad.id, conceptoTF.id);
  
  if (precioTF) {
    // Prorratear si es periodo parcial
    const importeTF = esParcial 
      ? (precioTF.precio_unitario * diasPeriodo / diasMes)
      : precioTF.precio_unitario;
    
    baseImponible += importeTF;
    
    lineas.push({
      factura_id: factura.id,
      lectura_id: null,
      concepto_id: conceptoTF.id,
      concepto_codigo: conceptoTF.codigo,
      concepto_nombre: 'Término fijo gestión energética',
      unidad_medida: 'unidad',
      es_termino_fijo: true,
      cantidad: esParcial ? (diasPeriodo / diasMes) : 1,
      precio_unitario: precioTF.precio_unitario,
      subtotal: importeTF,
      orden: lineas.length
    });
  }
  
  // 6. Guardar líneas
  await createFacturaLineas(lineas);
  
  // 7. Calcular IVA y total
  const importeIva = baseImponible * 0.21;
  const total = baseImponible + importeIva;
  
  // 8. Actualizar factura con totales
  await updateFactura(factura.id, {
    base_imponible: round2(baseImponible),
    importe_iva: round2(importeIva),
    total: round2(total)
  });
  
  // 9. Obtener histórico para gráfico
  const historico = await getHistoricoConsumo(contadorId, 6);
  await saveHistoricoFactura(factura.id, historico);
  
  return factura.id;
}
```

### 5.2 Generación Masiva de Facturas

```javascript
async function generarFacturasMasivas(comunidadId, periodoInicio, periodoFin) {
  // 1. Obtener lecturas pendientes de facturar de la comunidad
  const lecturasPendientes = await getLecturasPendientesFacturar(
    comunidadId, 
    periodoInicio, 
    periodoFin
  );
  
  // 2. Agrupar por contador
  const lecturasPorContador = groupBy(lecturasPendientes, 'contador_id');
  
  // 3. Generar factura para cada contador
  const resultados = [];
  
  for (const [contadorId, lecturas] of Object.entries(lecturasPorContador)) {
    try {
      // Obtener cliente actual de la ubicación del contador
      const contador = await getContador(contadorId);
      const clienteActual = await getClienteActualUbicacion(contador.ubicacion_id);
      
      if (!clienteActual) {
        resultados.push({
          contadorId,
          status: 'error',
          error: 'Sin cliente asignado'
        });
        continue;
      }
      
      const facturaId = await generarFactura({
        clienteId: clienteActual.id,
        ubicacionId: contador.ubicacion_id,
        contadorId,
        periodoInicio,
        periodoFin,
        lecturaIds: lecturas.map(l => l.id)
      });
      
      resultados.push({
        contadorId,
        facturaId,
        status: 'success'
      });
      
    } catch (error) {
      resultados.push({
        contadorId,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return resultados;
}
```

### 5.3 Generación de PDF

```javascript
// Usando @react-pdf/renderer para generar PDFs
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333333'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  logo: {
    width: 80,
    height: 80
  },
  empresaInfo: {
    flex: 1,
    marginLeft: 15
  },
  facturaInfo: {
    alignItems: 'flex-end'
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B4F72'
  },
  seccion: {
    marginVertical: 10,
    padding: 10,
    backgroundColor: '#F5F5F5'
  },
  tabla: {
    marginVertical: 10
  },
  filaTabla: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    paddingVertical: 5
  },
  // ... más estilos
});

function FacturaPDF({ factura, lineas, historico }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header con logo y datos empresa */}
        <View style={styles.header}>
          <Image src="/logo-a360.png" style={styles.logo} />
          <View style={styles.empresaInfo}>
            <Text style={{ fontWeight: 'bold', fontSize: 14 }}>
              A360 SERVICIOS ENERGÉTICOS
            </Text>
            <Text>C/ Polvoranca Nº 138</Text>
            <Text>28923 Alcorcón, Madrid</Text>
            <Text>Tel: 91 159 11 70</Text>
            <Text>clientes@a360se.com</Text>
            <Text>CIF: B88313473</Text>
          </View>
          <View style={styles.facturaInfo}>
            <Text style={styles.titulo}>FACTURA</Text>
            <Text>Nº {factura.numero_completo}</Text>
            <Text>Fecha: {formatDate(factura.fecha_factura)}</Text>
            <Text>Cliente: {factura.cliente_id.slice(0, 6)}</Text>
          </View>
        </View>
        
        {/* Datos del cliente */}
        <View style={styles.seccion}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
            DATOS DEL CLIENTE
          </Text>
          <Text>{factura.cliente_nombre}</Text>
          <Text>CIF: {factura.cliente_nif}</Text>
          <Text>{factura.cliente_direccion}</Text>
          <Text>
            {factura.cliente_cp} {factura.cliente_ciudad}, {factura.cliente_provincia}
          </Text>
        </View>
        
        {/* Periodo */}
        <View style={{ marginVertical: 10 }}>
          <Text>
            PERIODO DE FACTURACIÓN: {formatDate(factura.periodo_inicio)} - {formatDate(factura.periodo_fin)}
            {factura.es_periodo_parcial && ' (Periodo parcial)'}
          </Text>
        </View>
        
        {/* Detalle de consumos */}
        <View style={styles.tabla}>
          <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
            DETALLE DE CONSUMOS
          </Text>
          {lineas.map((linea, index) => (
            <LineaFactura key={index} linea={linea} />
          ))}
        </View>
        
        {/* Gráfico de evolución */}
        {historico.length > 0 && (
          <View style={{ marginVertical: 15 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
              EVOLUCIÓN DE CONSUMO (últimos 6 meses)
            </Text>
            <GraficoConsumo data={historico} />
          </View>
        )}
        
        {/* Resumen */}
        <View style={[styles.seccion, { flexDirection: 'row', justifyContent: 'space-between' }]}>
          <View>
            <Text>Condición de pago: {getMetodoPagoLabel(factura.metodo_pago)}</Text>
            {factura.cliente_iban && (
              <Text>IBAN: {formatIBAN(factura.cliente_iban)}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text>Base imponible: {formatCurrency(factura.base_imponible)}</Text>
            <Text>IVA ({factura.porcentaje_iva}%): {formatCurrency(factura.importe_iva)}</Text>
            <Text style={{ fontWeight: 'bold', fontSize: 14, marginTop: 5 }}>
              TOTAL: {formatCurrency(factura.total)}
            </Text>
          </View>
        </View>
        
        {/* Vencimientos */}
        <View style={styles.tabla}>
          <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>VENCIMIENTOS</Text>
          <View style={styles.filaTabla}>
            <Text style={{ flex: 1 }}>Fecha</Text>
            <Text style={{ flex: 1 }}>Importe</Text>
            <Text style={{ flex: 1 }}>Estado</Text>
          </View>
          <View style={styles.filaTabla}>
            <Text style={{ flex: 1 }}>{formatDate(factura.fecha_vencimiento)}</Text>
            <Text style={{ flex: 1 }}>{formatCurrency(factura.total)}</Text>
            <Text style={{ flex: 1, color: factura.estado === 'pagada' ? '#28A745' : '#DC3545' }}>
              {factura.estado === 'pagada' ? 'Pagado' : 'Pendiente'}
            </Text>
          </View>
        </View>
        
        {/* Footer */}
        <View style={{ position: 'absolute', bottom: 40, left: 40, right: 40 }}>
          <Text style={{ textAlign: 'center', fontSize: 8, color: '#666666' }}>
            A360 SERVICIOS ENERGÉTICOS S.L. - CIF: B88313473
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 5 }}>
            <Image src="/iso-50001.png" style={{ width: 30, height: 30, marginHorizontal: 5 }} />
            <Image src="/iso-14001.png" style={{ width: 30, height: 30, marginHorizontal: 5 }} />
            <Image src="/iso-9001.png" style={{ width: 30, height: 30, marginHorizontal: 5 }} />
          </View>
        </View>
      </Page>
    </Document>
  );
}
```

---

## 6. Interfaces de Usuario

### 6.1 Pantalla: Generar Facturas

**Ruta:** `/facturacion/generar`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🧾 Generar Facturas                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PASO 1: Seleccionar Comunidad y Periodo                               │
│  ───────────────────────────────────────                               │
│                                                                         │
│  Comunidad: [Troya 40                              ▼]                  │
│                                                                         │
│  Periodo:   [Noviembre 2025 ▼]    o    Personalizado:                  │
│             Desde: [01/11/2025]   Hasta: [30/11/2025]                  │
│                                                                         │
│                                         [Buscar lecturas pendientes →] │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PASO 2: Lecturas Pendientes de Facturar                               │
│  ───────────────────────────────────────                               │
│                                                                         │
│  Se encontraron 42 lecturas pendientes en 38 contadores                │
│                                                                         │
│  ☑️ Seleccionar todos                                                   │
│                                                                         │
│  ┌────┬──────────┬─────────┬───────────┬────────┬─────────┬──────────┐ │
│  │ ☑️ │ Contador │ Cliente │ Ubicación │Concepto│ Consumo │ Estimado │ │
│  ├────┼──────────┼─────────┼───────────┼────────┼─────────┼──────────┤ │
│  │ ☑️ │ 22804168 │O. Zurro │ P2 5ºH    │ ACS    │ 1.073 m³│  6.92 €  │ │
│  │ ☑️ │ 22804168 │O. Zurro │ P2 5ºH    │ CAL    │ 45.2 Kc │ 12.30 €  │ │
│  │ ☑️ │ 22804201 │M. López │ P2 3ºA    │ ACS    │ 2.150 m³│ 13.87 €  │ │
│  │ ☐ │ 22804215 │— Sin —  │ P3 1ºB    │ ACS    │ 0.540 m³│  3.48 €  │ │
│  │    │          │ cliente │           │        │         │   ⚠️     │ │
│  │ ...│ ...      │ ...     │ ...       │ ...    │ ...     │ ...      │ │
│  └────┴──────────┴─────────┴───────────┴────────┴─────────┴──────────┘ │
│                                                                         │
│  Resumen: 38 facturas a generar | Total estimado: 1,245.80 €           │
│                                                                         │
│                     [Cancelar]    [Generar 38 facturas en borrador →]  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Pantalla: Lista de Facturas

**Ruta:** `/facturacion/facturas`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🧾 Facturas                                        [+ Generar Facturas]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Filtrar: [Todas las comunidades ▼] [Todos los estados ▼] [Este mes ▼]│
│  Buscar:  [Nº factura, cliente, NIF...                    ] [🔍]       │
│                                                                         │
│  ┌──────────────┬────────────┬──────────────┬─────────┬───────┬──────┐ │
│  │ Nº Factura   │ Fecha      │ Cliente      │ Total   │Estado │ Acc. │ │
│  ├──────────────┼────────────┼──────────────┼─────────┼───────┼──────┤ │
│  │ 2/230371950  │ 26/11/2025 │ Oscar Zurro  │  18.30 €│✅ Pag.│👁️📄🔄│ │
│  │ 2/230371949  │ 26/11/2025 │ María López  │  25.45 €│📨 Emi.│👁️📄✉️│ │
│  │ 2/230371948  │ 26/11/2025 │ Juan García  │  32.10 €│📨 Emi.│👁️📄✉️│ │
│  │ — Borrador — │ 26/11/2025 │ Ana Martín   │  15.60 €│📝 Borr│👁️✏️🗑️│ │
│  │ 2/230371945  │ 25/11/2025 │ Pedro Ruiz   │  28.90 €│❌ Anul│👁️📄  │ │
│  │ ...          │ ...        │ ...          │ ...     │ ...   │ ...  │ │
│  └──────────────┴────────────┴──────────────┴─────────┴───────┴──────┘ │
│                                                                         │
│  Mostrando 1-20 de 156 facturas                    [◄ Anterior] [Sig ►]│
│                                                                         │
│  Estados: ✅ Pagada  📨 Emitida  📝 Borrador  ❌ Anulada                 │
│  Acciones: 👁️ Ver  📄 PDF  ✉️ Enviar  ✏️ Editar  🗑️ Eliminar  🔄 Marcar pagada│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Pantalla: Detalle de Factura

**Ruta:** `/facturacion/facturas/:id`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Volver                                                               │
│                                                                         │
│  FACTURA 2/230371950                                    Estado: ✅ Pagada│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ DATOS GENERALES             │  │ CLIENTE                         │  │
│  │ ─────────────               │  │ ───────                         │  │
│  │ Fecha: 26/11/2025           │  │ Oscar Zurro Nuñez               │  │
│  │ Vencimiento: 15/12/2025     │  │ NIF: 11817440V                  │  │
│  │ Periodo: 01/11 - 30/11/2025 │  │ Calle Huertas del Rio 3, P2 5ºH│  │
│  │ Comunidad: Troya 40         │  │ 28021 Villaverde, Madrid        │  │
│  │ Método pago: Domiciliación  │  │ oscar.zurro@email.com           │  │
│  └─────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                         │
│  LÍNEAS DE FACTURA                                                      │
│  ─────────────────                                                      │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Concepto                              Cantidad  Precio    Subtotal ││
│  ├────────────────────────────────────────────────────────────────────┤│
│  │ Agua Caliente Sanitaria                                            ││
│  │   Contador: 22804168                                               ││
│  │   Lectura ant: 20.1350 (21/10) → Actual: 21.2080 (23/11)          ││
│  │   Consumo: 1.0730 m³                  1.0730    6.4500      6.92 € ││
│  ├────────────────────────────────────────────────────────────────────┤│
│  │ Término fijo gestión energética       1.0000    8.2000      8.20 € ││
│  ├────────────────────────────────────────────────────────────────────┤│
│  │                                       Base imponible:      15.12 € ││
│  │                                       IVA (21%):            3.18 € ││
│  │                                       ─────────────────────────────││
│  │                                       TOTAL:               18.30 € ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  EVOLUCIÓN DE CONSUMO                                                   │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │  [Gráfico de barras con últimos 6 meses de consumo ACS]           ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ACCIONES                                                               │
│  [📄 Descargar PDF]  [✉️ Enviar por email]  [🔄 Marcar como pagada]     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Modal: Previsualización de Factura

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Previsualización de Factura                                       [X] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  │                    [Vista previa del PDF]                       │   │
│  │                                                                 │   │
│  │                    (Renderizado del PDF                         │   │
│  │                     a tamaño reducido)                          │   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Resumen:                                                               │
│  • Cliente: Oscar Zurro Nuñez                                          │
│  • Periodo: 01/11/2025 - 30/11/2025                                    │
│  • Líneas: 2 conceptos                                                 │
│  • Total: 18.30 €                                                      │
│                                                                         │
│  ⚠️ Al confirmar se asignará el número de factura 2/230371951          │
│     Esta acción no se puede deshacer.                                  │
│                                                                         │
│        [Cancelar]    [Guardar borrador]    [✓ Confirmar y emitir]      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.5 Pantalla: Emisión Masiva

**Ruta:** `/facturacion/emitir-masivo`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📤 Emisión Masiva de Facturas                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Facturas en borrador pendientes de emitir: 38                         │
│                                                                         │
│  Filtrar: [Todas las comunidades ▼]                                    │
│                                                                         │
│  ☑️ Seleccionar todas                                                   │
│                                                                         │
│  ┌────┬────────────┬──────────────┬───────────┬──────────┬───────────┐ │
│  │ ☑️ │ Comunidad  │ Cliente      │ Periodo   │ Total    │ Estado    │ │
│  ├────┼────────────┼──────────────┼───────────┼──────────┼───────────┤ │
│  │ ☑️ │ Troya 40   │ Oscar Zurro  │ Nov 2025  │  18.30 € │ Borrador  │ │
│  │ ☑️ │ Troya 40   │ María López  │ Nov 2025  │  25.45 € │ Borrador  │ │
│  │ ☑️ │ Troya 40   │ Juan García  │ Nov 2025  │  32.10 € │ Borrador  │ │
│  │ ☑️ │ Hermes 12  │ Ana Martín   │ Nov 2025  │  15.60 € │ Borrador  │ │
│  │ ...│ ...        │ ...          │ ...       │ ...      │ ...       │ │
│  └────┴────────────┴──────────────┴───────────┴──────────┴───────────┘ │
│                                                                         │
│  Seleccionadas: 38 facturas | Total: 1,245.80 €                        │
│                                                                         │
│  ⚠️ Se asignarán números de factura del 2/230371951 al 2/230371988     │
│                                                                         │
│              [Cancelar]                [Emitir 38 facturas →]          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Componentes

### 7.1 Componentes de Generación

| Componente | Descripción |
|------------|-------------|
| `GenerarFacturasWizard` | Wizard de pasos para generar facturas |
| `PeriodoSelector` | Selector de periodo (mes o personalizado) |
| `LecturasPendientesTable` | Tabla de lecturas pendientes de facturar |
| `ResumenGeneracion` | Resumen de facturas a generar |

### 7.2 Componentes de Visualización

| Componente | Descripción |
|------------|-------------|
| `FacturasTable` | Tabla principal de facturas |
| `FacturaFilters` | Filtros de búsqueda y estado |
| `FacturaDetalle` | Vista detalle de una factura |
| `FacturaLineas` | Lista de líneas de una factura |
| `GraficoConsumo` | Gráfico de barras de evolución de consumo |
| `EstadoBadge` | Badge de estado con colores |

### 7.3 Componentes de PDF

| Componente | Descripción |
|------------|-------------|
| `FacturaPDF` | Documento PDF completo |
| `PDFPreview` | Previsualización del PDF en modal |
| `PDFDownloadButton` | Botón de descarga de PDF |
| `LineaFacturaPDF` | Línea de factura para PDF |
| `GraficoConsumoPDF` | Gráfico para PDF (SVG/Canvas) |

### 7.4 Componentes de Acciones

| Componente | Descripción |
|------------|-------------|
| `EmitirFacturaButton` | Botón para emitir factura individual |
| `EmisionMasivaModal` | Modal de emisión masiva |
| `AnularFacturaModal` | Modal de anulación con motivo |
| `MarcarPagadaButton` | Botón para marcar como pagada |

---

## 8. Hooks Personalizados

```javascript
// Facturas
useFacturas(filtros)                    // Lista de facturas
useFactura(id)                          // Detalle de factura
useFacturaLineas(facturaId)             // Líneas de una factura
useCreateFactura()                      // Crear factura borrador
useUpdateFactura()                      // Actualizar factura borrador
useDeleteFactura()                      // Eliminar factura borrador
useEmitirFactura()                      // Emitir factura (asignar número)
useEmitirFacturasMasivo()               // Emisión masiva
useAnularFactura()                      // Anular factura
useMarcarPagada()                       // Marcar como pagada

// Generación
useLecturasPendientes(comunidadId, periodo)  // Lecturas sin facturar
useGenerarFacturas()                         // Generar facturas desde lecturas
useGenerarFacturasMasivo()                   // Generación masiva

// PDF
useGenerarPDF(facturaId)                // Generar PDF de factura
useDescargarPDF(facturaId)              // Descargar PDF
useHistoricoConsumo(contadorId, meses)  // Datos para gráfico

// Estadísticas
useEstadisticasFacturacion(periodo)     // Totales y métricas
```

---

## 9. Tareas de Implementación

### 9.1 Base de Datos

- [ ] Crear archivo `supabase/migrations/004_facturacion_schema.sql`
- [ ] Crear tipos ENUM (estado_factura, metodo_pago)
- [ ] Crear tabla `facturas`
- [ ] Crear tabla `facturas_lineas`
- [ ] Crear tabla `facturas_consumo_historico`
- [ ] Crear secuencia `seq_factura_numero`
- [ ] Crear función `get_siguiente_numero_factura`
- [ ] Crear función `emitir_factura`
- [ ] Crear políticas RLS
- [ ] Crear índices

### 9.2 Dependencias

```bash
npm install @react-pdf/renderer recharts
```

- [ ] Instalar `@react-pdf/renderer` para generación de PDFs
- [ ] Instalar `recharts` para gráficos en la UI (previsualización)

### 9.3 Estructura de Carpetas

- [ ] Crear `src/features/facturacion/`
- [ ] Crear `src/features/facturacion/components/`
- [ ] Crear `src/features/facturacion/hooks/`
- [ ] Crear `src/features/facturacion/pdf/`
- [ ] Crear `src/features/facturacion/utils/`

### 9.4 Motor de Facturación

- [ ] Implementar `calcularFactura.js` - Lógica de cálculo
- [ ] Implementar `generarFactura.js` - Creación de factura
- [ ] Implementar `generarFacturasMasivo.js` - Generación masiva
- [ ] Implementar `emitirFactura.js` - Asignación de número
- [ ] Implementar `prorrateoTerminoFijo.js` - Cálculo proporcional

### 9.5 Generación de PDF

- [ ] Crear assets: logo, iconos ISO
- [ ] Implementar `FacturaPDF.jsx` - Documento principal
- [ ] Implementar `HeaderPDF.jsx` - Cabecera
- [ ] Implementar `DatosClientePDF.jsx` - Sección cliente
- [ ] Implementar `LineasPDF.jsx` - Tabla de líneas
- [ ] Implementar `GraficoConsumoPDF.jsx` - Gráfico SVG
- [ ] Implementar `ResumenPDF.jsx` - Totales
- [ ] Implementar `FooterPDF.jsx` - Pie de página
- [ ] Implementar `generarPDF.js` - Función de generación
- [ ] Implementar estilos PDF

### 9.6 Hooks

- [ ] Implementar `useFacturas`
- [ ] Implementar `useFactura`
- [ ] Implementar `useFacturaLineas`
- [ ] Implementar `useCreateFactura`
- [ ] Implementar `useEmitirFactura`
- [ ] Implementar `useEmitirFacturasMasivo`
- [ ] Implementar `useAnularFactura`
- [ ] Implementar `useMarcarPagada`
- [ ] Implementar `useLecturasPendientes`
- [ ] Implementar `useGenerarFacturas`
- [ ] Implementar `useGenerarPDF`
- [ ] Implementar `useHistoricoConsumo`

### 9.7 Componentes de Generación

- [ ] Implementar `GenerarFacturasWizard`
- [ ] Implementar `PeriodoSelector`
- [ ] Implementar `LecturasPendientesTable`
- [ ] Implementar `ResumenGeneracion`
- [ ] Crear página `GenerarFacturasPage`

### 9.8 Componentes de Visualización

- [ ] Implementar `FacturasTable`
- [ ] Implementar `FacturaFilters`
- [ ] Implementar `FacturaDetalle`
- [ ] Implementar `FacturaLineas`
- [ ] Implementar `GraficoConsumo`
- [ ] Implementar `EstadoBadge`
- [ ] Crear página `FacturasListPage`
- [ ] Crear página `FacturaDetailPage`

### 9.9 Componentes de PDF

- [ ] Implementar `PDFPreview`
- [ ] Implementar `PDFDownloadButton`

### 9.10 Componentes de Acciones

- [ ] Implementar `EmitirFacturaButton`
- [ ] Implementar `EmisionMasivaModal`
- [ ] Implementar `AnularFacturaModal`
- [ ] Implementar `MarcarPagadaButton`
- [ ] Crear página `EmisionMasivaPage`

### 9.11 Navegación

- [ ] Añadir sección "Facturación" al Sidebar
- [ ] Añadir subopciones: Generar, Facturas, Emitir
- [ ] Añadir rutas a React Router

### 9.12 Testing

- [ ] Probar generación de factura individual
- [ ] Probar generación masiva
- [ ] Probar cálculo de importes
- [ ] Probar prorrateo de término fijo
- [ ] Probar emisión y asignación de número
- [ ] Probar generación de PDF
- [ ] Probar gráfico de consumo en PDF
- [ ] Probar anulación de factura
- [ ] Probar marcado como pagada
- [ ] Verificar secuencia sin huecos

### 9.13 Documentación

- [ ] Crear `docs/PRD/fase-3.md`
- [ ] Documentar diseño de factura
- [ ] Documentar reglas de numeración
- [ ] Merge de `phase/3` a `develop`

---

## 10. Criterios de Aceptación

| # | Criterio | Verificación |
|---|----------|--------------|
| 1 | **Generación individual** | Se puede generar una factura desde lecturas pendientes |
| 2 | **Generación masiva** | Se pueden generar múltiples facturas de una comunidad |
| 3 | **Cálculo correcto** | Base imponible, IVA y total se calculan correctamente |
| 4 | **Término fijo** | El término fijo se prorratea en periodos parciales |
| 5 | **Numeración secuencial** | Los números de factura son consecutivos sin huecos |
| 6 | **Estados de factura** | Las facturas transicionan correctamente entre estados |
| 7 | **PDF generado** | El PDF se genera con el diseño especificado |
| 8 | **Gráfico de consumo** | El PDF incluye gráfico de evolución de 6 meses |
| 9 | **Previsualización** | Se puede previsualizar la factura antes de emitir |
| 10 | **Snapshot de datos** | Los datos del cliente se guardan en la factura |
| 11 | **Anulación** | Se puede anular una factura emitida con motivo |
| 12 | **Marcar pagada** | Se puede marcar una factura como pagada |

---

## 11. Dependencias

### 11.1 Requiere de Fase 2

- Tabla `lecturas` con lecturas confirmadas
- Lecturas marcadas como `facturada = false`
- Sistema de importación funcionando

### 11.2 Bloquea Fase 4

La Fase 4 (Envío de Facturas) requiere:
- Facturas en estado `emitida`
- PDFs generados y almacenados
- Emails de clientes disponibles

---

## 12. Notas para Agentes de IA

### Orden de Implementación Recomendado

1. **Primero:** Migraciones de base de datos y secuencia
2. **Segundo:** Motor de cálculo y generación
3. **Tercero:** Hooks de datos
4. **Cuarto:** Componentes de generación
5. **Quinto:** Componentes de visualización
6. **Sexto:** Generación de PDF
7. **Séptimo:** Acciones (emitir, anular, pagar)

### Consideraciones de Numeración

```javascript
// CRÍTICO: La numeración debe ser atómica
// Usar la función de base de datos para evitar condiciones de carrera

async function emitirFactura(facturaId) {
  const { data, error } = await supabase
    .rpc('emitir_factura', { p_factura_id: facturaId });
  
  if (error) throw error;
  return data; // { numero, numero_completo }
}
```

### Formato de Moneda

```javascript
// Siempre usar formato español
function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(value);
}

// Resultado: "18,30 €"
```

### Redondeo de Importes

```javascript
// Siempre redondear a 2 decimales para importes
function round2(value) {
  return Math.round(value * 100) / 100;
}

// Usar en todos los cálculos de importes
const baseImponible = round2(cantidad * precioUnitario);
const iva = round2(baseImponible * 0.21);
const total = round2(baseImponible + iva);
```

### Gráfico de Consumo para PDF

```javascript
// Para el PDF, generar SVG en lugar de usar recharts
function generarGraficoSVG(datos, width = 400, height = 100) {
  const maxConsumo = Math.max(...datos.map(d => d.consumo));
  const barWidth = width / datos.length - 10;
  
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
  
  datos.forEach((d, i) => {
    const barHeight = (d.consumo / maxConsumo) * (height - 30);
    const x = i * (barWidth + 10) + 5;
    const y = height - barHeight - 20;
    
    svg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#2E86AB"/>`;
    svg += `<text x="${x + barWidth/2}" y="${height - 5}" text-anchor="middle" font-size="8">${d.mes}</text>`;
  });
  
  svg += '</svg>';
  return svg;
}
```

---

## Anexo: Ejemplo de Datos de Factura

```json
{
  "id": "uuid-factura",
  "serie": 2,
  "numero": 230371950,
  "numero_completo": "2/230371950",
  "cliente_id": "uuid-cliente",
  "comunidad_id": "uuid-comunidad",
  "ubicacion_id": "uuid-ubicacion",
  "contador_id": "uuid-contador",
  "periodo_inicio": "2025-11-01",
  "periodo_fin": "2025-11-30",
  "es_periodo_parcial": false,
  "dias_periodo": 30,
  "fecha_factura": "2025-11-26",
  "fecha_vencimiento": "2025-12-15",
  "base_imponible": 15.12,
  "porcentaje_iva": 21.00,
  "importe_iva": 3.18,
  "total": 18.30,
  "estado": "emitida",
  "metodo_pago": "domiciliacion",
  "cliente_nombre": "OSCAR ZURRO NUÑEZ",
  "cliente_nif": "11817440V",
  "cliente_direccion": "CALLE HUERTAS DEL RIO 3, PORTAL 2 5ºH",
  "cliente_cp": "28021",
  "cliente_ciudad": "VILLAVERDE",
  "cliente_provincia": "Madrid",
  "cliente_email": "oscar.zurro@email.com",
  "cliente_iban": "ES1234567890123456789012",
  "lineas": [
    {
      "concepto_nombre": "Agua Caliente Sanitaria",
      "contador_numero_serie": "22804168",
      "lectura_anterior": 20.1350,
      "fecha_lectura_anterior": "2025-10-21",
      "lectura_actual": 21.2080,
      "fecha_lectura_actual": "2025-11-23",
      "consumo": 1.0730,
      "cantidad": 1.0730,
      "precio_unitario": 6.4500,
      "subtotal": 6.92
    },
    {
      "concepto_nombre": "Término fijo gestión energética",
      "es_termino_fijo": true,
      "cantidad": 1.0000,
      "precio_unitario": 8.2000,
      "subtotal": 8.20
    }
  ],
  "historico_consumo": [
    { "periodo": "2025-06", "concepto": "ACS", "consumo": 0.85 },
    { "periodo": "2025-07", "concepto": "ACS", "consumo": 1.20 },
    { "periodo": "2025-08", "concepto": "ACS", "consumo": 1.10 },
    { "periodo": "2025-09", "concepto": "ACS", "consumo": 0.95 },
    { "periodo": "2025-10", "concepto": "ACS", "consumo": 0.72 },
    { "periodo": "2025-11", "concepto": "ACS", "consumo": 1.07 }
  ]
}
```

---

*Fin del PRD Fase 3*
