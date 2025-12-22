/**
 * Hook de Importación/Exportación de Datos
 * Sistema de Facturación A360
 */

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { 
  generarPlantillaVacia, 
  exportarDatos, 
  leerExcel,
  validarFilas,
  procesarComunidades,
  procesarClientes,
  procesarContadores
} from '../utils'
import {
  getComunidadesParaExport,
  getClientesParaExport,
  getContadoresParaExport
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
 * Hook principal para gestionar importación y exportación
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
  
  // Estado de validación
  const [validacion, setValidacion] = useState(null)
  
  // Estado de progreso
  const [progreso, setProgreso] = useState({ porcentaje: 0, actual: 0, total: 0 })
  
  // Resultado de importación
  const [resultado, setResultado] = useState(null)

  /**
   * Descargar plantilla vacía
   */
  const descargarPlantilla = useCallback((entidad, conEjemplo = true) => {
    try {
      const fileName = generarPlantillaVacia(entidad, conEjemplo)
      return { success: true, fileName }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

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
      
      const fileName = exportarDatos(entidad, datos)
      setEstado(ESTADOS.COMPLETADO)
      return { success: true, fileName, count: datos.length }
    } catch (err) {
      setEstado(ESTADOS.ERROR)
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Cargar archivo Excel
   */
  const cargarArchivo = useCallback(async (file) => {
    setEstado(ESTADOS.CARGANDO)
    setError(null)
    setValidacion(null)
    setResultado(null)
    
    try {
      const datos = await leerExcel(file)
      
      setArchivo(file)
      setDatosExcel(datos)
      setEntidadActiva(datos.entidad)
      
      // Validar automáticamente
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
  }, [])

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
   * Ejecutar importación
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

  return {
    // Estado
    estado,
    entidadActiva,
    setEntidadActiva,
    error,
    
    // Archivo
    archivo,
    datosExcel,
    
    // Validación
    validacion,
    
    // Progreso
    progreso,
    
    // Resultado
    resultado,
    
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
    canImport: datosExcel && validacion && validacion.validas > 0
  }
}

export default useImportExport
