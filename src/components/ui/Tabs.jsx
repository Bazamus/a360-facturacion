import { useState, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

const TabsContext = createContext({})

export function Tabs({ defaultValue, value, onValueChange, children, className }) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  
  const currentValue = value ?? internalValue
  const handleChange = onValueChange ?? setInternalValue

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleChange }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }) {
  return (
    <div 
      className={cn(
        'flex border-b border-gray-200 mb-4',
        className
      )}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, className, disabled }) {
  const { value: currentValue, onValueChange } = useContext(TabsContext)
  const isActive = currentValue === value

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={cn(
        'px-4 py-2.5 text-sm font-medium transition-colors relative',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isActive
          ? 'text-primary-600'
          : 'text-gray-500 hover:text-gray-700',
        className
      )}
    >
      {children}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600" />
      )}
    </button>
  )
}

export function TabsContent({ value, children, className }) {
  const { value: currentValue } = useContext(TabsContext)
  
  if (currentValue !== value) return null

  return (
    <div className={className}>
      {children}
    </div>
  )
}




