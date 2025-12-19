/**
 * Componente FileDropzone para arrastrar y soltar archivos Excel
 * Sistema de Facturación A360
 */

import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileSpreadsheet, X } from 'lucide-react'

export function FileDropzone({ onFileSelect, selectedFile, onClear, disabled = false }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled
  })

  // Si ya hay un archivo seleccionado, mostrar info del archivo
  if (selectedFile) {
    return (
      <div className="border-2 border-dashed border-green-300 rounded-lg p-6 bg-green-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileSpreadsheet className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">{selectedFile.name}</p>
              <p className="text-sm text-green-600">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
            className="p-2 hover:bg-green-200 rounded-lg transition-colors"
            title="Quitar archivo"
          >
            <X className="w-5 h-5 text-green-600" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive && !isDragReject 
          ? 'border-primary-500 bg-primary-50' 
          : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }
        ${isDragReject ? 'border-red-500 bg-red-50' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center gap-3">
        <div className={`
          p-4 rounded-full 
          ${isDragActive ? 'bg-primary-100' : 'bg-gray-100'}
          ${isDragReject ? 'bg-red-100' : ''}
        `}>
          <Upload className={`
            w-8 h-8 
            ${isDragActive ? 'text-primary-600' : 'text-gray-400'}
            ${isDragReject ? 'text-red-500' : ''}
          `} />
        </div>
        
        {isDragReject ? (
          <div>
            <p className="font-medium text-red-600">Archivo no válido</p>
            <p className="text-sm text-red-500">Solo se aceptan archivos .xlsx y .xls</p>
          </div>
        ) : isDragActive ? (
          <p className="font-medium text-primary-600">Suelta el archivo aquí...</p>
        ) : (
          <div>
            <p className="font-medium text-gray-700">
              Arrastra el archivo Excel aquí
            </p>
            <p className="text-sm text-gray-500 mt-1">
              o haz clic para seleccionar
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Formatos aceptados: .xlsx, .xls
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FileDropzone
