import { z } from 'zod'

// =====================================================
// Esquemas de validación Zod
// =====================================================

// Comunidad
export const comunidadSchema = z.object({
  nombre: z.string()
    .min(3, 'Mínimo 3 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  codigo: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(20, 'Máximo 20 caracteres')
    .regex(/^[A-Z0-9]+$/, 'Solo mayúsculas y números'),
  cif: z.string()
    .regex(/^[A-Z]\d{8}$/, 'Formato CIF inválido')
    .optional()
    .or(z.literal('')),
  direccion: z.string()
    .min(5, 'Mínimo 5 caracteres')
    .max(200, 'Máximo 200 caracteres'),
  codigo_postal: z.string()
    .regex(/^\d{5}$/, 'Código postal inválido'),
  ciudad: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  provincia: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  nombre_agrupacion: z.enum(['Portal', 'Bloque', 'Escalera']),
  nombre_ubicacion: z.enum(['Vivienda', 'Piso', 'Local']),
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  telefono: z.string().max(20).optional().or(z.literal('')),
  persona_contacto: z.string().max(100).optional().or(z.literal('')),
})

// Agrupación
export const agrupacionSchema = z.object({
  comunidad_id: z.string().uuid('Debe seleccionar una comunidad'),
  nombre: z.string()
    .min(1, 'Nombre requerido')
    .max(50, 'Máximo 50 caracteres'),
  descripcion: z.string().max(200).optional().or(z.literal('')),
  orden: z.number().int().min(0).default(0),
})

// Ubicación
export const ubicacionSchema = z.object({
  agrupacion_id: z.string().uuid('Debe seleccionar una agrupación'),
  nombre: z.string()
    .min(1, 'Nombre requerido')
    .max(50, 'Máximo 50 caracteres'),
  descripcion: z.string().max(200).optional().or(z.literal('')),
  referencia_catastral: z.string().max(50).optional().or(z.literal('')),
  orden: z.number().int().min(0).default(0),
})

// Cliente
export const clienteSchema = z.object({
  nombre: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres'),
  apellidos: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  nif: z.string()
    .min(9, 'NIF/CIF requerido')
    .max(9, 'NIF/CIF inválido')
    .refine(val => validarNIFInterno(val), 'NIF/CIF inválido'),
  email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  telefono: z.string().max(20).optional().or(z.literal('')),
  telefono_secundario: z.string().max(20).optional().or(z.literal('')),
  direccion_correspondencia: z.string().max(200).optional().or(z.literal('')),
  cp_correspondencia: z.string()
    .regex(/^\d{5}$/, 'Código postal inválido')
    .optional()
    .or(z.literal('')),
  ciudad_correspondencia: z.string().max(100).optional().or(z.literal('')),
  provincia_correspondencia: z.string().max(100).optional().or(z.literal('')),
  iban: z.string()
    .refine(val => !val || validarIBANInterno(val), 'IBAN español inválido')
    .optional()
    .or(z.literal('')),
  titular_cuenta: z.string().max(100).optional().or(z.literal('')),
  tipo: z.enum(['propietario', 'inquilino']),
  codigo_cliente: z.string().max(20).optional().or(z.literal('')),
  observaciones: z.string().max(500).optional().or(z.literal('')),
})

// Contador
export const contadorSchema = z.object({
  ubicacion_id: z.string().uuid('Debe seleccionar una ubicación'),
  numero_serie: z.string()
    .min(5, 'Mínimo 5 caracteres')
    .max(50, 'Máximo 50 caracteres'),
  marca: z.string().max(50).optional().or(z.literal('')),
  modelo: z.string().max(50).optional().or(z.literal('')),
  fecha_instalacion: z.string().optional().or(z.literal('')),
  fecha_ultima_verificacion: z.string().optional().or(z.literal('')),
  observaciones: z.string().max(500).optional().or(z.literal('')),
})

// Contador-Concepto
export const contadorConceptoSchema = z.object({
  contador_id: z.string().uuid(),
  concepto_id: z.string().uuid('Debe seleccionar un concepto'),
  lectura_inicial: z.number().min(0, 'La lectura debe ser mayor o igual a 0'),
  fecha_lectura_inicial: z.string(),
})

// Precio
export const precioSchema = z.object({
  comunidad_id: z.string().uuid(),
  concepto_id: z.string().uuid('Debe seleccionar un concepto'),
  precio_unitario: z.number().positive('El precio debe ser mayor que 0'),
  fecha_inicio: z.string(),
})

// Asignación Cliente-Ubicación
export const asignacionClienteSchema = z.object({
  ubicacion_id: z.string().uuid('Debe seleccionar una ubicación'),
  cliente_id: z.string().uuid('Debe seleccionar un cliente'),
  fecha_inicio: z.string(),
  es_actual: z.boolean().default(true),
})

// =====================================================
// Funciones de validación internas
// =====================================================

function validarNIFInterno(nif) {
  if (!nif) return false
  nif = nif.toUpperCase().trim()
  
  // NIF personal: 8 dígitos + letra
  if (/^\d{8}[A-Z]$/.test(nif)) {
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
    const numero = parseInt(nif.slice(0, 8))
    return nif[8] === letras[numero % 23]
  }
  
  // CIF empresarial
  if (/^[ABCDEFGHJNPQRSUVW]\d{7}[A-J0-9]$/.test(nif)) {
    return true
  }
  
  // NIE extranjero
  if (/^[XYZ]\d{7}[A-Z]$/.test(nif)) {
    const niePrefix = { X: '0', Y: '1', Z: '2' }
    const converted = niePrefix[nif[0]] + nif.slice(1, 8)
    const letras = 'TRWAGMYFPDXBNJZSQVHLCKE'
    return nif[8] === letras[parseInt(converted) % 23]
  }
  
  return false
}

function validarIBANInterno(iban) {
  if (!iban) return true // Opcional
  
  iban = iban.replace(/\s/g, '').toUpperCase()
  
  if (!/^ES\d{22}$/.test(iban)) return false
  
  const reordenado = iban.slice(4) + iban.slice(0, 4)
  const numerico = reordenado.replace(/[A-Z]/g, c => c.charCodeAt(0) - 55)
  
  let remainder = 0
  for (let i = 0; i < numerico.length; i++) {
    remainder = (remainder * 10 + parseInt(numerico[i])) % 97
  }
  
  return remainder === 1
}




