/**
 * Hook principal para el sistema de importación de lecturas
 * Sistema de Facturación A360
 */

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  readExcelFile,
  analyzeExcelStructure,
  getPreviewData,
  processRow,
  groupLecturasByContador,
  calculateStats
} from '../utils'
import {
  getConceptosActivos,
  getComunidadesActivas,
  createImportacion,
  updateImportacion,
  saveImportacionDetallesBatch,
  getImportacion,
  getImportacionDetalles,
  getImportaciones,
  confirmarImportacion,
  updateImportacionDetalle,
  descartarDetalles,
  createDataServices
} from '../services/dataServices'

/**
 * Hook para obtener comunidades activas
 */
export function useComunidades() {
  return useQuery({
    queryKey: ['comunidades', 'activas'],
    queryFn: getComunidadesActivas,
    staleTime: 5 * 60 * 1000 // 5 minutos
  })
}

/**
 * Hook para obtener conceptos activos
 */
export function useConceptos() {
  return useQuery({
    queryKey: ['conceptos', 'activos'],
    queryFn: getConceptosActivos,
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Hook para el flujo completo de importación de lecturas
 */
export function useImportarLecturas() {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState('idle') // idle, analyzing, processing, completed, error
  const [progreso, setProgreso] = useState({ current: 0, total: 0 })
  const [error, setError] = useState(null)
  
  // Datos del Excel
  const [excelData, setExcelData] = useState(null)
  const [analisis, setAnalisis] = useState(null)
  
  // Resultados del procesamiento
  const [importacionId, setImportacionId] = useState(null)
  const [lecturas, setLecturas] = useState([])
  const [stats, setStats] = useState(null)
  
  /**
   * Paso 1: Cargar y analizar el archivo Excel
   */
  const analizarExcel = useCallback(async (file, conceptosActivos) => {
    setEstado('analyzing')
    setError(null)
    
    try {
      // Leer el archivo
      const data = await readExcelFile(file)
      setExcelData({
        ...data,
        fileName: file.name,
        fileSize: file.size
      })
      
      // Analizar estructura
      const resultado = analyzeExcelStructure(data.headers, conceptosActivos)
      setAnalisis(resultado)
      
      // Generar preview
      resultado.preview = getPreviewData(data.headers, data.rows, 5)
      
      setEstado('analyzed')
      return resultado
      
    } catch (err) {
      setError(err.message || 'Error al analizar el archivo Excel')
      setEstado('error')
      throw err
    }
  }, [])
  
  /**
   * Paso 2: Procesar el Excel y generar lecturas
   */
  const procesarExcel = useCallback(async (comunidadId, usuarioId) => {
    if (!excelData || !analisis?.isValid) {
      throw new Error('Debe analizar el archivo primero')
    }
    
    setEstado('processing')
    setError(null)
    
    const dataServices = createDataServices()
    const todasLasLecturas = []
    
    try {
      // Crear registro de importación
      const importacion = await createImportacion({
        comunidadId,
        nombreArchivo: excelData.fileName,
        totalContadores: excelData.totalRows,
        totalLecturas: 0,
        usuarioId
      })
      setImportacionId(importacion.id)
      
      setProgreso({ current: 0, total: excelData.totalRows })
      
      // Procesar cada fila
      for (let i = 0; i < excelData.rows.length; i++) {
        const row = excelData.rows[i]
        
        const lecturasGeneradas = await processRow({
          row,
          rowIndex: i + 1, // 1-based
          fixedColumns: analisis.fixedColumns,
          conceptColumns: analisis.conceptColumns,
          comunidadId,
          dataServices
        })
        
        todasLasLecturas.push(...lecturasGeneradas)
        setProgreso({ current: i + 1, total: excelData.totalRows })
      }
      
      // Guardar detalles en batch (de 50 en 50 para evitar timeout)
      const batchSize = 50
      for (let i = 0; i < todasLasLecturas.length; i += batchSize) {
        const batch = todasLasLecturas.slice(i, i + batchSize)
        const savedBatch = await saveImportacionDetallesBatch(importacion.id, batch)
        
        // Actualizar IDs de los registros guardados
        savedBatch.forEach((saved, idx) => {
          todasLasLecturas[i + idx].id = saved.id
        })
      }
      
      // Calcular estadísticas
      const estadisticas = calculateStats(todasLasLecturas)
      setStats(estadisticas)
      
      // Actualizar importación con estadísticas
      await updateImportacion(importacion.id, {
        total_filas: estadisticas.contadoresUnicos,
        filas_validas: estadisticas.validas,
        filas_con_alertas: estadisticas.conAlertas,
        filas_error: estadisticas.errores,
        estado: 'validado',
        fecha_procesado: new Date().toISOString()
      })
      
      setLecturas(todasLasLecturas)
      setEstado('completed')
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['importaciones'] })
      
      return {
        importacionId: importacion.id,
        lecturas: todasLasLecturas,
        stats: estadisticas
      }
      
    } catch (err) {
      setError(err.message || 'Error al procesar el archivo')
      setEstado('error')
      throw err
    }
  }, [excelData, analisis, queryClient])
  
  /**
   * Reiniciar el estado
   */
  const reset = useCallback(() => {
    setEstado('idle')
    setProgreso({ current: 0, total: 0 })
    setError(null)
    setExcelData(null)
    setAnalisis(null)
    setImportacionId(null)
    setLecturas([])
    setStats(null)
  }, [])
  
  return {
    // Estado
    estado,
    progreso,
    error,
    
    // Datos del Excel
    excelData,
    analisis,
    
    // Resultados
    importacionId,
    lecturas,
    lecturasAgrupadas: groupLecturasByContador(lecturas),
    stats,
    
    // Acciones
    analizarExcel,
    procesarExcel,
    reset
  }
}

/**
 * Hook para obtener una importación por ID
 */
export function useImportacion(importacionId) {
  return useQuery({
    queryKey: ['importacion', importacionId],
    queryFn: () => getImportacion(importacionId),
    enabled: !!importacionId
  })
}

/**
 * Hook para obtener los detalles de una importación
 */
export function useImportacionDetalles(importacionId) {
  return useQuery({
    queryKey: ['importacion', importacionId, 'detalles'],
    queryFn: () => getImportacionDetalles(importacionId),
    enabled: !!importacionId
  })
}

/**
 * Hook para obtener el historial de importaciones
 */
export function useImportaciones(filtros = {}) {
  return useQuery({
    queryKey: ['importaciones', filtros],
    queryFn: () => getImportaciones(filtros)
  })
}

/**
 * Hook para confirmar una importación
 */
export function useConfirmarImportacion() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ importacionId, usuarioId }) => 
      confirmarImportacion(importacionId, usuarioId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['importacion', variables.importacionId] })
      queryClient.invalidateQueries({ queryKey: ['importaciones'] })
      queryClient.invalidateQueries({ queryKey: ['lecturas'] })
    }
  })
}

/**
 * Hook para actualizar un detalle (corrección manual)
 */
export function useActualizarDetalle() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ detalleId, updates }) => 
      updateImportacionDetalle(detalleId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['importacion', data.importacion_id, 'detalles'] 
      })
    }
  })
}

/**
 * Hook para descartar detalles seleccionados
 */
export function useDescartarDetalles() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (detalleIds) => descartarDetalles(detalleIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importacion'] })
    }
  })
}



