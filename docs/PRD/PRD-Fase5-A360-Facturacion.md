# PRD Fase 5: Remesas Bancarias y Reportes

## Sistema de Facturación de Gestión Energética A360

| Campo | Valor |
|-------|-------|
| **Cliente** | A360 Servicios Energéticos S.L. |
| **Proyecto** | Sistema de Facturación Energética |
| **Versión** | 1.0 |
| **Fecha** | Diciembre 2025 |
| **Fase** | 5 de 5 |
| **Dependencia** | Requiere Fase 4 completada |

---

## 1. Objetivo de esta Fase

Esta fase implementa la generación de ficheros de remesas bancarias en formato SEPA XML (ISO 20022) para la domiciliación de cobros, y un sistema completo de reportes que permite analizar consumos, facturación y actividad del sistema. Con esta fase se completa el ciclo de facturación de principio a fin.

### Entregables principales

- Generación de ficheros SEPA XML (pain.008.001.02) para adeudos directos
- Gestión de remesas (creación, validación, descarga, histórico)
- Sistema de reportes de consumos (por vivienda, comunidad, anual)
- Sistema de reportes de facturación (emitidas, cobradas, pendientes)
- Dashboard de métricas y KPIs
- Exportación de datos en múltiples formatos (Excel, CSV, PDF)
- Preparación para integración futura con ERP

---

## 2. Remesas Bancarias SEPA

### 2.1 Conceptos SEPA

**SEPA (Single Euro Payments Area):** Zona única de pagos en euros que permite realizar transferencias y adeudos directos en las mismas condiciones en toda Europa.

**Adeudo Directo SEPA (SEPA Direct Debit):** Instrumento de pago mediante el cual el acreedor (A360) cobra directamente de la cuenta del deudor (cliente) en base a un mandato previamente firmado.

**Formato pain.008:** Estándar ISO 20022 para mensajes de adeudo directo. La versión pain.008.001.02 es la utilizada en España.

### 2.2 Estructura del Fichero SEPA

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02">
  <CstmrDrctDbtInitn>
    <!-- Cabecera del mensaje -->
    <GrpHdr>
      <MsgId>A360-REM-20251126-001</MsgId>
      <CreDtTm>2025-11-26T10:30:00</CreDtTm>
      <NbOfTxs>45</NbOfTxs>
      <CtrlSum>1245.80</CtrlSum>
      <InitgPty>
        <Nm>A360 SERVICIOS ENERGETICOS SL</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>ES12345B88313473</Id>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>
    
    <!-- Información del pago -->
    <PmtInf>
      <PmtInfId>A360-PMT-20251126-001</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>45</NbOfTxs>
      <CtrlSum>1245.80</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
        <LclInstrm><Cd>CORE</Cd></LclInstrm>
        <SeqTp>RCUR</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>2025-12-01</ReqdColltnDt>
      <Cdtr>
        <Nm>A360 SERVICIOS ENERGETICOS SL</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id><IBAN>ES1234567890123456789012</IBAN></Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId><BIC>CABORABBXXX</BIC></FinInstnId>
      </CdtrAgt>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>ES12000B88313473</Id>
              <SchmeNm><Prtry>SEPA</Prtry></SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>
      
      <!-- Transacciones individuales -->
      <DrctDbtTxInf>
        <PmtId>
          <EndToEndId>FAC-2-230371950</EndToEndId>
        </PmtId>
        <InstdAmt Ccy="EUR">18.30</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>A360-CLI-100970</MndtId>
            <DtOfSgntr>2024-01-15</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId><BIC>CAIXESBBXXX</BIC></FinInstnId>
        </DbtrAgt>
        <Dbtr>
          <Nm>OSCAR ZURRO NUNEZ</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id><IBAN>ES9821000418401234567891</IBAN></Id>
        </DbtrAcct>
        <RmtInf>
          <Ustrd>Factura 2/230371950 Gestion Energetica Nov 2025</Ustrd>
        </RmtInf>
      </DrctDbtTxInf>
      
      <!-- Más transacciones... -->
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>
```

### 2.3 Datos Necesarios para SEPA

**Datos del Acreedor (A360):**
- Nombre: A360 SERVICIOS ENERGETICOS SL
- CIF: B88313473
- IBAN cuenta de cobro
- BIC del banco
- Identificador de Acreedor SEPA (CIF con prefijo ES + dígitos control)

**Datos del Deudor (Cliente):**
- Nombre completo (sin acentos ni caracteres especiales)
- IBAN de la cuenta a cargar
- BIC del banco del cliente
- Referencia del mandato SEPA
- Fecha de firma del mandato

**Datos de la Factura:**
- Número de factura (referencia end-to-end)
- Importe total
- Concepto/Descripción

---

## 3. Esquema de Base de Datos

### 3.1 Tabla: `remesas`

Registra cada remesa bancaria generada.

```sql
CREATE TYPE estado_remesa AS ENUM (
  'borrador',       -- En preparación
  'generada',       -- Fichero XML generado
  'enviada',        -- Enviada al banco
  'procesada',      -- Procesada por el banco
  'parcial',        -- Cobrada parcialmente (algunos rechazos)
  'completada',     -- Todos los cobros realizados
  'rechazada'       -- Rechazada por el banco
);

CREATE TABLE remesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación
  referencia TEXT UNIQUE NOT NULL, -- A360-REM-YYYYMMDD-NNN
  descripcion TEXT,
  
  -- Fechas
  fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_cobro DATE NOT NULL, -- Fecha solicitada de cobro
  fecha_envio_banco DATE,
  fecha_procesado DATE,
  
  -- Totales
  num_recibos INTEGER NOT NULL DEFAULT 0,
  importe_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Resultados (tras procesamiento)
  num_cobrados INTEGER DEFAULT 0,
  importe_cobrado DECIMAL(12,2) DEFAULT 0,
  num_rechazados INTEGER DEFAULT 0,
  importe_rechazado DECIMAL(12,2) DEFAULT 0,
  
  -- Fichero
  fichero_xml TEXT, -- Contenido del XML
  fichero_nombre TEXT,
  
  -- Estado
  estado estado_remesa NOT NULL DEFAULT 'borrador',
  
  -- Cuenta de cobro
  iban_cobro TEXT NOT NULL,
  bic_cobro TEXT,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_remesas_fecha ON remesas(fecha_creacion DESC);
CREATE INDEX idx_remesas_estado ON remesas(estado);
CREATE INDEX idx_remesas_referencia ON remesas(referencia);

CREATE TRIGGER remesas_updated_at
  BEFORE UPDATE ON remesas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.2 Tabla: `remesas_recibos`

Detalle de cada recibo incluido en una remesa.

```sql
CREATE TYPE estado_recibo AS ENUM (
  'incluido',       -- Incluido en la remesa
  'cobrado',        -- Cobro realizado
  'rechazado',      -- Rechazado por el banco
  'devuelto'        -- Devuelto posteriormente
);

CREATE TABLE remesas_recibos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remesa_id UUID NOT NULL REFERENCES remesas(id) ON DELETE CASCADE,
  factura_id UUID NOT NULL REFERENCES facturas(id),
  
  -- Datos del recibo
  referencia_recibo TEXT NOT NULL, -- EndToEndId
  importe DECIMAL(10,2) NOT NULL,
  
  -- Datos del mandato
  mandato_referencia TEXT NOT NULL,
  mandato_fecha_firma DATE NOT NULL,
  
  -- Datos del deudor (snapshot)
  deudor_nombre TEXT NOT NULL,
  deudor_iban TEXT NOT NULL,
  deudor_bic TEXT,
  
  -- Concepto
  concepto TEXT NOT NULL,
  
  -- Estado
  estado estado_recibo NOT NULL DEFAULT 'incluido',
  
  -- Rechazo (si aplica)
  codigo_rechazo TEXT,
  motivo_rechazo TEXT,
  fecha_rechazo DATE,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_remesas_recibos_remesa ON remesas_recibos(remesa_id);
CREATE INDEX idx_remesas_recibos_factura ON remesas_recibos(factura_id);
CREATE INDEX idx_remesas_recibos_estado ON remesas_recibos(estado);

CREATE TRIGGER remesas_recibos_updated_at
  BEFORE UPDATE ON remesas_recibos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.3 Tabla: `mandatos_sepa`

Almacena los mandatos SEPA de los clientes.

```sql
CREATE TYPE estado_mandato AS ENUM (
  'activo',
  'cancelado',
  'vencido'
);

CREATE TABLE mandatos_sepa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id),
  
  -- Identificación
  referencia TEXT UNIQUE NOT NULL, -- A360-CLI-XXXXXX
  
  -- Datos bancarios
  iban TEXT NOT NULL,
  bic TEXT,
  titular_cuenta TEXT NOT NULL,
  
  -- Fechas
  fecha_firma DATE NOT NULL,
  fecha_primera_utilizacion DATE,
  fecha_ultima_utilizacion DATE,
  
  -- Tipo de secuencia
  tipo_secuencia TEXT NOT NULL DEFAULT 'RCUR', -- FRST, RCUR, OOFF, FNAL
  
  -- Estado
  estado estado_mandato NOT NULL DEFAULT 'activo',
  motivo_cancelacion TEXT,
  fecha_cancelacion DATE,
  
  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mandatos_cliente ON mandatos_sepa(cliente_id);
CREATE INDEX idx_mandatos_estado ON mandatos_sepa(estado);
CREATE INDEX idx_mandatos_referencia ON mandatos_sepa(referencia);

CREATE TRIGGER mandatos_sepa_updated_at
  BEFORE UPDATE ON mandatos_sepa
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 3.4 Tabla: `configuracion_sepa`

Configuración de los datos SEPA del acreedor.

```sql
CREATE TABLE configuracion_sepa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Datos del acreedor
  nombre_acreedor TEXT NOT NULL,
  cif_acreedor TEXT NOT NULL,
  identificador_acreedor TEXT NOT NULL, -- ES + dígitos control + CIF
  
  -- Cuenta de cobro principal
  iban_principal TEXT NOT NULL,
  bic_principal TEXT NOT NULL,
  nombre_banco TEXT,
  
  -- Configuración de generación
  prefijo_remesa TEXT NOT NULL DEFAULT 'A360-REM',
  prefijo_mandato TEXT NOT NULL DEFAULT 'A360-CLI',
  
  -- Días de antelación para fecha de cobro
  dias_antelacion_cobro INTEGER NOT NULL DEFAULT 5,
  
  -- Auditoría
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Singleton
CREATE UNIQUE INDEX idx_configuracion_sepa_singleton ON configuracion_sepa((true));

-- Insertar configuración inicial
INSERT INTO configuracion_sepa (
  id, nombre_acreedor, cif_acreedor, identificador_acreedor,
  iban_principal, bic_principal, nombre_banco
) VALUES (
  gen_random_uuid(),
  'A360 SERVICIOS ENERGETICOS SL',
  'B88313473',
  'ES12000B88313473',
  'ES0000000000000000000000', -- A configurar
  'XXXXXXXXXX', -- A configurar
  'Banco por configurar'
);
```

### 3.5 Actualizar tabla `clientes`

```sql
-- Añadir campos para mandato SEPA
ALTER TABLE clientes ADD COLUMN mandato_sepa_id UUID REFERENCES mandatos_sepa(id);
ALTER TABLE clientes ADD COLUMN fecha_mandato_sepa DATE;
```

### 3.6 Políticas RLS

```sql
ALTER TABLE remesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE remesas_recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandatos_sepa ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_sepa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer" ON remesas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON remesas_recibos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON mandatos_sepa
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden leer" ON configuracion_sepa
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden modificar" ON remesas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON remesas_recibos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden modificar" ON mandatos_sepa
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Solo admins pueden modificar config SEPA" ON configuracion_sepa
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );
```

---

## 4. Generación de Fichero SEPA

### 4.1 Servicio de Generación

```javascript
// src/features/remesas/services/sepaService.js
import { create } from 'xmlbuilder2';
import { supabase } from '@/lib/supabase';

export async function generarFicheroSEPA(remesaId) {
  // 1. Obtener datos de la remesa
  const { data: remesa } = await supabase
    .from('remesas')
    .select(`
      *,
      recibos:remesas_recibos(
        *,
        factura:facturas(*)
      )
    `)
    .eq('id', remesaId)
    .single();
  
  // 2. Obtener configuración SEPA
  const { data: config } = await supabase
    .from('configuracion_sepa')
    .select('*')
    .single();
  
  // 3. Generar XML
  const xml = generarXMLSepa(remesa, config);
  
  // 4. Guardar fichero
  const nombreFichero = `${remesa.referencia}.xml`;
  
  await supabase
    .from('remesas')
    .update({
      fichero_xml: xml,
      fichero_nombre: nombreFichero,
      estado: 'generada'
    })
    .eq('id', remesaId);
  
  return { xml, nombreFichero };
}

function generarXMLSepa(remesa, config) {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('Document', {
      xmlns: 'urn:iso:std:iso:20022:tech:xsd:pain.008.001.02',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance'
    })
    .ele('CstmrDrctDbtInitn');
  
  // Group Header
  const grpHdr = doc.ele('GrpHdr');
  grpHdr.ele('MsgId').txt(remesa.referencia);
  grpHdr.ele('CreDtTm').txt(new Date().toISOString());
  grpHdr.ele('NbOfTxs').txt(remesa.num_recibos.toString());
  grpHdr.ele('CtrlSum').txt(remesa.importe_total.toFixed(2));
  
  const initgPty = grpHdr.ele('InitgPty');
  initgPty.ele('Nm').txt(sanitizeSepaText(config.nombre_acreedor));
  initgPty.ele('Id').ele('OrgId').ele('Othr').ele('Id').txt(config.identificador_acreedor);
  
  // Payment Information
  const pmtInf = doc.ele('PmtInf');
  pmtInf.ele('PmtInfId').txt(`${remesa.referencia}-PMT`);
  pmtInf.ele('PmtMtd').txt('DD');
  pmtInf.ele('NbOfTxs').txt(remesa.num_recibos.toString());
  pmtInf.ele('CtrlSum').txt(remesa.importe_total.toFixed(2));
  
  const pmtTpInf = pmtInf.ele('PmtTpInf');
  pmtTpInf.ele('SvcLvl').ele('Cd').txt('SEPA');
  pmtTpInf.ele('LclInstrm').ele('Cd').txt('CORE');
  pmtTpInf.ele('SeqTp').txt('RCUR'); // Recurrente
  
  pmtInf.ele('ReqdColltnDt').txt(formatDateSepa(remesa.fecha_cobro));
  
  const cdtr = pmtInf.ele('Cdtr');
  cdtr.ele('Nm').txt(sanitizeSepaText(config.nombre_acreedor));
  
  pmtInf.ele('CdtrAcct').ele('Id').ele('IBAN').txt(config.iban_principal);
  pmtInf.ele('CdtrAgt').ele('FinInstnId').ele('BIC').txt(config.bic_principal);
  
  const cdtrSchmeId = pmtInf.ele('CdtrSchmeId').ele('Id').ele('PrvtId').ele('Othr');
  cdtrSchmeId.ele('Id').txt(config.identificador_acreedor);
  cdtrSchmeId.ele('SchmeNm').ele('Prtry').txt('SEPA');
  
  // Transacciones individuales
  for (const recibo of remesa.recibos) {
    const drctDbtTxInf = pmtInf.ele('DrctDbtTxInf');
    
    drctDbtTxInf.ele('PmtId').ele('EndToEndId').txt(recibo.referencia_recibo);
    drctDbtTxInf.ele('InstdAmt', { Ccy: 'EUR' }).txt(recibo.importe.toFixed(2));
    
    const mndtRltdInf = drctDbtTxInf.ele('DrctDbtTx').ele('MndtRltdInf');
    mndtRltdInf.ele('MndtId').txt(recibo.mandato_referencia);
    mndtRltdInf.ele('DtOfSgntr').txt(formatDateSepa(recibo.mandato_fecha_firma));
    
    if (recibo.deudor_bic) {
      drctDbtTxInf.ele('DbtrAgt').ele('FinInstnId').ele('BIC').txt(recibo.deudor_bic);
    } else {
      drctDbtTxInf.ele('DbtrAgt').ele('FinInstnId').ele('Othr').ele('Id').txt('NOTPROVIDED');
    }
    
    drctDbtTxInf.ele('Dbtr').ele('Nm').txt(sanitizeSepaText(recibo.deudor_nombre));
    drctDbtTxInf.ele('DbtrAcct').ele('Id').ele('IBAN').txt(recibo.deudor_iban);
    drctDbtTxInf.ele('RmtInf').ele('Ustrd').txt(sanitizeSepaText(recibo.concepto).substring(0, 140));
  }
  
  return doc.end({ prettyPrint: true });
}

// Sanitizar texto para SEPA (sin acentos ni caracteres especiales)
function sanitizeSepaText(text) {
  if (!text) return '';
  
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-zA-Z0-9 .,\-\/\+\(\)]/g, '') // Solo caracteres permitidos
    .substring(0, 70);
}

function formatDateSepa(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}
```

### 4.2 Creación de Remesa

```javascript
// src/features/remesas/services/remesaService.js
import { supabase } from '@/lib/supabase';

export async function crearRemesa(facturaIds, fechaCobro) {
  // 1. Obtener configuración SEPA
  const { data: config } = await supabase
    .from('configuracion_sepa')
    .select('*')
    .single();
  
  // 2. Generar referencia única
  const referencia = await generarReferenciaRemesa(config.prefijo_remesa);
  
  // 3. Obtener facturas con datos de clientes y mandatos
  const { data: facturas } = await supabase
    .from('facturas')
    .select(`
      *,
      cliente:clientes(
        *,
        mandato:mandatos_sepa(*)
      )
    `)
    .in('id', facturaIds)
    .eq('estado', 'emitida')
    .eq('metodo_pago', 'domiciliacion');
  
  // 4. Validar que todas tienen mandato SEPA válido
  const errores = [];
  const facturasValidas = [];
  
  for (const factura of facturas) {
    const mandato = factura.cliente?.mandato;
    
    if (!mandato || mandato.estado !== 'activo') {
      errores.push({
        factura: factura.numero_completo,
        error: 'Cliente sin mandato SEPA activo'
      });
      continue;
    }
    
    if (!mandato.iban) {
      errores.push({
        factura: factura.numero_completo,
        error: 'Mandato sin IBAN'
      });
      continue;
    }
    
    facturasValidas.push({ factura, mandato });
  }
  
  if (facturasValidas.length === 0) {
    throw new Error('No hay facturas válidas para incluir en la remesa');
  }
  
  // 5. Calcular totales
  const importeTotal = facturasValidas.reduce((sum, f) => sum + f.factura.total, 0);
  
  // 6. Crear remesa
  const { data: remesa, error: remesaError } = await supabase
    .from('remesas')
    .insert({
      referencia,
      descripcion: `Remesa ${fechaCobro}`,
      fecha_cobro: fechaCobro,
      num_recibos: facturasValidas.length,
      importe_total: importeTotal,
      iban_cobro: config.iban_principal,
      bic_cobro: config.bic_principal,
      estado: 'borrador'
    })
    .select()
    .single();
  
  if (remesaError) throw remesaError;
  
  // 7. Crear recibos
  const recibos = facturasValidas.map(({ factura, mandato }) => ({
    remesa_id: remesa.id,
    factura_id: factura.id,
    referencia_recibo: `FAC-${factura.numero_completo.replace('/', '-')}`,
    importe: factura.total,
    mandato_referencia: mandato.referencia,
    mandato_fecha_firma: mandato.fecha_firma,
    deudor_nombre: factura.cliente_nombre,
    deudor_iban: mandato.iban,
    deudor_bic: mandato.bic,
    concepto: `Factura ${factura.numero_completo} Gestion Energetica`
  }));
  
  await supabase.from('remesas_recibos').insert(recibos);
  
  return {
    remesa,
    incluidas: facturasValidas.length,
    errores
  };
}

async function generarReferenciaRemesa(prefijo) {
  const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
  
  // Obtener secuencia del día
  const { count } = await supabase
    .from('remesas')
    .select('*', { count: 'exact' })
    .like('referencia', `${prefijo}-${fecha}%`);
  
  const secuencia = String((count || 0) + 1).padStart(3, '0');
  
  return `${prefijo}-${fecha}-${secuencia}`;
}
```

### 4.3 Validación de IBAN

```javascript
// src/lib/validators/iban.js
export function validarIBAN(iban) {
  // Eliminar espacios y convertir a mayúsculas
  iban = iban.replace(/\s/g, '').toUpperCase();
  
  // Verificar longitud según país
  const longitudesPorPais = {
    ES: 24, DE: 22, FR: 27, IT: 27, PT: 25, GB: 22
  };
  
  const pais = iban.substring(0, 2);
  const longitudEsperada = longitudesPorPais[pais];
  
  if (!longitudEsperada) {
    return { valido: false, error: 'País no soportado' };
  }
  
  if (iban.length !== longitudEsperada) {
    return { valido: false, error: `Longitud incorrecta (esperado: ${longitudEsperada})` };
  }
  
  // Verificar caracteres
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(iban)) {
    return { valido: false, error: 'Formato inválido' };
  }
  
  // Verificar dígitos de control
  const reordenado = iban.slice(4) + iban.slice(0, 4);
  const numerico = reordenado.replace(/[A-Z]/g, c => (c.charCodeAt(0) - 55).toString());
  
  if (mod97(numerico) !== 1) {
    return { valido: false, error: 'Dígitos de control inválidos' };
  }
  
  return { valido: true };
}

function mod97(numStr) {
  let remainder = 0;
  for (let i = 0; i < numStr.length; i++) {
    remainder = (remainder * 10 + parseInt(numStr[i])) % 97;
  }
  return remainder;
}

export function obtenerBIC(iban) {
  // BICs de bancos españoles por código de entidad
  const bics = {
    '0049': 'BSCHESMMXXX', // Santander
    '2100': 'CAIXESBBXXX', // CaixaBank
    '0182': 'BBVAESMMXXX', // BBVA
    '0081': 'BSABESBBXXX', // Sabadell
    '2038': 'CAABORABBXXX', // Bankinter
    '0128': 'BKBKESMMXXX', // Bankinter
    '0075': 'POABORABXXX', // Popular
    // Añadir más según necesidad
  };
  
  const codigoEntidad = iban.substring(4, 8);
  return bics[codigoEntidad] || null;
}
```

---

## 5. Sistema de Reportes

### 5.1 Tipos de Reportes

| Categoría | Reporte | Descripción |
|-----------|---------|-------------|
| **Consumos** | Por vivienda | Histórico de consumos de una vivienda |
| | Por comunidad | Consumos agregados de toda la comunidad |
| | Comparativo mensual | Comparación mes a mes |
| | Comparativo anual | Comparación año a año |
| **Facturación** | Facturas emitidas | Listado de facturas del periodo |
| | Facturación por comunidad | Totales facturados por comunidad |
| | Estado de cobro | Facturas pendientes vs cobradas |
| | Morosidad | Clientes con facturas impagadas |
| **Operativo** | Lecturas importadas | Historial de importaciones |
| | Envíos de email | Estadísticas de envío |
| | Remesas bancarias | Histórico de remesas |

### 5.2 Estructura de Datos para Reportes

```sql
-- Vista para reporte de consumos por vivienda
CREATE VIEW v_reporte_consumos_vivienda AS
SELECT 
  l.id AS lectura_id,
  l.fecha_lectura,
  l.consumo,
  c.nombre AS concepto,
  c.unidad_medida,
  cont.numero_serie AS contador,
  u.nombre AS ubicacion,
  a.nombre AS agrupacion,
  com.nombre AS comunidad,
  com.id AS comunidad_id,
  cli.nombre || ' ' || cli.apellidos AS cliente,
  f.numero_completo AS factura,
  f.total AS importe_facturado
FROM lecturas l
JOIN conceptos c ON l.concepto_id = c.id
JOIN contadores cont ON l.contador_id = cont.id
JOIN ubicaciones u ON cont.ubicacion_id = u.id
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades com ON a.comunidad_id = com.id
LEFT JOIN clientes cli ON l.cliente_id = cli.id
LEFT JOIN facturas f ON l.factura_id = f.id;

-- Vista para reporte de facturación por comunidad
CREATE VIEW v_reporte_facturacion_comunidad AS
SELECT 
  com.id AS comunidad_id,
  com.nombre AS comunidad,
  DATE_TRUNC('month', f.fecha_factura) AS mes,
  COUNT(*) AS num_facturas,
  SUM(f.base_imponible) AS base_imponible,
  SUM(f.importe_iva) AS iva,
  SUM(f.total) AS total,
  SUM(CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END) AS cobrado,
  SUM(CASE WHEN f.estado = 'emitida' THEN f.total ELSE 0 END) AS pendiente
FROM facturas f
JOIN comunidades com ON f.comunidad_id = com.id
WHERE f.estado IN ('emitida', 'pagada')
GROUP BY com.id, com.nombre, DATE_TRUNC('month', f.fecha_factura);

-- Vista para reporte de morosidad
CREATE VIEW v_reporte_morosidad AS
SELECT 
  cli.id AS cliente_id,
  cli.nombre || ' ' || cli.apellidos AS cliente,
  cli.nif,
  cli.email,
  cli.telefono,
  com.nombre AS comunidad,
  COUNT(*) AS num_facturas_pendientes,
  SUM(f.total) AS importe_pendiente,
  MIN(f.fecha_vencimiento) AS vencimiento_mas_antiguo,
  CURRENT_DATE - MIN(f.fecha_vencimiento) AS dias_mora_max
FROM facturas f
JOIN clientes cli ON f.cliente_id = cli.id
JOIN comunidades com ON f.comunidad_id = com.id
WHERE f.estado = 'emitida'
  AND f.fecha_vencimiento < CURRENT_DATE
GROUP BY cli.id, cli.nombre, cli.apellidos, cli.nif, cli.email, cli.telefono, com.nombre
ORDER BY importe_pendiente DESC;
```

### 5.3 Servicio de Generación de Reportes

```javascript
// src/features/reportes/services/reporteService.js
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export async function generarReporteConsumos(params) {
  const { comunidadId, fechaInicio, fechaFin, formato } = params;
  
  // Obtener datos
  let query = supabase
    .from('v_reporte_consumos_vivienda')
    .select('*')
    .gte('fecha_lectura', fechaInicio)
    .lte('fecha_lectura', fechaFin)
    .order('fecha_lectura', { ascending: false });
  
  if (comunidadId) {
    query = query.eq('comunidad_id', comunidadId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Generar en el formato solicitado
  switch (formato) {
    case 'excel':
      return generarExcel(data, 'Reporte_Consumos');
    case 'csv':
      return generarCSV(data);
    case 'pdf':
      return generarPDFReporte(data, 'Reporte de Consumos', params);
    default:
      return data;
  }
}

export async function generarReporteFacturacion(params) {
  const { comunidadId, fechaInicio, fechaFin, estado, formato } = params;
  
  let query = supabase
    .from('facturas')
    .select(`
      numero_completo,
      fecha_factura,
      cliente_nombre,
      cliente_nif,
      base_imponible,
      importe_iva,
      total,
      estado,
      fecha_pago,
      comunidad:comunidades(nombre)
    `)
    .gte('fecha_factura', fechaInicio)
    .lte('fecha_factura', fechaFin)
    .order('fecha_factura', { ascending: false });
  
  if (comunidadId) {
    query = query.eq('comunidad_id', comunidadId);
  }
  
  if (estado) {
    query = query.eq('estado', estado);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  // Calcular totales
  const totales = {
    numFacturas: data.length,
    baseImponible: data.reduce((sum, f) => sum + f.base_imponible, 0),
    iva: data.reduce((sum, f) => sum + f.importe_iva, 0),
    total: data.reduce((sum, f) => sum + f.total, 0)
  };
  
  switch (formato) {
    case 'excel':
      return generarExcelFacturacion(data, totales);
    case 'csv':
      return generarCSV(data);
    case 'pdf':
      return generarPDFFacturacion(data, totales, params);
    default:
      return { data, totales };
  }
}

export async function generarReporteMorosidad(params) {
  const { comunidadId, formato } = params;
  
  let query = supabase
    .from('v_reporte_morosidad')
    .select('*');
  
  if (comunidadId) {
    query = query.eq('comunidad_id', comunidadId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  switch (formato) {
    case 'excel':
      return generarExcel(data, 'Reporte_Morosidad');
    case 'pdf':
      return generarPDFMorosidad(data, params);
    default:
      return data;
  }
}

// Generador de Excel
function generarExcel(data, nombreHoja) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
}

// Generador de CSV
function generarCSV(data) {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0]).join(';');
  const rows = data.map(row => 
    Object.values(row).map(v => `"${v || ''}"`).join(';')
  );
  
  return [headers, ...rows].join('\n');
}

// Generador de PDF con jsPDF
function generarPDFReporte(data, titulo, params) {
  const doc = new jsPDF();
  
  // Cabecera
  doc.setFontSize(18);
  doc.text(titulo, 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Periodo: ${params.fechaInicio} - ${params.fechaFin}`, 14, 30);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-ES')}`, 14, 36);
  
  // Tabla
  doc.autoTable({
    startY: 45,
    head: [Object.keys(data[0] || {})],
    body: data.map(row => Object.values(row)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [27, 79, 114] }
  });
  
  return doc.output('arraybuffer');
}
```

### 5.4 Dashboard de Métricas

```javascript
// src/features/reportes/services/dashboardService.js
import { supabase } from '@/lib/supabase';

export async function obtenerMetricasDashboard(periodo) {
  const { fechaInicio, fechaFin } = calcularRangoFechas(periodo);
  
  // Métricas de facturación
  const { data: facturacion } = await supabase
    .rpc('get_metricas_facturacion', {
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin
    });
  
  // Métricas de consumo
  const { data: consumos } = await supabase
    .rpc('get_metricas_consumo', {
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin
    });
  
  // Métricas de cobro
  const { data: cobros } = await supabase
    .rpc('get_metricas_cobro', {
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin
    });
  
  // Top comunidades
  const { data: topComunidades } = await supabase
    .from('v_reporte_facturacion_comunidad')
    .select('*')
    .gte('mes', fechaInicio)
    .lte('mes', fechaFin)
    .order('total', { ascending: false })
    .limit(5);
  
  return {
    facturacion,
    consumos,
    cobros,
    topComunidades,
    periodo: { fechaInicio, fechaFin }
  };
}

// Funciones SQL para métricas
/*
CREATE OR REPLACE FUNCTION get_metricas_facturacion(
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS JSON AS $$
DECLARE
  resultado JSON;
BEGIN
  SELECT json_build_object(
    'total_facturado', COALESCE(SUM(total), 0),
    'num_facturas', COUNT(*),
    'ticket_medio', COALESCE(AVG(total), 0),
    'base_imponible', COALESCE(SUM(base_imponible), 0),
    'iva', COALESCE(SUM(importe_iva), 0)
  ) INTO resultado
  FROM facturas
  WHERE fecha_factura BETWEEN p_fecha_inicio AND p_fecha_fin
    AND estado IN ('emitida', 'pagada');
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_metricas_cobro(
  p_fecha_inicio DATE,
  p_fecha_fin DATE
)
RETURNS JSON AS $$
DECLARE
  resultado JSON;
BEGIN
  SELECT json_build_object(
    'total_cobrado', COALESCE(SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END), 0),
    'total_pendiente', COALESCE(SUM(CASE WHEN estado = 'emitida' THEN total ELSE 0 END), 0),
    'num_cobradas', COUNT(*) FILTER (WHERE estado = 'pagada'),
    'num_pendientes', COUNT(*) FILTER (WHERE estado = 'emitida'),
    'tasa_cobro', ROUND(
      COUNT(*) FILTER (WHERE estado = 'pagada')::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100, 
      2
    )
  ) INTO resultado
  FROM facturas
  WHERE fecha_factura BETWEEN p_fecha_inicio AND p_fecha_fin;
  
  RETURN resultado;
END;
$$ LANGUAGE plpgsql;
*/
```

---

## 6. Interfaces de Usuario

### 6.1 Pantalla: Crear Remesa

**Ruta:** `/remesas/crear`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏦 Crear Remesa Bancaria                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PASO 1: Configuración                                                  │
│  ─────────────────────                                                  │
│                                                                         │
│  Fecha de cobro:     [15/12/2025      📅]                              │
│  Descripción:        [Remesa Diciembre 2025                    ]       │
│                                                                         │
│  Cuenta de cobro:    ES12 3456 7890 1234 5678 9012 (Santander)        │
│                                                                         │
│                                      [Buscar facturas pendientes →]    │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PASO 2: Selección de Facturas                                         │
│  ─────────────────────────────                                         │
│                                                                         │
│  Facturas con domiciliación pendientes de cobro: 45                    │
│                                                                         │
│  Filtrar: [Todas las comunidades ▼] [Noviembre 2025 ▼]                 │
│                                                                         │
│  ☑️ Seleccionar todas con mandato válido (42)                          │
│                                                                         │
│  ┌────┬──────────────┬──────────────┬──────────────┬─────────┬───────┐ │
│  │ ☑️ │ Factura      │ Cliente      │ IBAN         │ Importe │ Valid.│ │
│  ├────┼──────────────┼──────────────┼──────────────┼─────────┼───────┤ │
│  │ ☑️ │ 2/230371950  │ Oscar Zurro  │ ES98...7891  │  18.30 €│ ✅    │ │
│  │ ☑️ │ 2/230371949  │ María López  │ ES21...4523  │  25.45 €│ ✅    │ │
│  │ ☐ │ 2/230371948  │ Juan García  │ ⚠️ Sin IBAN  │  32.10 €│ ❌    │ │
│  │ ☑️ │ 2/230371947  │ Ana Martín   │ ES76...8901  │  15.60 €│ ✅    │ │
│  │ ...│ ...          │ ...          │ ...          │ ...     │ ...   │ │
│  └────┴──────────────┴──────────────┴──────────────┴─────────┴───────┘ │
│                                                                         │
│  ⚠️ 3 facturas excluidas por falta de mandato SEPA o IBAN             │
│                                                                         │
│  RESUMEN DE REMESA                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Recibos a incluir: 42          Importe total: 1,245.80 €       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│              [Cancelar]                [Crear remesa en borrador →]    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Pantalla: Detalle de Remesa

**Ruta:** `/remesas/:id`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ← Volver                                                               │
│                                                                         │
│  REMESA A360-REM-20251126-001                        Estado: 📄 Generada│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │
│  │ DATOS DE LA REMESA          │  │ CUENTA DE COBRO                 │  │
│  │ ─────────────────           │  │ ───────────────                 │  │
│  │ Referencia: A360-REM-...001 │  │ IBAN: ES12 3456 7890 1234...   │  │
│  │ Fecha creación: 26/11/2025  │  │ BIC: BSCHESMMXXX                │  │
│  │ Fecha cobro: 15/12/2025     │  │ Banco: Santander                │  │
│  │ Descripción: Remesa Dic 2025│  │                                 │  │
│  └─────────────────────────────┘  └─────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │         42                    1,245.80 €                        │   │
│  │      Recibos                 Importe Total                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  RECIBOS INCLUIDOS                                                      │
│  ─────────────────                                                      │
│  ┌──────────────┬──────────────┬────────────────┬─────────┬─────────┐  │
│  │ Factura      │ Cliente      │ IBAN           │ Importe │ Estado  │  │
│  ├──────────────┼──────────────┼────────────────┼─────────┼─────────┤  │
│  │ 2/230371950  │ Oscar Zurro  │ ES98...7891    │  18.30 €│ Incluido│  │
│  │ 2/230371949  │ María López  │ ES21...4523    │  25.45 €│ Incluido│  │
│  │ 2/230371947  │ Ana Martín   │ ES76...8901    │  15.60 €│ Incluido│  │
│  │ ...          │ ...          │ ...            │ ...     │ ...     │  │
│  └──────────────┴──────────────┴────────────────┴─────────┴─────────┘  │
│                                                                         │
│  ACCIONES                                                               │
│  [📥 Descargar XML]  [✅ Marcar como enviada]  [🗑️ Eliminar remesa]    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Pantalla: Lista de Remesas

**Ruta:** `/remesas`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏦 Remesas Bancarias                                  [+ Nueva Remesa] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Filtrar: [Todos los estados ▼] [2025 ▼]                               │
│                                                                         │
│  ┌────────────────────┬────────────┬────────────┬──────────┬──────────┐│
│  │ Referencia         │ Fecha Cobro│ Recibos    │ Importe  │ Estado   ││
│  ├────────────────────┼────────────┼────────────┼──────────┼──────────┤│
│  │ A360-REM-20251126  │ 15/12/2025 │ 42         │ 1,245.80€│ 📄 Gener.││
│  │ A360-REM-20251101  │ 15/11/2025 │ 38         │ 1,102.50€│ ✅ Compl.││
│  │ A360-REM-20251015  │ 01/11/2025 │ 41         │ 1,189.20€│ ⚠️ Parc. ││
│  │ A360-REM-20251001  │ 15/10/2025 │ 40         │ 1,156.80€│ ✅ Compl.││
│  │ ...                │ ...        │ ...        │ ...      │ ...      ││
│  └────────────────────┴────────────┴────────────┴──────────┴──────────┘│
│                                                                         │
│  Estados: 📝 Borrador  📄 Generada  📤 Enviada  ✅ Completada  ⚠️ Parcial│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.4 Pantalla: Dashboard de Reportes

**Ruta:** `/reportes`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📊 Dashboard de Reportes                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Periodo: [Noviembre 2025 ▼]              [🔄 Actualizar]              │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐   │
│  │  € 45,230    │ │     156      │ │   € 290.58   │ │    92.3%     │   │
│  │  Facturado   │ │   Facturas   │ │ Ticket Medio │ │ Tasa Cobro   │   │
│  │   +12% ▲     │ │    +8% ▲     │ │   +5% ▲      │ │   -2% ▼      │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────┐ ┌─────────────────────────────────┐│
│  │ FACTURACIÓN POR COMUNIDAD      │ │ EVOLUCIÓN MENSUAL               ││
│  │ ───────────────────────        │ │ ─────────────────               ││
│  │                                │ │                                 ││
│  │  Troya 40      ████████ 12,450€│ │  [Gráfico de líneas            ││
│  │  Hermes 12     ██████   9,230€ │ │   mostrando facturación        ││
│  │  Apolo 8       █████    7,890€ │ │   de los últimos 12 meses]     ││
│  │  Zeus 15       ████     6,540€ │ │                                 ││
│  │  Atenea 3      ███      5,120€ │ │                                 ││
│  │                                │ │                                 ││
│  └─────────────────────────────────┘ └─────────────────────────────────┘│
│                                                                         │
│  REPORTES DISPONIBLES                                                   │
│  ────────────────────                                                   │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐│
│  │ 📈 Consumos         │ │ 🧾 Facturación      │ │ ⚠️ Morosidad        ││
│  │                     │ │                     │ │                     ││
│  │ Por vivienda        │ │ Facturas emitidas   │ │ Clientes morosos    ││
│  │ Por comunidad       │ │ Por comunidad       │ │ Facturas vencidas   ││
│  │ Comparativo         │ │ Estado de cobro     │ │ Antigüedad deuda    ││
│  │                     │ │                     │ │                     ││
│  │ [Generar →]         │ │ [Generar →]         │ │ [Generar →]         ││
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.5 Pantalla: Generador de Reportes

**Ruta:** `/reportes/generar`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  📈 Generar Reporte                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  TIPO DE REPORTE                                                        │
│  ───────────────                                                        │
│  ○ Consumos por vivienda                                               │
│  ○ Consumos por comunidad                                              │
│  ○ Comparativo de consumos                                             │
│  ● Facturas emitidas                                                   │
│  ○ Facturación por comunidad                                           │
│  ○ Estado de cobro                                                     │
│  ○ Morosidad                                                           │
│                                                                         │
│  FILTROS                                                                │
│  ───────                                                                │
│  Comunidad:      [Todas las comunidades              ▼]                │
│  Periodo:        Desde [01/11/2025] Hasta [30/11/2025]                 │
│  Estado:         [Todos ▼]                                             │
│                                                                         │
│  FORMATO DE SALIDA                                                      │
│  ─────────────────                                                      │
│  ○ Vista en pantalla                                                   │
│  ● Excel (.xlsx)                                                       │
│  ○ CSV                                                                 │
│  ○ PDF                                                                 │
│                                                                         │
│                           [Cancelar]    [📊 Generar reporte →]         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 6.6 Pantalla: Configuración SEPA

**Ruta:** `/configuracion/sepa`

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏦 Configuración SEPA                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  DATOS DEL ACREEDOR                                                     │
│  ──────────────────                                                     │
│  Nombre:                [A360 SERVICIOS ENERGETICOS SL        ]        │
│  CIF:                   [B88313473                            ]        │
│  Identificador SEPA:    [ES12000B88313473                     ]        │
│                                                                         │
│  CUENTA DE COBRO PRINCIPAL                                              │
│  ─────────────────────────                                              │
│  IBAN:                  [ES12 3456 7890 1234 5678 9012        ]        │
│  BIC:                   [BSCHESMMXXX                          ]        │
│  Nombre del banco:      [Banco Santander                      ]        │
│                                                                         │
│  CONFIGURACIÓN DE REMESAS                                               │
│  ────────────────────────                                               │
│  Prefijo remesas:       [A360-REM   ]                                  │
│  Prefijo mandatos:      [A360-CLI   ]                                  │
│  Días antelación cobro: [5          ] días                             │
│                                                                         │
│  CÓDIGOS DE RECHAZO                                                     │
│  ──────────────────                                                     │
│  [📋 Ver tabla de códigos de rechazo SEPA]                             │
│                                                                         │
│                           [Cancelar]    [💾 Guardar configuración]      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Exportación para ERP

### 7.1 Formatos de Exportación

Para facilitar la futura integración con Microsoft Dynamics 365 u otro ERP, el sistema debe poder exportar datos en formatos estándar.

```javascript
// src/features/reportes/services/exportService.js

// Exportar clientes para ERP
export async function exportarClientesERP() {
  const { data } = await supabase
    .from('clientes')
    .select(`
      codigo_cliente,
      nif,
      nombre,
      apellidos,
      email,
      telefono,
      direccion_correspondencia,
      cp_correspondencia,
      ciudad_correspondencia,
      provincia_correspondencia,
      iban,
      tipo,
      activo
    `)
    .order('codigo_cliente');
  
  return transformarParaERP(data, 'clientes');
}

// Exportar facturas para ERP
export async function exportarFacturasERP(fechaInicio, fechaFin) {
  const { data } = await supabase
    .from('facturas')
    .select(`
      numero_completo,
      fecha_factura,
      fecha_vencimiento,
      cliente_nif,
      cliente_nombre,
      base_imponible,
      porcentaje_iva,
      importe_iva,
      total,
      estado,
      fecha_pago,
      metodo_pago
    `)
    .gte('fecha_factura', fechaInicio)
    .lte('fecha_factura', fechaFin)
    .in('estado', ['emitida', 'pagada'])
    .order('numero_completo');
  
  return transformarParaERP(data, 'facturas');
}

// Formato estándar para ERP
function transformarParaERP(data, tipo) {
  return {
    metadata: {
      tipo,
      fecha_exportacion: new Date().toISOString(),
      sistema_origen: 'A360_FACTURACION',
      version: '1.0',
      num_registros: data.length
    },
    registros: data
  };
}
```

### 7.2 API REST para Integración

```javascript
// api/export/clientes.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Verificar API key
  const apiKey = req.headers['x-api-key'];
  if (!validarApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  try {
    const data = await exportarClientesERP();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// api/export/facturas.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const apiKey = req.headers['x-api-key'];
  if (!validarApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  
  const { desde, hasta } = req.query;
  
  if (!desde || !hasta) {
    return res.status(400).json({ 
      error: 'Parámetros desde y hasta son requeridos' 
    });
  }
  
  try {
    const data = await exportarFacturasERP(desde, hasta);
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## 8. Componentes

### 8.1 Componentes de Remesas

| Componente | Descripción |
|------------|-------------|
| `CrearRemesaWizard` | Wizard de creación de remesa |
| `FacturasRemesaTable` | Tabla de facturas para incluir |
| `RemesaResumen` | Resumen de totales |
| `RemesaDetalle` | Vista detalle de remesa |
| `RecibosTable` | Tabla de recibos de una remesa |
| `RemesasTable` | Lista de remesas |
| `EstadoRemesaBadge` | Badge de estado |

### 8.2 Componentes de Reportes

| Componente | Descripción |
|------------|-------------|
| `DashboardMetricas` | Tarjetas de métricas |
| `GraficoFacturacion` | Gráfico de evolución |
| `GraficoComunidades` | Gráfico de barras por comunidad |
| `ReporteSelector` | Selector de tipo de reporte |
| `ReporteFiltros` | Filtros de reporte |
| `ReporteResultados` | Tabla de resultados |
| `ExportButtons` | Botones de exportación |

### 8.3 Componentes de Mandatos

| Componente | Descripción |
|------------|-------------|
| `MandatoForm` | Formulario de mandato SEPA |
| `MandatosList` | Lista de mandatos de un cliente |
| `IBANInput` | Input con validación de IBAN |

---

## 9. Hooks Personalizados

```javascript
// Remesas
useRemesas(filtros)                    // Lista de remesas
useRemesa(id)                          // Detalle de remesa
useCrearRemesa()                       // Crear remesa
useGenerarXML()                        // Generar fichero SEPA
useDescargarXML()                      // Descargar fichero
useActualizarEstadoRemesa()            // Cambiar estado
useFacturasParaRemesa(filtros)         // Facturas pendientes

// Mandatos
useMandatos(clienteId)                 // Mandatos de un cliente
useMandato(id)                         // Detalle de mandato
useCrearMandato()                      // Crear mandato
useActualizarMandato()                 // Actualizar mandato
useCancelarMandato()                   // Cancelar mandato

// Reportes
useDashboardMetricas(periodo)          // Métricas del dashboard
useReporteConsumos(params)             // Reporte de consumos
useReporteFacturacion(params)          // Reporte de facturación
useReporteMorosidad(params)            // Reporte de morosidad
useExportarReporte()                   // Exportar a Excel/CSV/PDF

// Configuración
useConfiguracionSEPA()                 // Config SEPA
useUpdateConfiguracionSEPA()           // Actualizar config
```

---

## 10. Tareas de Implementación

### 10.1 Base de Datos

- [ ] Crear archivo `supabase/migrations/006_remesas_schema.sql`
- [ ] Crear tipos ENUM (estado_remesa, estado_recibo, estado_mandato)
- [ ] Crear tabla `remesas`
- [ ] Crear tabla `remesas_recibos`
- [ ] Crear tabla `mandatos_sepa`
- [ ] Crear tabla `configuracion_sepa`
- [ ] Añadir campos a tabla `clientes`
- [ ] Crear vistas para reportes
- [ ] Crear funciones de métricas
- [ ] Insertar configuración inicial
- [ ] Crear políticas RLS

### 10.2 Dependencias

```bash
npm install xmlbuilder2 jspdf jspdf-autotable
```

- [ ] Instalar `xmlbuilder2` - Generación de XML
- [ ] Instalar `jspdf` - Generación de PDF
- [ ] Instalar `jspdf-autotable` - Tablas en PDF

### 10.3 Estructura de Carpetas

- [ ] Crear `src/features/remesas/`
- [ ] Crear `src/features/remesas/components/`
- [ ] Crear `src/features/remesas/hooks/`
- [ ] Crear `src/features/remesas/services/`
- [ ] Crear `src/features/reportes/`
- [ ] Crear `src/features/reportes/components/`
- [ ] Crear `src/features/reportes/hooks/`
- [ ] Crear `src/features/reportes/services/`
- [ ] Crear `api/export/` para endpoints de exportación

### 10.4 Servicios de Remesas

- [ ] Implementar `sepaService.js` - Generación XML SEPA
- [ ] Implementar `remesaService.js` - Gestión de remesas
- [ ] Implementar validador de IBAN
- [ ] Implementar obtención de BIC

### 10.5 Servicios de Reportes

- [ ] Implementar `reporteService.js`
- [ ] Implementar `dashboardService.js`
- [ ] Implementar generador de Excel
- [ ] Implementar generador de CSV
- [ ] Implementar generador de PDF

### 10.6 Hooks de Remesas

- [ ] Implementar `useRemesas`
- [ ] Implementar `useRemesa`
- [ ] Implementar `useCrearRemesa`
- [ ] Implementar `useGenerarXML`
- [ ] Implementar `useMandatos`
- [ ] Implementar `useCrearMandato`
- [ ] Implementar `useConfiguracionSEPA`

### 10.7 Hooks de Reportes

- [ ] Implementar `useDashboardMetricas`
- [ ] Implementar `useReporteConsumos`
- [ ] Implementar `useReporteFacturacion`
- [ ] Implementar `useReporteMorosidad`
- [ ] Implementar `useExportarReporte`

### 10.8 Componentes de Remesas

- [ ] Implementar `CrearRemesaWizard`
- [ ] Implementar `FacturasRemesaTable`
- [ ] Implementar `RemesaResumen`
- [ ] Implementar `RemesaDetalle`
- [ ] Implementar `RecibosTable`
- [ ] Implementar `RemesasTable`
- [ ] Crear página `CrearRemesaPage`
- [ ] Crear página `RemesaDetailPage`
- [ ] Crear página `RemesasListPage`

### 10.9 Componentes de Reportes

- [ ] Implementar `DashboardMetricas`
- [ ] Implementar `GraficoFacturacion`
- [ ] Implementar `GraficoComunidades`
- [ ] Implementar `ReporteSelector`
- [ ] Implementar `ReporteFiltros`
- [ ] Implementar `ReporteResultados`
- [ ] Implementar `ExportButtons`
- [ ] Crear página `DashboardReportesPage`
- [ ] Crear página `GenerarReportePage`

### 10.10 Componentes de Mandatos

- [ ] Implementar `MandatoForm`
- [ ] Implementar `MandatosList`
- [ ] Implementar `IBANInput`
- [ ] Añadir sección mandatos a ClienteDetailPage

### 10.11 Configuración

- [ ] Crear página `ConfiguracionSEPAPage`
- [ ] Implementar formulario de configuración

### 10.12 API de Exportación

- [ ] Crear endpoint `api/export/clientes.js`
- [ ] Crear endpoint `api/export/facturas.js`
- [ ] Implementar validación de API key
- [ ] Documentar API

### 10.13 Navegación

- [ ] Añadir sección "Remesas" al menú
- [ ] Añadir sección "Reportes" al menú
- [ ] Añadir configuración SEPA
- [ ] Añadir rutas a React Router

### 10.14 Testing

- [ ] Probar generación de XML SEPA
- [ ] Validar XML contra esquema XSD
- [ ] Probar creación de remesa
- [ ] Probar descarga de fichero
- [ ] Probar reportes de consumos
- [ ] Probar reportes de facturación
- [ ] Probar exportación Excel/CSV/PDF
- [ ] Probar dashboard de métricas
- [ ] Probar API de exportación

### 10.15 Documentación

- [ ] Crear `docs/PRD/fase-5.md`
- [ ] Documentar formato SEPA
- [ ] Documentar API de exportación
- [ ] Crear guía de usuario para remesas
- [ ] Merge de `phase/5` a `develop`
- [ ] Merge final de `develop` a `main`

---

## 11. Criterios de Aceptación

| # | Criterio | Verificación |
|---|----------|--------------|
| 1 | **Crear remesa** | Se puede crear una remesa seleccionando facturas |
| 2 | **Validación mandatos** | Solo se incluyen facturas con mandato SEPA válido |
| 3 | **Generar XML** | El fichero XML cumple formato pain.008.001.02 |
| 4 | **Descargar fichero** | Se puede descargar el XML generado |
| 5 | **Estados de remesa** | Los estados se gestionan correctamente |
| 6 | **Dashboard métricas** | Las métricas se calculan correctamente |
| 7 | **Reporte consumos** | Se genera correctamente con filtros |
| 8 | **Reporte facturación** | Se genera correctamente con filtros |
| 9 | **Reporte morosidad** | Identifica clientes con facturas vencidas |
| 10 | **Exportar Excel** | Los reportes se exportan a Excel |
| 11 | **Exportar CSV** | Los reportes se exportan a CSV |
| 12 | **Exportar PDF** | Los reportes se exportan a PDF |
| 13 | **API exportación** | Los endpoints devuelven datos correctos |
| 14 | **Mandatos SEPA** | Se pueden gestionar mandatos por cliente |

---

## 12. Cierre del Proyecto

### 12.1 Checklist Final

Con la finalización de la Fase 5, el sistema queda completo. Verificar:

- [ ] Todas las funcionalidades implementadas según PRDs
- [ ] Tests realizados en todas las fases
- [ ] Documentación completa en `/docs`
- [ ] Variables de entorno documentadas
- [ ] Código en rama `main` estable
- [ ] Deploy en producción en Vercel
- [ ] Base de datos en producción en Supabase
- [ ] Dominio `factu.a360se.com` configurado

### 12.2 Entrega de Documentación

- [ ] Manual de usuario
- [ ] Documentación técnica
- [ ] Guía de administración
- [ ] Procedimiento de backup
- [ ] Plan de contingencia

### 12.3 Formación

- [ ] Sesión de formación a usuarios
- [ ] Documentación de procesos habituales
- [ ] FAQ de problemas comunes

---

## 13. Notas para Agentes de IA

### Orden de Implementación Recomendado

1. **Primero:** Migraciones de base de datos
2. **Segundo:** Servicios de generación SEPA
3. **Tercero:** Gestión de mandatos
4. **Cuarto:** Creación y gestión de remesas
5. **Quinto:** Dashboard y métricas
6. **Sexto:** Sistema de reportes
7. **Séptimo:** Exportación y API

### Validación de XML SEPA

```javascript
// El XML generado debe validarse contra el esquema XSD oficial
// Esquema: pain.008.001.02.xsd
// Disponible en: https://www.iso20022.org/

// Puntos críticos a validar:
// 1. MsgId único por fichero
// 2. NbOfTxs coincide con número real de transacciones
// 3. CtrlSum coincide con suma de importes
// 4. Todos los IBAN son válidos
// 5. Fechas en formato ISO (YYYY-MM-DD)
// 6. Textos sin caracteres especiales
```

### Caracteres Permitidos en SEPA

```javascript
// Caracteres permitidos en campos de texto SEPA:
const SEPA_CHARS = /^[a-zA-Z0-9 .,\-\/\+\(\)\?:'\n]*$/;

// Función de sanitización
function sanitizeSepa(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/ñ/g, 'n')
    .replace(/Ñ/g, 'N')
    .replace(/[^a-zA-Z0-9 .,\-\/\+\(\)\?:']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
```

### Códigos de Rechazo SEPA Comunes

| Código | Descripción |
|--------|-------------|
| AC01 | Cuenta incorrecta |
| AC04 | Cuenta cerrada |
| AC06 | Cuenta bloqueada |
| AG01 | Transacción no permitida |
| AM04 | Fondos insuficientes |
| BE04 | Dirección del acreedor incorrecta |
| MD01 | Sin mandato válido |
| MD02 | Datos del mandato incorrectos |
| MS02 | Rechazo por el deudor |
| MS03 | Razón no especificada |
| SL01 | Servicio no disponible |

---

*Fin del PRD Fase 5*

---

# 🎉 Proyecto Completado

Con la finalización de esta Fase 5, el Sistema de Facturación de Gestión Energética A360 queda completamente desarrollado, cubriendo todo el ciclo de facturación:

1. ✅ **Fase 0:** Configuración del proyecto
2. ✅ **Fase 1:** Modelo de datos y entidades maestras
3. ✅ **Fase 2:** Importación y validación de lecturas
4. ✅ **Fase 3:** Motor de facturación y PDFs
5. ✅ **Fase 4:** Envío de facturas y almacenamiento
6. ✅ **Fase 5:** Remesas bancarias y reportes
