import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Componente para arrastrar y soltar archivos Excel
 */
export function FileDropzone({ 
  onFileSelect, 
  file, 
  onClear,
  accept = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls']
  },
  disabled = false
}) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    disabled
  })

  if (file) {
    return (
      <div className="border-2 border-green-300 bg-green-50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <File className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
        'hover:border-blue-400 hover:bg-blue-50/50',
        isDragActive && 'border-blue-500 bg-blue-50',
        isDragReject && 'border-red-500 bg-red-50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center gap-4">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
          isDragActive ? 'bg-blue-100' : 'bg-gray-100'
        )}>
          <Upload className={cn(
            'w-8 h-8',
            isDragActive ? 'text-blue-600' : 'text-gray-400'
          )} />
        </div>
        
        <div>
          {isDragActive ? (
            <p className="text-lg font-medium text-blue-600">Suelta el archivo aquí</p>
          ) : isDragReject ? (
            <p className="text-lg font-medium text-red-600">Formato no válido</p>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-700">
                Arrastra el archivo Excel aquí
              </p>
              <p className="text-sm text-gray-500 mt-1">
                o haz clic para seleccionar
              </p>
            </>
          )}
        </div>
        
        <p className="text-xs text-gray-400">
          Formatos aceptados: .xlsx, .xls
        </p>
      </div>
    </div>
  )
}

