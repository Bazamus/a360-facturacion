import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { FormField } from '@/components/ui/FormField'
import { ComunidadSelectorModal } from './ComunidadSelectorModal'

/**
 * Modal formulario para crear nuevo descuento
 */
export function DescuentoForm({
  open,
  onClose,
  onSubmit,
  comunidades = [],
  conceptos = [],
  loading
}) {
  const [form, setForm] = useState({
    comunidadId: '',
    conceptoId: '',
    porcentaje: '',
    motivo: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: ''
  })
  const [errors, setErrors] = useState({})

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }))
  }

  const validate = () => {
    const errs = {}
    if (!form.comunidadId) errs.comunidadId = 'Selecciona una comunidad'
    if (!form.conceptoId) errs.conceptoId = 'Selecciona un concepto'
    if (!form.porcentaje || parseFloat(form.porcentaje) <= 0 || parseFloat(form.porcentaje) > 100) {
      errs.porcentaje = 'Porcentaje debe ser entre 0.01 y 100'
    }
    if (!form.fechaInicio) errs.fechaInicio = 'Fecha inicio requerida'
    if (!form.fechaFin) errs.fechaFin = 'Fecha fin requerida'
    if (form.fechaInicio && form.fechaFin && form.fechaFin < form.fechaInicio) {
      errs.fechaFin = 'Fecha fin debe ser posterior a fecha inicio'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    onSubmit({
      comunidadId: form.comunidadId,
      conceptoId: form.conceptoId,
      porcentaje: parseFloat(form.porcentaje),
      motivo: form.motivo || null,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin
    })
  }

  const handleClose = () => {
    setForm({
      comunidadId: '',
      conceptoId: '',
      porcentaje: '',
      motivo: '',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaFin: ''
    })
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nuevo descuento"
      description="Crear un descuento puntual por concepto y comunidad"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Crear descuento
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Comunidad" required error={errors.comunidadId}>
          <ComunidadSelectorModal
            comunidades={comunidades}
            selected={form.comunidadId}
            onChange={(id) => handleChange('comunidadId', id)}
            mode="single"
            placeholder="Seleccionar comunidad..."
          />
        </FormField>

        <FormField label="Concepto" required error={errors.conceptoId}>
          <Select
            value={form.conceptoId}
            onChange={(e) => handleChange('conceptoId', e.target.value)}
            error={!!errors.conceptoId}
          >
            <option value="">Seleccionar concepto...</option>
            {conceptos.map(c => (
              <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Porcentaje descuento (%)" required error={errors.porcentaje}>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max="100"
            placeholder="Ej: 25"
            value={form.porcentaje}
            onChange={(e) => handleChange('porcentaje', e.target.value)}
            error={!!errors.porcentaje}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Fecha inicio" required error={errors.fechaInicio}>
            <Input
              type="date"
              value={form.fechaInicio}
              onChange={(e) => handleChange('fechaInicio', e.target.value)}
              error={!!errors.fechaInicio}
            />
          </FormField>

          <FormField label="Fecha fin (expiración)" required error={errors.fechaFin}>
            <Input
              type="date"
              value={form.fechaFin}
              onChange={(e) => handleChange('fechaFin', e.target.value)}
              error={!!errors.fechaFin}
            />
          </FormField>
        </div>

        <FormField label="Motivo" description="Descripción opcional del descuento">
          <Textarea
            rows={3}
            placeholder="Ej: Descuento por avería prolongada..."
            value={form.motivo}
            onChange={(e) => handleChange('motivo', e.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  )
}
