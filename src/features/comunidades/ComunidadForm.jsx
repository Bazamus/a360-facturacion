import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { comunidadSchema } from '@/lib/validations'
import { Button, Input, Select, FormField, Textarea, SearchablePicker } from '@/components/ui'
import { PROVINCIAS } from '@/constants/provincias'

export function ComunidadForm({ comunidad, onSubmit, loading }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(comunidadSchema),
    defaultValues: {
      nombre: comunidad?.nombre || '',
      codigo: comunidad?.codigo || '',
      cif: comunidad?.cif || '',
      direccion: comunidad?.direccion || '',
      codigo_postal: comunidad?.codigo_postal || '',
      ciudad: comunidad?.ciudad || '',
      provincia: comunidad?.provincia || 'Madrid',
      nombre_agrupacion: comunidad?.nombre_agrupacion || 'Portal',
      nombre_ubicacion: comunidad?.nombre_ubicacion || 'Vivienda',
      email: comunidad?.email || '',
      telefono: comunidad?.telefono || '',
      persona_contacto: comunidad?.persona_contacto || ''
    }
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Datos básicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nombre" error={errors.nombre?.message} required>
          <Input
            {...register('nombre')}
            placeholder="Comunidad de Vecinos..."
            error={errors.nombre}
          />
        </FormField>

        <FormField label="Código" error={errors.codigo?.message} required>
          <Input
            {...register('codigo')}
            placeholder="TROYA40"
            className="uppercase"
            error={errors.codigo}
          />
        </FormField>
      </div>

      <FormField label="CIF" error={errors.cif?.message}>
        <Input
          {...register('cif')}
          placeholder="H12345678"
          className="uppercase"
          error={errors.cif}
        />
      </FormField>

      {/* Dirección */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Dirección</h3>
        
        <div className="space-y-4">
          <FormField label="Dirección" error={errors.direccion?.message} required>
            <Input
              {...register('direccion')}
              placeholder="C/ Ejemplo, 123"
              error={errors.direccion}
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Código Postal" error={errors.codigo_postal?.message} required>
              <Input
                {...register('codigo_postal')}
                placeholder="28001"
                maxLength={5}
                error={errors.codigo_postal}
              />
            </FormField>

            <FormField label="Ciudad" error={errors.ciudad?.message} required>
              <Input
                {...register('ciudad')}
                placeholder="Madrid"
                error={errors.ciudad}
              />
            </FormField>

            <FormField label="Provincia" error={errors.provincia?.message} required>
              <SearchablePicker
                value={watch('provincia') || ''}
                onChange={(v) => setValue('provincia', v)}
                options={PROVINCIAS.map((p) => ({ value: p, label: p }))}
                placeholder="Seleccionar provincia..."
                allowEmpty={false}
                modalTitle="Seleccionar provincia"
                searchPlaceholder="Buscar provincia..."
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Configuración de nomenclatura */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Nomenclatura</h3>
        <p className="text-sm text-gray-500 mb-4">
          Define cómo se nombrarán las agrupaciones y ubicaciones de esta comunidad.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Nombre de Agrupación" error={errors.nombre_agrupacion?.message}>
            <Select {...register('nombre_agrupacion')} error={errors.nombre_agrupacion}>
              <option value="Portal">Portal</option>
              <option value="Bloque">Bloque</option>
              <option value="Escalera">Escalera</option>
              <option value="Torre">Torre</option>
            </Select>
          </FormField>

          <FormField label="Nombre de Ubicación" error={errors.nombre_ubicacion?.message}>
            <Select {...register('nombre_ubicacion')} error={errors.nombre_ubicacion}>
              <option value="Vivienda">Vivienda</option>
              <option value="Piso">Piso</option>
              <option value="Local">Local</option>
            </Select>
          </FormField>
        </div>
      </div>

      {/* Contacto */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Contacto</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Email" error={errors.email?.message}>
            <Input
              {...register('email')}
              type="email"
              placeholder="comunidad@ejemplo.com"
              error={errors.email}
            />
          </FormField>

          <FormField label="Teléfono" error={errors.telefono?.message}>
            <Input
              {...register('telefono')}
              placeholder="91 234 56 78"
              error={errors.telefono}
            />
          </FormField>
        </div>

        <FormField label="Persona de contacto" error={errors.persona_contacto?.message} className="mt-4">
          <Input
            {...register('persona_contacto')}
            placeholder="Nombre del administrador o presidente"
            error={errors.persona_contacto}
          />
        </FormField>
      </div>

      {/* Botones */}
      <div className="border-t pt-6 flex justify-end gap-3">
        <Button type="submit" loading={loading}>
          {comunidad ? 'Guardar cambios' : 'Crear comunidad'}
        </Button>
      </div>
    </form>
  )
}






