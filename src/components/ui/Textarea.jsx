import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Textarea = forwardRef(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'block w-full px-3 py-2 text-sm border rounded-lg shadow-sm',
          'placeholder-gray-400 transition-colors resize-none',
          'focus:outline-none focus:ring-2 focus:border-transparent',
          'disabled:bg-gray-100 disabled:cursor-not-allowed',
          error
            ? 'border-red-300 focus:ring-red-500'
            : 'border-gray-300 focus:ring-primary-500',
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'


