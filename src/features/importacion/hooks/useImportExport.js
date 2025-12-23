/**
 * Hook de Importaci?n/Exportaci?n de Datos
 * Sistema de Facturaci?n A360
 */

import { useState, useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  generarPlantillaVacia, 
  exportarDatos, 
  leerExcel,
  validarFilas,
  procesarComunidades,
  procesarClientes,
  procesarContadores,
  procesarComunidadCompleta,
  obtenerConceptosActivos,
  generarPlantillaComunidadCompleta,
  leerExcelMultiHoja,
  exportarComunidadCompleta
} from '../utils'
import {
  getComunidadesParaExport,
  getClientesParaExport,
  getContadoresParaExport,
  getComunidadCompletaParaExport
} from '../services'

const ESTADOS = {
  IDLE: 'idle',
  CARGANDO: 'cargando',
  VALIDANDO: 'validando',
  PROCESANDO: 'procesando',
  COMPLETADO: 'completado',
  ERROR: 'error'
}

/**
 * Hook principal para gestionar importaci?n y exportaci?n
 */
export function useImportExport() {
  const queryClient = useQueryClient()
  
  // Estado general
  const [estado, setEstado] = useState(ESTADOS.IDLE)
  const [entidadActiva, setEntidadActiva] = useState('comunidades')
  const [error, setError] = useState(null)
  
  // Estado del archivo cargado
  const [archivo, setArchivo] = useState(null)
  const [datosExcel, setDatosExcel] = useState(null)
  
  // Estado de validaci?n
  const [validacion, setValidacion] = useState(null)
  
  // Estado de progreso
  const [progreso, setProgreso] = useState({ porcentaje: 0, actual: 0, total: 0 })
  
  // Resultado de importaci?n
  const [resultado, setResultado] = useState(null)
  
  // Conceptos activos (para contadores)
  const [conceptos, setConceptos] = useState([])
  
  // Cargar conceptos activos al montar
  useEffect(() => {
    const cargarConceptos = async () => {
      try {
        const conceptosActivos = await obtenerConceptosActivos()
        setConceptos(conceptosActivos)
      } catch (err) {
        console.error('Error al cargar conceptos:', err)
      }
    }
    cargarConceptos()
  }, [])

  /**
   * Descargar plantilla vac?a
   */
  const descargarPlantilla = useCallback((entidad, conEjemplo = true) => {
    try {
      // Para contadores, pasar conceptos para generar columnas din?micas
      const options = entidad === 'contadores' ? { conceptos } : {}
      const fileName = generarPlantillaVacia(entidad, conEjemplo, options)
      return { success: true, fileName }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [conceptos])

  /**
   * Exportar datos existentes
   */
  const exportarEntidad = useCallback(async (entidad) => {
    setEstado(ESTADOS.CARGANDO)
    setError(null)
    
    try {
      let datos
      switch (entidad) {
        case 'comunidades':
          datos = await getComunidadesParaExport()
          break
        case 'clientes':
          datos = await getClientesParaExport()
          break
        case 'contadores':
          datos = await getContadoresParaExport()
          break
        default:
          throw new Error(`Entidad no soportada: ${entidad}`)
      }
      
      if (datos.length === 0) {
        throw new Error('No hay datos para exportar')
      }
      
      // Para contadores, pasar conceptos para generar columnas din?micas
      const options = entidad === 'contadores' ? { conceptos } : {}
      const fileName = exportarDatos(entidad, datos, options)
      setEstado(ESTADOS.COMPLETADO)
      return { success: true, fileName, count: datos.length }
    } catch (err) {
      setEstado(ESTADOS.ERROR)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [conceptos])

  /**
   * Cargar archivo Excel
   */
  const cargarArchivo = useCallback(async (file) => {
    setEstado(ESTADOS.CARGANDO)
    setError(null)
    setValidacion(null)
    setResultado(null)
    
    try {
      // Pasar conceptos para detectar columnas din?micas en contadores
      const datos = await leerExcel(file, { conceptos })
      
      setArchivo(file)
      setDatosExcel(datos)
      setEntidadActiva(datos.entidad)
      
      // Validar autom?ticamente
      setEstado(ESTADOS.VALIDANDO)
      const validacionResult = await validarFilas(datos.entidad, datos.rows)
      setValidacion(validacionResult)
      
      setEstado(ESTADOS.IDLE)
      return { success: true, datos, validacion: validacionResult }
    } catch (err) {
      setEstado(ESTADOS.ERROR)
      setError(err.message)
      setArchivo(null)
      setDatosExcel(null)
      return { success: false, error: err.message }
    }
  }, [conceptos])

  /**
   * Limpiar archivo cargado
   */
  const limpiarArchivo = useCallback(() => {
    setArchivo(null)
    setDatosExcel(null)
    setValidacion(null)
    setResultado(null)
    setEstado(ESTADOS.IDLE)
    setError(null)
    setProgreso({ porcentaje: 0, actual: 0, total: 0 })
  }, [])

  /**
   * Ejecutar importaci?n
   */
  const ejecutarImportacion = useCallback(async () => {
    if (!datosExcel || !datosExcel.rows.length) {
      setError('No hay datos para importar')
      return { success: false, error: 'No hay datos para importar' }
    }
    
    setEstado(ESTADOS.PROCESANDO)
    setError(null)
    setProgreso({ porcentaje: 0, actual: 0, total: datosExcel.rows.length })
    
    const onProgress = (porcentaje, actual, total) => {
      setProgreso({ porcentaje, actual, total })
    }
    
    try {
      let result
      switch (datosExcel.entidad) {
        case 'comunidades':
          result = await procesarComunidades(datosExcel.rows, onProgress)
          break
        case 'clientes':
          result = await procesarClientes(datosExcel.rows, onProgress)
          break
        case 'contadores':
          result = await procesarContadores(datosExcel.rows, onProgress)
          break
        default:
          throw new Error(`Entidad no soportada: ${datosExcel.entidad}`)
      }
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: [datosExcel.entidad] })
      if (datosExcel.entidad === 'clientes') {
        queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
      }
      if (datosExcel.entidad === 'contadores') {
        queryClient.invalidateQueries({ queryKey: ['contadores'] })
      }
      
      setResultado(result)
      setEstado(ESTADOS.COMPLETADO)
      return { success: true, result }
    } catch (err) {
      setEstado(ESTADOS.ERROR)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [datosExcel, queryClient])

  /**
   * Reiniciar todo el proceso
   */
  const reiniciar = useCallback(() => {
    limpiarArchivo()
  }, [limpiarArchivo])

  // ============================================================
  // FUNCIONES PARA COMUNIDAD COMPLETA (Multi-Hoja)
  // ============================================================
  
  // Estado específico para comunidad completa
  const [datosComunidadCompleta, setDatosComunidadCompleta] = useState(null)
  const [resultadoComunidadCompleta, setResultadoComunidadCompleta] = useState(null)
  const [progresoMultiHoja, setProgresoMultiHoja] = useState({
    etapa: 'idle',
    porcentaje: 0,
    mensaje: ''
  })

  /**
   * Descargar plantilla de comunidad completa
   */
  const descargarPlantillaComunidadCompleta = useCallback((codigoComunidad = 'CODIGO') => {
    try {
      const fileName = generarPlantillaComunidadCompleta({ 
        incluirEjemplos: true, 
        codigoComunidad 
      })
      return { success: true, fileName }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Cargar archivo Excel multi-hoja
   */
  const cargarArchivoComunidadCompleta = useCallback(async (file) => {
    setEstado(ESTADOS.CARGANDO)
    setError(null)
    setResultadoComunidadCompleta(null)
    
    try {
      const datos = await leerExcelMultiHoja(file)
      setArchivo(file)
      setDatosComunidadCompleta(datos)
      setEstado(ESTADOS.IDLE)
      return { success: true, datos }
    } catch (err) {
      setEstado(ESTADOS.ERROR)
      setError(err.message)
      setArchivo(null)
      setDatosComunidadCompleta(null)
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Ejecutar importación de comunidad completa
   */
  const ejecutarImportacionComunidadCompleta = useCallback(async () => {
    if (!datosComunidadCompleta || !datosComunidadCompleta.hojas) {
      setError('No hay datos para importar')
      return { success: false, error: 'No hay datos para importar' }
    }
    
    setEstado(ESTADOS.PROCESANDO)
    setError(null)
    
    const onProgress = (etapa, porcentaje, mensaje) => {
      setProgresoMultiHoja({ etapa, porcentaje, mensaje })
    }
    
    try {
      const resultado = await procesarComunidadCompleta(datosComunidadCompleta.hojas, onProgress)
      
      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['comunidades'] })
      queryClient.invalidateQueries({ queryKey: ['agrupaciones'] })
      queryClient.invalidateQueries({ queryKey: ['ubicaciones'] })
      queryClient.invalidateQueries({ queryKey: ['precios'] })
      
      setResultadoComunidadCompleta(resultado)
      setEstado(ESTADOS.COMPLETADO)
      return { success: true, resultado }
    } catch (err) {
      setEstado(ESTADOS.ERROR)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [datosComunidadCompleta, queryClient])

  /**
   * Exportar una comunidad completa
   */
  const exportarComunidadCompletaFn = useCallback(async (comunidadId) => {
    setEstado(ESTADOS.CARGANDO)
    setError(null)
    
    try {
      const datos = await getComunidadCompletaParaExport(comunidadId)
      const fileName = exportarComunidadCompleta(
        datos.comunidad,
        datos.portales,
        datos.viviendas,
        datos.precios
      )
      setEstado(ESTADOS.COMPLETADO)
      return { success: true, fileName }
    } catch (err) {
      setEstado(ESTADOS.ERROR)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Limpiar datos de comunidad completa
   */
  const limpiarComunidadCompleta = useCallback(() => {
    setDatosComunidadCompleta(null)
    setResultadoComunidadCompleta(null)
    setProgresoMultiHoja({ etapa: 'idle', porcentaje: 0, mensaje: '' })
    limpiarArchivo()
  }, [limpiarArchivo])

  return {
    // Estado
    estado,
    entidadActiva,
    setEntidadActiva,
    error,
    
    // Archivo
    archivo,
    datosExcel,
    
    // Validaci?n
    validacion,
    
    // Progreso
    progreso,
    
    // Resultado
    resultado,
    
    // Conceptos (para contadores)
    conceptos,
    
    // Acciones
    descargarPlantilla,
    exportarEntidad,
    cargarArchivo,
    limpiarArchivo,
    ejecutarImportacion,
    reiniciar,
    
    // Estados
    ESTADOS,
    
    // Helpers
    isLoading: estado === ESTADOS.CARGANDO || estado === ESTADOS.VALIDANDO,
    isProcessing: estado === ESTADOS.PROCESANDO,
    isCompleted: estado === ESTADOS.COMPLETADO,
    isError: estado === ESTADOS.ERROR,
    canImport: datosExcel && validacion && validacion.validas > 0,
    
    // Comunidad Completa
    datosComunidadCompleta,
    resultadoComunidadCompleta,
    progresoMultiHoja,
    descargarPlantillaComunidadCompleta,
    cargarArchivoComunidadCompleta,
    ejecutarImportacionComunidadCompleta,
    exportarComunidadCompletaFn,
    limpiarComunidadCompleta,
    canImportComunidadCompleta: datosComunidadCompleta?.hojas?.datosGenerales?.length > 0
  }
}

export default useImportExport

