import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/features/auth/AuthContext'
import { Button, Input, FormField, Card, CardContent } from '@/components/ui'
import { Zap, AlertCircle } from 'lucide-react'

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
        // Mostrar mensaje de verificación si es necesario
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 px-4">
      {/* Patrón de fondo */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <Zap className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">A360 Facturación</h1>
          <p className="mt-2 text-primary-200">Sistema de Gestión Energética</p>
        </div>

        {/* Card de login */}
        <Card className="shadow-2xl">
          <CardContent className="p-8">
            <h2 className="text-xl font-semibold text-gray-900 text-center mb-6">
              {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
            </h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {isRegister && (
                <FormField 
                  label="Nombre completo" 
                  error={errors.nombreCompleto?.message}
                  required
                >
                  <Input
                    {...register('nombreCompleto')}
                    placeholder="Tu nombre completo"
                    error={errors.nombreCompleto}
                  />
                </FormField>
              )}

              <FormField 
                label="Email" 
                error={errors.email?.message}
                required
              >
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="tu@email.com"
                  error={errors.email}
                />
              </FormField>

              <FormField 
                label="Contraseña" 
                error={errors.password?.message}
                required
              >
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  error={errors.password}
                />
              </FormField>

              {isRegister && (
                <FormField 
                  label="Confirmar contraseña" 
                  error={errors.confirmPassword?.message}
                  required
                >
                  <Input
                    {...register('confirmPassword')}
                    type="password"
                    placeholder="••••••••"
                    error={errors.confirmPassword}
                  />
                </FormField>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                loading={loading}
              >
                {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {isRegister 
                  ? '¿Ya tienes cuenta? Inicia sesión' 
                  : '¿No tienes cuenta? Regístrate'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-primary-200">
          © 2025 A360 Servicios Energéticos S.L.
        </p>
      </div>
    </div>
  )
}




