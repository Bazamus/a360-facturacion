import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// =====================================================
// QUERIES - REMESAS
// =====================================================

/**
 * Hook para obtener lista de remesas
 */
export function useRemesas(filtros = {}) {
  const { estado, año } = filtros

  return useQuery({
    queryKey: ['remesas', estado, año],
    queryFn: async () => {
      let query = supabase
        .from('remesas')
        .select('*')
        .order('fecha_creacion', { ascending: false })

      if (estado) {
        query = query.eq('estado', estado)
      }

      if (año) {
        query = query.gte('fecha_creacion', `${año}-01-01`)
               .lte('fecha_creacion', `${año}-12-31`)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    }
  })
}

/**
 * Hook para obtener detalle de una remesa
 */
export function useRemesa(remesaId) {
  return useQuery({
    queryKey: ['remesa', remesaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('remesas')
        .select(`
          *,
          recibos:remesas_recibos(
            *,
            factura:facturas(numero_completo, total, cliente_nombre)
          )
        `)
        .eq('id', remesaId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!remesaId
  })
}

/**
 * Hook para obtener facturas pendientes de remesa
 */
export function useFacturasParaRemesa(filtros = {}) {
  const { comunidadId, fechaInicio, fechaFin } = filtros

  return useQuery({
    queryKey: ['facturas-para-remesa', comunidadId, fechaInicio, fechaFin],
    queryFn: async () => {
      let query = supabase
        .from('v_facturas_pendientes_remesa')
        .select('*')
        .order('fecha_factura', { ascending: false })

      if (comunidadId) {
        // Filtrar por comunidad obteniendo primero las facturas de esa comunidad
        const { data: facturas } = await supabase
          .from('facturas')
          .select('id')
          .eq('comunidad_id', comunidadId)
        
        const facturaIds = facturas?.map(f => f.id) || []
        query = query.in('id', facturaIds.length > 0 ? facturaIds : ['00000000-0000-0000-0000-000000000000'])
      }

      if (fechaInicio) {
        query = query.gte('fecha_factura', fechaInicio)
      }

      if (fechaFin) {
        query = query.lte('fecha_factura', fechaFin)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    }
  })
}

/**
 * Hook para obtener configuración SEPA
 */
export function useConfiguracionSEPA() {
  return useQuery({
    queryKey: ['configuracion-sepa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('configuracion_sepa')
        .select('*')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    }
  })
}

// =====================================================
// QUERIES - MANDATOS
// =====================================================

/**
 * Hook para obtener mandatos de un cliente
 */
export function useMandatos(clienteId) {
  return useQuery({
    queryKey: ['mandatos', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mandatos_sepa')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('fecha_firma', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!clienteId
  })
}

/**
 * Hook para obtener mandato activo de un cliente
 */
export function useMandatoActivo(clienteId) {
  return useQuery({
    queryKey: ['mandato-activo', clienteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mandatos_sepa')
        .select('*')
        .eq('cliente_id', clienteId)
        .eq('estado', 'activo')
        .order('fecha_firma', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!clienteId
  })
}

// =====================================================
// MUTATIONS - REMESAS
// =====================================================

/**
 * Hook para crear una remesa
 */
export function useCrearRemesa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ facturaIds, fechaCobro, descripcion }) => {
      // 1. Obtener configuración SEPA
      const { data: config } = await supabase
        .from('configuracion_sepa')
        .select('*')
        .single()

      if (!config) throw new Error('Configuración SEPA no encontrada')

      // 2. Generar referencia
      const { data: referencia } = await supabase
        .rpc('generar_referencia_remesa', { p_prefijo: config.prefijo_remesa })

      // 3. Obtener facturas con mandatos
      const { data: facturas, error: facturasError } = await supabase
        .from('v_facturas_pendientes_remesa')
        .select('*')
        .in('id', facturaIds)
        .eq('estado_remesa', 'valido')

      if (facturasError) throw facturasError

      if (!facturas || facturas.length === 0) {
        throw new Error('No hay facturas válidas para incluir en la remesa')
      }

      // 4. Calcular totales
      const importeTotal = facturas.reduce((sum, f) => sum + parseFloat(f.total), 0)

      // 5. Crear remesa
      const { data: remesa, error: remesaError } = await supabase
        .from('remesas')
        .insert({
          referencia,
          descripcion: descripcion || `Remesa ${new Date(fechaCobro).toLocaleDateString('es-ES')}`,
          fecha_cobro: fechaCobro,
          num_recibos: facturas.length,
          importe_total: importeTotal,
          iban_cobro: config.iban_principal,
          bic_cobro: config.bic_principal,
          estado: 'borrador'
        })
        .select()
        .single()

      if (remesaError) throw remesaError

      // 6. Crear recibos
      const recibos = facturas.map(f => ({
        remesa_id: remesa.id,
        factura_id: f.id,
        referencia_recibo: `FAC-${f.numero_completo.replace('/', '-')}`,
        importe: f.total,
        mandato_referencia: f.mandato_referencia,
        mandato_fecha_firma: f.mandato_fecha_firma,
        deudor_nombre: f.cliente_nombre,
        deudor_iban: f.mandato_iban,
        deudor_bic: f.mandato_bic,
        concepto: `Factura ${f.numero_completo} Gestion Energetica`
      }))

      const { error: recibosError } = await supabase
        .from('remesas_recibos')
        .insert(recibos)

      if (recibosError) throw recibosError

      return {
        remesa,
        incluidas: facturas.length
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remesas'] })
      queryClient.invalidateQueries({ queryKey: ['facturas-para-remesa'] })
    }
  })
}

/**
 * Hook para generar XML SEPA de una remesa
 */
export function useGenerarXML() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (remesaId) => {
      // Obtener remesa con recibos
      const { data: remesa, error: remesaError } = await supabase
        .from('remesas')
        .select(`
          *,
          recibos:remesas_recibos(*)
        `)
        .eq('id', remesaId)
        .single()

      if (remesaError) throw remesaError

      // Obtener configuración
      const { data: config } = await supabase
        .from('configuracion_sepa')
        .select('*')
        .single()

      // Generar XML
      const xml = generarXMLSepa(remesa, config)
      const nombreFichero = `${remesa.referencia}.xml`

      // Actualizar remesa
      const { error: updateError } = await supabase
        .from('remesas')
        .update({
          fichero_xml: xml,
          fichero_nombre: nombreFichero,
          estado: 'generada'
        })
        .eq('id', remesaId)

      if (updateError) throw updateError

      return { xml, nombreFichero }
    },
    onSuccess: (_, remesaId) => {
      queryClient.invalidateQueries({ queryKey: ['remesa', remesaId] })
      queryClient.invalidateQueries({ queryKey: ['remesas'] })
    }
  })
}

/**
 * Hook para actualizar estado de remesa
 */
export function useActualizarEstadoRemesa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ remesaId, estado, fechaEnvioBanco }) => {
      const updateData = { estado }
      
      if (fechaEnvioBanco) {
        updateData.fecha_envio_banco = fechaEnvioBanco
      }

      const { error } = await supabase
        .from('remesas')
        .update(updateData)
        .eq('id', remesaId)

      if (error) throw error
      return { success: true }
    },
    onSuccess: (_, { remesaId }) => {
      queryClient.invalidateQueries({ queryKey: ['remesa', remesaId] })
      queryClient.invalidateQueries({ queryKey: ['remesas'] })
    }
  })
}

/**
 * Hook para eliminar remesa
 */
export function useEliminarRemesa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (remesaId) => {
      const { error } = await supabase
        .from('remesas')
        .delete()
        .eq('id', remesaId)
        .eq('estado', 'borrador') // Solo se pueden eliminar borradores

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remesas'] })
      queryClient.invalidateQueries({ queryKey: ['facturas-para-remesa'] })
    }
  })
}

// =====================================================
// MUTATIONS - MANDATOS
// =====================================================

/**
 * Hook para crear un mandato SEPA
 */
export function useCrearMandato() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mandatoData) => {
      // Generar referencia
      const { data: referencia } = await supabase
        .rpc('generar_referencia_mandato', { p_cliente_id: mandatoData.cliente_id })

      // Crear mandato
      const { data: mandato, error: mandatoError } = await supabase
        .from('mandatos_sepa')
        .insert({
          ...mandatoData,
          referencia: referencia || `A360-CLI-${Date.now()}`
        })
        .select()
        .single()

      if (mandatoError) throw mandatoError

      // Actualizar cliente con el mandato
      const { error: clienteError } = await supabase
        .from('clientes')
        .update({
          mandato_sepa_id: mandato.id,
          fecha_mandato_sepa: mandato.fecha_firma
        })
        .eq('id', mandatoData.cliente_id)

      if (clienteError) throw clienteError

      return mandato
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mandatos', variables.cliente_id] })
      queryClient.invalidateQueries({ queryKey: ['mandato-activo', variables.cliente_id] })
      queryClient.invalidateQueries({ queryKey: ['cliente', variables.cliente_id] })
    }
  })
}

/**
 * Hook para actualizar un mandato
 */
export function useActualizarMandato() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ mandatoId, ...data }) => {
      const { error } = await supabase
        .from('mandatos_sepa')
        .update(data)
        .eq('id', mandatoId)

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandatos'] })
      queryClient.invalidateQueries({ queryKey: ['mandato-activo'] })
    }
  })
}

/**
 * Hook para cancelar un mandato
 */
export function useCancelarMandato() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ mandatoId, motivo }) => {
      const { error } = await supabase
        .from('mandatos_sepa')
        .update({
          estado: 'cancelado',
          motivo_cancelacion: motivo,
          fecha_cancelacion: new Date().toISOString().split('T')[0]
        })
        .eq('id', mandatoId)

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mandatos'] })
      queryClient.invalidateQueries({ queryKey: ['mandato-activo'] })
    }
  })
}

/**
 * Hook para actualizar configuración SEPA
 */
export function useUpdateConfiguracionSEPA() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (config) => {
      const { data, error } = await supabase
        .from('configuracion_sepa')
        .update({
          ...config,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion-sepa'] })
    }
  })
}

// =====================================================
// GENERADOR XML SEPA
// =====================================================

function generarXMLSepa(remesa, config) {
  const sanitize = (text, maxLen = 70) => {
    if (!text) return ''
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/g, 'n')
      .replace(/Ñ/g, 'N')
      .replace(/[^a-zA-Z0-9 .,\-\/\+\(\)\?:']/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, maxLen)
  }

  const formatDate = (date) => {
    const d = new Date(date)
    return d.toISOString().split('T')[0]
  }

  const transacciones = remesa.recibos.map(recibo => `
    <DrctDbtTxInf>
      <PmtId>
        <EndToEndId>${sanitize(recibo.referencia_recibo, 35)}</EndToEndId>
      </PmtId>
      <InstdAmt Ccy="EUR">${parseFloat(recibo.importe).toFixed(2)}</InstdAmt>
      <DrctDbtTx>
        <MndtRltdInf>
          <MndtId>${sanitize(recibo.mandato_referencia, 35)}</MndtId>
          <DtOfSgntr>${formatDate(recibo.mandato_fecha_firma)}</DtOfSgntr>
        </MndtRltdInf>
      </DrctDbtTx>
      ${recibo.deudor_bic 
        ? `<DbtrAgt><FinInstnId><BIC>${recibo.deudor_bic}</BIC></FinInstnId></DbtrAgt>`
        : `<DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>`
      }
      <Dbtr>
        <Nm>${sanitize(recibo.deudor_nombre)}</Nm>
      </Dbtr>
      <DbtrAcct>
        <Id><IBAN>${recibo.deudor_iban.replace(/\s/g, '')}</IBAN></Id>
      </DbtrAcct>
      <RmtInf>
        <Ustrd>${sanitize(recibo.concepto, 140)}</Ustrd>
      </RmtInf>
    </DrctDbtTxInf>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${remesa.referencia}</MsgId>
      <CreDtTm>${new Date().toISOString()}</CreDtTm>
      <NbOfTxs>${remesa.num_recibos}</NbOfTxs>
      <CtrlSum>${parseFloat(remesa.importe_total).toFixed(2)}</CtrlSum>
      <InitgPty>
        <Nm>${sanitize(config.nombre_acreedor)}</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>${config.identificador_acreedor}</Id>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${remesa.referencia}-PMT</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${remesa.num_recibos}</NbOfTxs>
      <CtrlSum>${parseFloat(remesa.importe_total).toFixed(2)}</CtrlSum>
      <PmtTpInf>
        <SvcLvl><Cd>SEPA</Cd></SvcLvl>
        <LclInstrm><Cd>CORE</Cd></LclInstrm>
        <SeqTp>RCUR</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${formatDate(remesa.fecha_cobro)}</ReqdColltnDt>
      <Cdtr>
        <Nm>${sanitize(config.nombre_acreedor)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id><IBAN>${config.iban_principal.replace(/\s/g, '')}</IBAN></Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId><BIC>${config.bic_principal}</BIC></FinInstnId>
      </CdtrAgt>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${config.identificador_acreedor}</Id>
              <SchmeNm><Prtry>SEPA</Prtry></SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>
      ${transacciones}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`
}

