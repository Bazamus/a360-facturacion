import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export const Checkbox = forwardRef(
  ({ className, label, error, ...props }, ref) => {
    return (
      <label className={cn('flex items-center gap-2 cursor-pointer', className)}>
        <div className="relative">
          <input
            type="checkbox"
            ref={ref}
            className={cn(
              'peer h-5 w-5 shrink-0 rounded border border-gray-300',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'checked:bg-primary-600 checked:border-primary-600',
              'appearance-none cursor-pointer',
              error && 'border-red-300 focus:ring-red-500'
            )}
            {...props}
          />
          <Check 
            className="absolute top-0.5 left-0.5 h-4 w-4 text-white pointer-events-none hidden peer-checked:block" 
          />
        </div>
        {label && (
          <span className="text-sm text-gray-700 select-none">{label}</span>
        )}
      </label>
    )
  }
)

Checkbox.displayName = 'Checkbox'




