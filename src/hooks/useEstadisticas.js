import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Hook para obtener estadísticas generales del sistema
 * Retorna contadores de comunidades, clientes, contadores y facturación
 */
export function useEstadisticas() {
  const [estadisticas, setEstadisticas] = useState({
    comunidades: { total: 0, cambio: 0 },
    clientes: { total: 0, cambio: 0 },
    contadores: { total: 0, cambio: 0 },
    facturado: { total: 0, cambio: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Verificar sesión antes de obtener estadísticas
    const verificarYObtener = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        obtenerEstadisticas()
      } else {
        setLoading(false)
      }
    }

    verificarYObtener()
  }, [])

  const obtenerEstadisticas = async () => {
    try {
      setLoading(true)

      // Obtener contadores en paralelo
      const [
        comunidadesResult,
        clientesResult,
        contadoresResult,
        facturadoResult
      ] = await Promise.all([
        // Total comunidades activas
        supabase
          .from('comunidades')
          .select('id', { count: 'exact', head: true })
          .eq('activa', true),

        // Total clientes activos
        supabase
          .from('clientes')
          .select('id', { count: 'exact', head: true })
          .eq('activo', true),

        // Total contadores activos
        supabase
          .from('contadores')
          .select('id', { count: 'exact', head: true })
          .eq('activo', true),

        // Total facturado del mes actual
        obtenerFacturadoMesActual()
      ])

      // Verificar errores
      if (comunidadesResult.error) throw comunidadesResult.error
      if (clientesResult.error) throw clientesResult.error
      if (contadoresResult.error) throw contadoresResult.error

      setEstadisticas({
        comunidades: {
          total: comunidadesResult.count || 0,
          cambio: 0 // TODO: Calcular cambio respecto al mes anterior
        },
        clientes: {
          total: clientesResult.count || 0,
          cambio: 0 // TODO: Calcular cambio respecto al mes anterior
        },
        contadores: {
          total: contadoresResult.count || 0,
          cambio: 0 // TODO: Calcular cambio respecto al mes anterior
        },
        facturado: {
          total: facturadoResult.total || 0,
          cambio: facturadoResult.cambio || 0
        }
      })
    } catch (err) {
      console.error('Error al obtener estadísticas:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }

  const obtenerFacturadoMesActual = async () => {
    try {
      // Obtener primer y último día del mes actual
      const ahora = new Date()
      const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      const primerDiaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
      const ultimoDiaMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59)

      // Facturado del mes actual
      const { data: mesActual, error: errorActual } = await supabase
        .from('facturas')
        .select('total_con_iva')
        .gte('fecha_emision', primerDiaMes.toISOString())
        .not('anulada', 'eq', true)

      if (errorActual) throw errorActual

      const totalMesActual = mesActual?.reduce((sum, f) => sum + (parseFloat(f.total_con_iva) || 0), 0) || 0

      // Facturado del mes anterior (para calcular cambio)
      const { data: mesAnterior, error: errorAnterior } = await supabase
        .from('facturas')
        .select('total_con_iva')
        .gte('fecha_emision', primerDiaMesAnterior.toISOString())
        .lte('fecha_emision', ultimoDiaMesAnterior.toISOString())
        .not('anulada', 'eq', true)

      if (errorAnterior) throw errorAnterior

      const totalMesAnterior = mesAnterior?.reduce((sum, f) => sum + (parseFloat(f.total_con_iva) || 0), 0) || 0

      // Calcular porcentaje de cambio
      let cambio = 0
      if (totalMesAnterior > 0) {
        cambio = Math.round(((totalMesActual - totalMesAnterior) / totalMesAnterior) * 100)
      }

      return {
        total: totalMesActual,
        cambio
      }
    } catch (err) {
      console.error('Error al obtener facturado:', err)
      return { total: 0, cambio: 0 }
    }
  }

  return { estadisticas, loading, error, refetch: obtenerEstadisticas }
}
