// Comunidades, Agrupaciones, Ubicaciones, Precios
export {
  useComunidades,
  useComunidad,
  useCreateComunidad,
  useUpdateComunidad,
  useDeleteComunidad,
  useAgrupaciones,
  useCreateAgrupacion,
  useUpdateAgrupacion,
  useDeleteAgrupacion,
  useUbicaciones,
  useUbicacionesByComunidad,
  useCreateUbicacion,
  useUpdateUbicacion,
  useDeleteUbicacion,
  usePrecios,
  usePreciosVigentes,
  useCreatePrecio
} from './useComunidades'

// Clientes
export {
  useClientes,
  useClientesSimple,
  useCliente,
  useCreateCliente,
  useUpdateCliente,
  useToggleBloqueoCliente,
  useAsignarClienteUbicacion,
  useFinalizarOcupacion
} from './useClientes'

// Contadores
export {
  useContadores,
  useContadoresSimple,
  useContador,
  useCreateContador,
  useUpdateContador,
  useDeleteContador,
  useAsignarConcepto,
  useDesasignarConcepto
} from './useContadores'

// Conceptos
export {
  useConceptos,
  useConcepto,
  useCreateConcepto,
  useUpdateConcepto
} from './useConceptos'


