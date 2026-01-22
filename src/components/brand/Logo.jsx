import { cn } from '@/lib/utils'
import logoFull from '@/assets/brand/logo-full.jpg'

/**
 * Componente Logo de A360 Servicios Energéticos
 *
 * @param {Object} props
 * @param {'full'|'icon'|'sidebar'} props.variant - Variante del logo
 * @param {'sm'|'md'|'lg'|'xl'} props.size - Tamaño del logo
 * @param {'light'|'dark'} props.theme - Tema del logo
 * @param {string} props.className - Clases adicionales
 */
export function Logo({
  variant = 'full',
  size = 'md',
  theme = 'light',
  className
}) {
  const sizes = {
    sm: {
      full: 'h-8',
      icon: 'h-8 w-8',
      sidebar: 'h-10 w-10',
    },
    md: {
      full: 'h-12',
      icon: 'h-12 w-12',
      sidebar: 'h-12 w-12',
    },
    lg: {
      full: 'h-20',
      icon: 'h-16 w-16',
      sidebar: 'h-14 w-14',
    },
    xl: {
      full: 'h-32',
      icon: 'h-24 w-24',
      sidebar: 'h-16 w-16',
    }
  }

  // Variante full: Logo completo como imagen
  if (variant === 'full') {
    return (
      <img
        src={logoFull}
        alt="A360 Servicios Energéticos"
        className={cn(
          'object-contain',
          sizes[size].full,
          className
        )}
      />
    )
  }

  // Variante icon: Solo el ícono circular
  if (variant === 'icon') {
    return (
      <div className={cn(
        'relative overflow-hidden rounded-full flex items-center justify-center',
        sizes[size].icon,
        className
      )}>
        <img
          src={logoFull}
          alt="A360"
          className="object-cover w-full h-full"
        />
      </div>
    )
  }

  // Variante sidebar: Icono + texto optimizado
  if (variant === 'sidebar') {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        {/* Logo circular con efecto de gradiente */}
        <div className={cn(
          'relative flex items-center justify-center rounded-xl overflow-hidden',
          'bg-gradient-to-br from-primary-400 to-primary-600',
          'shadow-lg shadow-primary-500/20',
          sizes[size].sidebar
        )}>
          <img
            src={logoFull}
            alt="A360"
            className="object-cover w-full h-full rounded-xl"
          />
        </div>

        {/* Texto A360 */}
        <div className={cn(
          'flex flex-col',
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        )}>
          <span className="text-xl font-bold leading-none font-display">A360</span>
          <span className={cn(
            'text-xs leading-none mt-0.5',
            theme === 'dark' ? 'text-primary-200' : 'text-primary-600'
          )}>
            Facturación
          </span>
        </div>
      </div>
    )
  }

  return null
}
