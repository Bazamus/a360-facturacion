/**
 * Utilidades de Importación/Exportación
 * Sistema de Facturación A360
 */

export {
  generarPlantillaVacia,
  exportarDatos,
  leerExcel,
  getColumnConfig,
  generarConfigContadores,
  generarPlantillaComunidadCompleta,
  leerExcelMultiHoja,
  exportarComunidadCompleta,
  COLUMN_CONFIG,
  COMUNIDAD_COMPLETA_CONFIG
} from './excelGenerator'

export {
  limpiarCache,
  resolverComunidad,
  buscarAgrupacion,
  buscarOCrearAgrupacion,
  buscarUbicacion,
  buscarOCrearUbicacion,
  resolverUbicacionCompleta,
  buscarClientePorNif,
  buscarComunidadPorCodigo,
  buscarContadorPorSerie,
  buscarConceptoPorCodigo,
  obtenerConceptosActivos
} from './fieldResolvers'

export {
  procesarComunidades,
  procesarClientes,
  procesarContadores,
  procesarPortales,
  procesarViviendas,
  procesarPrecios,
  procesarComunidadCompleta,
  validarFilas
} from './importProcessor'

