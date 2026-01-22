import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/features/auth/AuthContext'
import { Button, Input, FormField } from '@/components/ui'
import { Logo } from '@/components/brand/Logo'
import { useEstadisticas } from '@/hooks/useEstadisticas'
import { AlertCircle, Mail, Lock, User, Building2, Users as UsersIcon, Zap } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres')
})

const registerSchema = loginSchema.extend({
  nombreCompleto: z.string().min(3, 'Mínimo 3 caracteres'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
})

export function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { estadisticas } = useEstadisticas()

  const from = location.state?.from?.pathname || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema)
  })

  const onSubmit = async (data) => {
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        await signUp(data.email, data.password, data.nombreCompleto)
        setError('')
        alert('Cuenta creada. Por favor, verifica tu email si es requerido.')
      } else {
        await signIn(data.email, data.password)
        navigate(from, { replace: true })
      }
    } catch (err) {
      console.error('Error de autenticación:', err)
      if (err.message.includes('Invalid login')) {
        setError('Email o contraseña incorrectos')
      } else if (err.message.includes('User already registered')) {
        setError('Este email ya está registrado')
      } else {
        setError(err.message || 'Error de autenticación')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsRegister(!isRegister)
    setError('')
    reset()
  }

  return (
    <div className="min-h-screen flex overflow-hidden bg-white">
      {/* Hero Visual - Lado Izquierdo */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-primary-600">
        {/* Patrón de círculos concéntricos */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border-2 border-white animate-pulse-glow" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border-2 border-white animate-pulse-glow" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border-2 border-white animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>

        {/* Orbe de gradiente decorativo */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />

        {/* Contenido del hero */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-white">
          {/* Logo prominente */}
          <div className="mb-8 animate-float">
            <Logo variant="full" size="xl" theme="dark" />
          </div>

          {/* Título y descripción */}
          <h1 className="text-4xl font-bold font-display text-center mb-4">
            Sistema de Gestión Energética
          </h1>
          <p className="text-xl text-primary-100 text-center mb-12 max-w-md">
            Gestiona la facturación energética de comunidades con precisión y eficiencia
          </p>

          {/* Estadísticas */}
          <div className="flex gap-12 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-3">
                <Building2 className="h-8 w-8 text-accent-300" />
              </div>
              <p className="text-3xl font-bold font-display">
                {estadisticas.comunidades.total || '...'}
              </p>
              <p className="text-sm text-primary-200">Comunidades</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-3">
                <UsersIcon className="h-8 w-8 text-accent-300" />
              </div>
              <p className="text-3xl font-bold font-display">
                {estadisticas.clientes.total.toLocaleString('es-ES') || '...'}
              </p>
              <p className="text-sm text-primary-200">Clientes</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-3">
                <Zap className="h-8 w-8 text-accent-300" />
              </div>
              <p className="text-3xl font-bold font-display">
                {estadisticas.contadores.total.toLocaleString('es-ES') || '...'}
              </p>
              <p className="text-sm text-primary-200">Contadores</p>
            </div>
          </div>

          {/* Elementos decorativos flotantes */}
          <div className="absolute top-20 right-20 w-2 h-2 bg-accent-300 rounded-full animate-float" />
          <div className="absolute bottom-32 left-20 w-3 h-3 bg-accent-400 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-1/3 left-32 w-2 h-2 bg-primary-300 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
        </div>
      </div>

      {/* Formulario - Lado Derecho */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block mb-4">
              <Logo variant="full" size="lg" theme="light" />
            </div>
            <h1 className="text-2xl font-bold font-display text-gray-900">
              Sistema de Gestión Energética
            </h1>
          </div>

          {/* Card del formulario */}
          <div className="bg-white rounded-2xl shadow-primary p-8 border border-gray-100">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-block mb-4">
                <Logo variant="icon" size="sm" theme="light" />
              </div>
              <h2 className="text-2xl font-bold font-display text-gray-900 mb-2">
                {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
              </h2>
              <p className="text-sm text-gray-500">
                {isRegister
                  ? 'Completa tus datos para comenzar'
                  : 'Accede a tu panel de facturación'}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm animate-in">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {isRegister && (
                <FormField
                  label="Nombre completo"
                  error={errors.nombreCompleto?.message}
                  required
                >
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400" />
                    <Input
                      {...register('nombreCompleto')}
                      placeholder="Tu nombre completo"
                      error={errors.nombreCompleto}
                      className="pl-10"
                    />
                  </div>
                </FormField>
              )}

              <FormField
                label="Email"
                error={errors.email?.message}
                required
              >
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400" />
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="davidrey@a360se.com"
                    error={errors.email}
                    className="pl-10"
                  />
                </div>
              </FormField>

              <FormField
                label="Contraseña"
                error={errors.password?.message}
                required
              >
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400" />
                  <Input
                    {...register('password')}
                    type="password"
                    placeholder="••••••••"
                    error={errors.password}
                    className="pl-10"
                  />
                </div>
              </FormField>

              {isRegister && (
                <FormField
                  label="Confirmar contraseña"
                  error={errors.confirmPassword?.message}
                  required
                >
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400" />
                    <Input
                      {...register('confirmPassword')}
                      type="password"
                      placeholder="••••••••"
                      error={errors.confirmPassword}
                      className="pl-10"
                    />
                  </div>
                </FormField>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:shadow-primary transition-all duration-300"
                loading={loading}
                size="lg"
              >
                {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
              </Button>
            </form>

            {/* Toggle mode */}
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                {isRegister
                  ? '¿Ya tienes cuenta? Inicia sesión'
                  : '¿No tienes cuenta? Regístrate'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <Logo variant="icon" size="sm" className="w-5 h-5" />
            © 2025 A360 Servicios Energéticos S.L.
          </p>
        </div>
      </div>
    </div>
  )
}






