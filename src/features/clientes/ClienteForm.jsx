import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clienteSchema } from '@/lib/validations'
import { Button, Input, Select, FormField, Textarea, Checkbox } from '@/components/ui'
import { formatIBAN } from '@/lib/utils'
import { useComunidades, useUbicacionesByComunidad } from '@/hooks/useComunidades'

export function ClienteForm({ cliente, onSubmit, loading }) {
  // Obtener la ubicación actual del cliente para edición
  const ubicacionActual = cliente?.ubicaciones_clientes?.find(uc => uc.es_actual)
  const comunidadIdInicial = ubicacionActual?.ubicacion?.agrupacion?.comunidad?.id || ''
  const ubicacionIdInicial = ubicacionActual?.ubicacion?.id || ''

  const [comunidadId, setComunidadId] = useState(comunidadIdInicial)
  const [ubicacionId, setUbicacionId] = useState(ubicacionIdInicial)

  // Cargar comunidades y ubicaciones
  const { data: comunidades, isLoading: loadingComunidades } = useComunidades({ activa: true })
  const { data: ubicaciones, isLoading: loadingUbicaciones } = useUbicacionesByComunidad(comunidadId)

  // Cuando cambia la comunidad, resetear ubicación si ya no es válida
  useEffect(() => {
    if (ubicaciones && ubicacionId) {
      const ubicacionValida = ubicaciones.some(u => u.ubicacion_id === ubicacionId)
      if (!ubicacionValida) {
        setUbicacionId('')
      }
    }
  }, [ubicaciones, ubicacionId])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nombre: cliente?.nombre || '',
      apellidos: cliente?.apellidos || '',
      nif: cliente?.nif || '',
      email: cliente?.email || '',
      telefono: cliente?.telefono || '',
      telefono_secundario: cliente?.telefono_secundario || '',
      direccion_correspondencia: cliente?.direccion_correspondencia || '',
      cp_correspondencia: cliente?.cp_correspondencia || '',
      ciudad_correspondencia: cliente?.ciudad_correspondencia || '',
      provincia_correspondencia: cliente?.provincia_correspondencia || '',
      iban: cliente?.iban || '',
      titular_cuenta: cliente?.titular_cuenta || '',
      tipo: cliente?.tipo || 'propietario',
      codigo_cliente: cliente?.codigo_cliente || '',
      observaciones: cliente?.observaciones || ''
    }
  })

  // Wrapper para onSubmit que incluye ubicación
  const handleFormSubmit = (data) => {
    onSubmit({
      ...data,
      ubicacion_id: ubicacionId || null
    })
  }

  // Formatear IBAN mientras se escribe
  const handleIBANChange = (e) => {
    let value = e.target.value.replace(/\s/g, '').toUpperCase()
    if (value.length > 24) value = value.slice(0, 24)
    setValue('iban', value)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Datos personales */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-4">Datos Personales</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nombre" error={errors.nombre?.message} required>
            <Input
              {...register('nombre')}
              placeholder="Juan"
              error={errors.nombre}
            />
          </FormField>

          <FormField label="Apellidos" error={errors.apellidos?.message} required>
            <Input
              {...register('apellidos')}
              placeholder="García López"
              error={errors.apellidos}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <FormField label="NIF/CIF" error={errors.nif?.message} required>
            <Input
              {...register('nif')}
              placeholder="12345678A"
              className="uppercase"
              maxLength={9}
              error={errors.nif}
            />
          </FormField>

          <FormField label="Tipo" error={errors.tipo?.message} required>
            <Select {...register('tipo')} error={errors.tipo}>
              <option value="propietario">Propietario</option>
              <option value="inquilino">Inquilino</option>
            </Select>
          </FormField>

          <FormField label="Código Cliente" error={errors.codigo_cliente?.message}>
            <Input
              {...register('codigo_cliente')}
              placeholder="CLI001"
              error={errors.codigo_cliente}
            />
          </FormField>
        </div>
      </div>

      {/* Ubicación */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Ubicación</h3>
        <p className="text-sm text-gray-500 mb-4">
          Asigna este cliente a una ubicación (vivienda) en una comunidad.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Comunidad">
            <Select
              value={comunidadId}
              onChange={(e) => {
                setComunidadId(e.target.value)
                setUbicacionId('') // Reset ubicación al cambiar comunidad
              }}
              disabled={loadingComunidades}
            >
              <option value="">Selecciona una comunidad</option>
              {comunidades?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.codigo} - {c.nombre}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Ubicación (Vivienda)">
            <Select
              value={ubicacionId}
              onChange={(e) => setUbicacionId(e.target.value)}
              disabled={!comunidadId || loadingUbicaciones}
            >
              <option value="">
                {!comunidadId 
                  ? 'Primero selecciona una comunidad' 
                  : loadingUbicaciones 
                    ? 'Cargando...' 
                    : 'Selecciona una ubicación'
                }
              </option>
              {ubicaciones?.map(u => (
                <option key={u.ubicacion_id} value={u.ubicacion_id}>
                  {u.agrupacion_nombre} - {u.ubicacion_nombre}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        {ubicacionActual && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
            <strong>Ubicación actual:</strong> {ubicacionActual.ubicacion?.agrupacion?.comunidad?.nombre} - {ubicacionActual.ubicacion?.agrupacion?.nombre} - {ubicacionActual.ubicacion?.nombre}
          </div>
        )}
      </div>

      {/* Contacto */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Contacto</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Email" error={errors.email?.message}>
            <Input
              {...register('email')}
              type="email"
              placeholder="email@ejemplo.com"
              error={errors.email}
            />
          </FormField>

          <FormField label="Teléfono" error={errors.telefono?.message}>
            <Input
              {...register('telefono')}
              placeholder="612 345 678"
              error={errors.telefono}
            />
          </FormField>

          <FormField label="Teléfono Secundario" error={errors.telefono_secundario?.message}>
            <Input
              {...register('telefono_secundario')}
              placeholder="91 234 56 78"
              error={errors.telefono_secundario}
            />
          </FormField>
        </div>
      </div>

      {/* Dirección de correspondencia */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Dirección de Correspondencia</h3>
        <p className="text-sm text-gray-500 mb-4">
          Opcional. Si no se indica, se usará la dirección de la ubicación asignada.
        </p>
        
        <FormField label="Dirección" error={errors.direccion_correspondencia?.message}>
          <Input
            {...register('direccion_correspondencia')}
            placeholder="C/ Ejemplo, 123"
            error={errors.direccion_correspondencia}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <FormField label="Código Postal" error={errors.cp_correspondencia?.message}>
            <Input
              {...register('cp_correspondencia')}
              placeholder="28001"
              maxLength={5}
              error={errors.cp_correspondencia}
            />
          </FormField>

          <FormField label="Ciudad" error={errors.ciudad_correspondencia?.message}>
            <Input
              {...register('ciudad_correspondencia')}
              placeholder="Madrid"
              error={errors.ciudad_correspondencia}
            />
          </FormField>

          <FormField label="Provincia" error={errors.provincia_correspondencia?.message}>
            <Input
              {...register('provincia_correspondencia')}
              placeholder="Madrid"
              error={errors.provincia_correspondencia}
            />
          </FormField>
        </div>
      </div>

      {/* Datos bancarios */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Datos Bancarios</h3>
        <p className="text-sm text-gray-500 mb-4">
          Para domiciliación de recibos SEPA.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField 
            label="IBAN" 
            error={errors.iban?.message}
            description="Formato: ES00 0000 0000 0000 0000 0000"
          >
            <Input
              {...register('iban')}
              onChange={handleIBANChange}
              placeholder="ES0000000000000000000000"
              className="uppercase font-mono"
              maxLength={24}
              error={errors.iban}
            />
          </FormField>

          <FormField label="Titular de la cuenta" error={errors.titular_cuenta?.message}>
            <Input
              {...register('titular_cuenta')}
              placeholder="Nombre del titular"
              error={errors.titular_cuenta}
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
            placeholder="Notas adicionales sobre el cliente..."
            error={errors.observaciones}
          />
        </FormField>
      </div>

      {/* Botones */}
      <div className="border-t pt-6 flex justify-end gap-3">
        <Button type="submit" loading={loading}>
          {cliente ? 'Guardar cambios' : 'Crear cliente'}
        </Button>
      </div>
    </form>
  )
}






