import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import * as XLSX from 'xlsx'

// =====================================================
// QUERIES - DASHBOARD MÉTRICAS
// =====================================================

/**
 * Hook para obtener métricas del dashboard
 */
export function useDashboardMetricas(periodo = {}) {
  const { fechaInicio, fechaFin } = periodo

  return useQuery({
    queryKey: ['dashboard-metricas', fechaInicio, fechaFin],
    queryFn: async () => {
      const inicio = fechaInicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
      const fin = fechaFin || new Date().toISOString().split('T')[0]

      // Métricas de facturación
      const { data: facturacion } = await supabase
        .rpc('get_metricas_facturacion', {
          p_fecha_inicio: inicio,
          p_fecha_fin: fin
        })

      // Métricas de cobro
      const { data: cobro } = await supabase
        .rpc('get_metricas_cobro', {
          p_fecha_inicio: inicio,
          p_fecha_fin: fin
        })

      // Métricas de consumo
      const { data: consumo } = await supabase
        .rpc('get_metricas_consumo', {
          p_fecha_inicio: inicio,
          p_fecha_fin: fin
        })

      // Top comunidades
      const { data: topComunidades } = await supabase
        .from('v_reporte_facturacion_comunidad')
        .select('*')
        .gte('mes', inicio)
        .lte('mes', fin)
        .order('total', { ascending: false })
        .limit(5)

      return {
        facturacion: facturacion || {},
        cobro: cobro || {},
        consumo: consumo || {},
        topComunidades: topComunidades || [],
        periodo: { fechaInicio: inicio, fechaFin: fin }
      }
    }
  })
}

/**
 * Hook para obtener evolución de facturación mensual
 */
export function useEvolucionFacturacion(año) {
  return useQuery({
    queryKey: ['evolucion-facturacion', año],
    queryFn: async () => {
      const añoActual = año || new Date().getFullYear()
      
      const { data, error } = await supabase
        .from('facturas')
        .select('fecha_factura, total, estado')
        .gte('fecha_factura', `${añoActual}-01-01`)
        .lte('fecha_factura', `${añoActual}-12-31`)
        .in('estado', ['emitida', 'pagada'])

      if (error) throw error

      // Agrupar por mes
      const porMes = {}
      for (let i = 1; i <= 12; i++) {
        porMes[i] = { mes: i, facturado: 0, cobrado: 0, numFacturas: 0 }
      }

      data?.forEach(f => {
        const mes = new Date(f.fecha_factura).getMonth() + 1
        porMes[mes].facturado += parseFloat(f.total)
        porMes[mes].numFacturas++
        if (f.estado === 'pagada') {
          porMes[mes].cobrado += parseFloat(f.total)
        }
      })

      return Object.values(porMes)
    }
  })
}

// =====================================================
// QUERIES - REPORTES
// =====================================================

/**
 * Hook para reporte de consumos
 */
export function useReporteConsumos(params = {}) {
  const { comunidadId, fechaInicio, fechaFin, enabled = true } = params

  return useQuery({
    queryKey: ['reporte-consumos', comunidadId, fechaInicio, fechaFin],
    queryFn: async () => {
      let query = supabase
        .from('v_reporte_consumos_vivienda')
        .select('*')
        .order('fecha_lectura', { ascending: false })

      if (comunidadId) {
        query = query.eq('comunidad_id', comunidadId)
      }

      if (fechaInicio) {
        query = query.gte('fecha_lectura', fechaInicio)
      }

      if (fechaFin) {
        query = query.lte('fecha_lectura', fechaFin)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    enabled: enabled && !!(fechaInicio && fechaFin)
  })
}

/**
 * Hook para reporte de facturación
 */
export function useReporteFacturacion(params = {}) {
  const { comunidadId, fechaInicio, fechaFin, estado, enabled = true } = params

  return useQuery({
    queryKey: ['reporte-facturacion', comunidadId, fechaInicio, fechaFin, estado],
    queryFn: async () => {
      let query = supabase
        .from('facturas')
        .select(`
          numero_completo,
          fecha_factura,
          fecha_vencimiento,
          cliente_nombre,
          cliente_nif,
          base_imponible,
          porcentaje_iva,
          importe_iva,
          total,
          estado,
          fecha_pago,
          comunidad:comunidades(nombre)
        `)
        .order('fecha_factura', { ascending: false })

      if (comunidadId) {
        query = query.eq('comunidad_id', comunidadId)
      }

      if (fechaInicio) {
        query = query.gte('fecha_factura', fechaInicio)
      }

      if (fechaFin) {
        query = query.lte('fecha_factura', fechaFin)
      }

      if (estado) {
        query = query.eq('estado', estado)
      }

      const { data, error } = await query

      if (error) throw error

      // Calcular totales
      const totales = {
        numFacturas: data?.length || 0,
        baseImponible: data?.reduce((sum, f) => sum + parseFloat(f.base_imponible || 0), 0) || 0,
        iva: data?.reduce((sum, f) => sum + parseFloat(f.importe_iva || 0), 0) || 0,
        total: data?.reduce((sum, f) => sum + parseFloat(f.total || 0), 0) || 0
      }

      return { data: data || [], totales }
    },
    enabled: enabled && !!(fechaInicio && fechaFin)
  })
}

/**
 * Hook para reporte de morosidad
 */
export function useReporteMorosidad(params = {}) {
  const { comunidadId, enabled = true } = params

  return useQuery({
    queryKey: ['reporte-morosidad', comunidadId],
    queryFn: async () => {
      let query = supabase
        .from('v_reporte_morosidad')
        .select('*')

      if (comunidadId) {
        query = query.eq('comunidad_id', comunidadId)
      }

      const { data, error } = await query

      if (error) throw error

      // Calcular totales
      const totales = {
        numClientes: data?.length || 0,
        numFacturas: data?.reduce((sum, c) => sum + c.num_facturas_pendientes, 0) || 0,
        importeTotal: data?.reduce((sum, c) => sum + parseFloat(c.importe_pendiente || 0), 0) || 0
      }

      return { data: data || [], totales }
    },
    enabled
  })
}

// =====================================================
// MUTATIONS - EXPORTACIÓN
// =====================================================

/**
 * Hook para exportar datos a Excel
 */
export function useExportarExcel() {
  return useMutation({
    mutationFn: async ({ data, nombreArchivo, nombreHoja = 'Datos' }) => {
      if (!data || data.length === 0) {
        throw new Error('No hay datos para exportar')
      }

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja)

      // Generar buffer
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      
      // Crear blob y descargar
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${nombreArchivo}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return { success: true }
    }
  })
}

/**
 * Hook para exportar datos a CSV
 */
export function useExportarCSV() {
  return useMutation({
    mutationFn: async ({ data, nombreArchivo }) => {
      if (!data || data.length === 0) {
        throw new Error('No hay datos para exportar')
      }

      // Generar CSV
      const headers = Object.keys(data[0]).join(';')
      const rows = data.map(row => 
        Object.values(row).map(v => `"${v || ''}"`).join(';')
      )
      const csv = [headers, ...rows].join('\n')

      // Crear blob y descargar
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${nombreArchivo}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return { success: true }
    }
  })
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calcula rango de fechas para un periodo
 */
export function calcularRangoFechas(periodo) {
  const now = new Date()
  let fechaInicio, fechaFin

  switch (periodo) {
    case 'mes_actual':
      fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1)
      fechaFin = now
      break
    case 'mes_anterior':
      fechaInicio = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      fechaFin = new Date(now.getFullYear(), now.getMonth(), 0)
      break
    case 'trimestre':
      fechaInicio = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      fechaFin = now
      break
    case 'año_actual':
      fechaInicio = new Date(now.getFullYear(), 0, 1)
      fechaFin = now
      break
    default:
      fechaInicio = new Date(now.getFullYear(), now.getMonth(), 1)
      fechaFin = now
  }

  return {
    fechaInicio: fechaInicio.toISOString().split('T')[0],
    fechaFin: fechaFin.toISOString().split('T')[0]
  }
}



