import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { clienteSchema } from '@/lib/validations'
import { Button, Input, Select, FormField, Textarea, Checkbox } from '@/components/ui'
import { formatIBAN } from '@/lib/utils'

export function ClienteForm({ cliente, onSubmit, loading }) {
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

  // Formatear IBAN mientras se escribe
  const handleIBANChange = (e) => {
    let value = e.target.value.replace(/\s/g, '').toUpperCase()
    if (value.length > 24) value = value.slice(0, 24)
    setValue('iban', value)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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






