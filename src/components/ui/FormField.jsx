import { cn } from '@/lib/utils'

export function FormField({ 
  label, 
  error, 
  required, 
  description,
  className,
  children 
}) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {description && !error && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}






