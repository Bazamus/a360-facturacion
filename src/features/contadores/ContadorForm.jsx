import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RefreshCw } from 'lucide-react'
import { contadorSchema } from '@/lib/validations'
import { useComunidades, useAgrupaciones, useUbicaciones } from '@/hooks'
import { Button, Input, Select, FormField, Textarea, LoadingSpinner, CommunityPicker, SearchablePicker } from '@/components/ui'

export function ContadorForm({ contador, onSubmit, loading, onCambioContador }) {
  const [comunidadId, setComunidadId] = useState('')
  const [agrupacionId, setAgrupacionId] = useState('')

  const { data: comunidades, isLoading: loadingComunidades } = useComunidades({ activa: true })
  const { data: agrupaciones, isLoading: loadingAgrupaciones } = useAgrupaciones(comunidadId)
  const { data: ubicaciones, isLoading: loadingUbicaciones } = useUbicaciones(agrupacionId)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(contadorSchema),
    defaultValues: {
      numero_serie: contador?.numero_serie || '',
      ubicacion_id: contador?.ubicacion_id || '',
      marca: contador?.marca || '',
      modelo: contador?.modelo || '',
      fecha_instalacion: contador?.fecha_instalacion || '',
      fecha_ultima_verificacion: contador?.fecha_ultima_verificacion || '',
      observaciones: contador?.observaciones || ''
    }
  })

  // Actualizar formulario cuando cambien los datos del contador
  useEffect(() => {
    if (contador) {
      console.log('=== ACTUALIZANDO FORMULARIO CON DATOS ===')
      console.log('Contador:', contador)
      console.log('ubicacion_id:', contador.ubicacion_id)
      
      reset({
        numero_serie: contador.numero_serie || '',
        ubicacion_id: contador.ubicacion_id || '',
        marca: contador.marca || '',
        modelo: contador.modelo || '',
        fecha_instalacion: contador.fecha_instalacion || '',
        fecha_ultima_verificacion: contador.fecha_ultima_verificacion || '',
        observaciones: contador.observaciones || ''
      })
      
      // Cargar la jerarquía de ubicación
      if (contador.ubicacion) {
        const com = contador.ubicacion.agrupacion?.comunidad
        const agr = contador.ubicacion.agrupacion
        
        console.log('Cargando jerarquía:')
        console.log('  Comunidad:', com?.nombre, com?.id)
        console.log('  Agrupación:', agr?.nombre, agr?.id)
        console.log('  Ubicación:', contador.ubicacion.nombre, contador.ubicacion_id)
        
        if (com) setComunidadId(com.id)
        if (agr) setAgrupacionId(agr.id)
      }
    }
  }, [contador, reset])

  // Actualizar ubicacion_id cuando las ubicaciones se carguen
  useEffect(() => {
    if (contador?.ubicacion_id && ubicaciones && ubicaciones.length > 0 && !loadingUbicaciones) {
      const ubicacionExiste = ubicaciones.find(u => u.ubicacion_id === contador.ubicacion_id)
      if (ubicacionExiste) {
        console.log('=== ESTABLECIENDO UBICACIÓN EN SELECT ===')
        console.log('ubicacion_id:', contador.ubicacion_id)
        console.log('ubicación encontrada:', ubicacionExiste.ubicacion_nombre)
        setValue('ubicacion_id', contador.ubicacion_id)
      }
    }
  }, [ubicaciones, loadingUbicaciones, contador, setValue])

  const handleComunidadChange = (id) => {
    setComunidadId(id)
    setAgrupacionId('')
    setValue('ubicacion_id', '')
  }

  const handleAgrupacionChange = (id) => {
    setAgrupacionId(id || '')
    setValue('ubicacion_id', '')
  }

  const handleFormSubmit = (data) => {
    console.log('=== DATOS DEL FORMULARIO ===')
    console.log('Datos completos:', data)
    console.log('ubicacion_id:', data.ubicacion_id)
    console.log('comunidadId (state):', comunidadId)
    console.log('agrupacionId (state):', agrupacionId)
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Identificación */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Identificación</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Número de Serie" error={errors.numero_serie?.message} required>
            {contador ? (
              /* En modo edición el campo es de solo lectura; el cambio se hace
                 a través del flujo guiado del botón "Cambio Contador" */
              <div className="flex items-center gap-2">
                <Input
                  {...register('numero_serie')}
                  disabled
                  className="font-mono flex-1"
                />
                {onCambioContador && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onCambioContador}
                    className="whitespace-nowrap flex-shrink-0"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Cambio Contador
                  </Button>
                )}
              </div>
            ) : (
              <Input
                {...register('numero_serie')}
                placeholder="ABC123456"
                error={errors.numero_serie}
              />
            )}
          </FormField>

          <FormField label="Marca" error={errors.marca?.message}>
            <Input
              {...register('marca')}
              placeholder="Marca del contador"
              error={errors.marca}
            />
          </FormField>

          <FormField label="Modelo" error={errors.modelo?.message}>
            <Input
              {...register('modelo')}
              placeholder="Modelo del contador"
              error={errors.modelo}
            />
          </FormField>
        </div>
      </div>

      {/* Ubicación */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Ubicación</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Comunidad" required>
            <CommunityPicker
              value={comunidadId}
              onChange={handleComunidadChange}
              comunidades={comunidades ?? []}
              placeholder="Seleccionar comunidad..."
              allowEmpty={false}
              className={loadingComunidades ? 'opacity-60 pointer-events-none' : ''}
            />
          </FormField>

          <FormField label="Portal/Bloque" required>
            <SearchablePicker
              value={agrupacionId}
              onChange={handleAgrupacionChange}
              options={(agrupaciones?.filter((a) => a.activa) || []).map((a) => ({
                value: a.id,
                label: a.nombre
              }))}
              placeholder={!comunidadId ? 'Primero selecciona comunidad' : 'Seleccionar portal/bloque...'}
              allowEmpty={false}
              modalTitle="Seleccionar portal o bloque"
              searchPlaceholder="Buscar por nombre..."
              disabled={!comunidadId || loadingAgrupaciones}
            />
          </FormField>

          <FormField label="Vivienda" error={errors.ubicacion_id?.message} required>
            <SearchablePicker
              value={watch('ubicacion_id') || ''}
              onChange={(id) => setValue('ubicacion_id', id)}
              options={(ubicaciones || []).map((u) => ({
                value: u.ubicacion_id,
                label: `${u.ubicacion_nombre}${u.cliente_nombre ? ` (${u.cliente_nombre})` : ''}`
              }))}
              placeholder={!agrupacionId ? 'Primero selecciona portal' : 'Seleccionar vivienda...'}
              allowEmpty={false}
              modalTitle="Seleccionar vivienda"
              searchPlaceholder="Buscar por nombre o cliente..."
              disabled={!agrupacionId || loadingUbicaciones}
            />
          </FormField>
        </div>
      </div>

      {/* Fechas */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Fechas</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Fecha de instalación" error={errors.fecha_instalacion?.message}>
            <Input
              {...register('fecha_instalacion')}
              type="date"
              error={errors.fecha_instalacion}
            />
          </FormField>

          <FormField label="Última verificación" error={errors.fecha_ultima_verificacion?.message}>
            <Input
              {...register('fecha_ultima_verificacion')}
              type="date"
              error={errors.fecha_ultima_verificacion}
            />
          </FormField>
        </div>
      </div>

      {/* Observaciones */}
      <div className="border-t pt-6">
        <FormField label="Observaciones" error={errors.observaciones?.message}>
          <Textarea
            {...register('observaciones')}
            rows={3}
            placeholder="Notas sobre el contador..."
            error={errors.observaciones}
          />
        </FormField>
      </div>

      {/* Botones */}
      <div className="border-t pt-6 flex justify-end gap-3">
        <Button type="submit" loading={loading}>
          {contador ? 'Guardar cambios' : 'Crear contador'}
        </Button>
      </div>
    </form>
  )
}






