import { Routes, Route } from 'react-router-dom'
import { FileInput, Upload } from 'lucide-react'
import { Button, Card, CardContent, EmptyState } from '@/components/ui'

export function LecturasPage() {
  return (
    <Routes>
      <Route index element={<LecturasHistorial />} />
      <Route path="importar" element={<ImportarLecturas />} />
      <Route path="validar/:id" element={<ValidarLecturas />} />
    </Routes>
  )
}

function LecturasHistorial() {
  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Lecturas</h1>
          <p className="page-description">
            Importación y validación de lecturas de contadores
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Importar Lecturas
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <EmptyState
            icon={FileInput}
            title="Sin importaciones"
            description="Aún no se han importado lecturas. Sube un archivo Excel para comenzar."
            action={
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Importar Lecturas
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  )
}

function ImportarLecturas() {
  return (
    <div>
      <h1 className="page-title">Importar Lecturas</h1>
      <p className="text-gray-500 mt-2">
        Sistema de importación - Por implementar en Fase 2
      </p>
    </div>
  )
}

function ValidarLecturas() {
  return (
    <div>
      <h1 className="page-title">Validar Lecturas</h1>
      <p className="text-gray-500 mt-2">
        Pantalla de validación - Por implementar en Fase 2
      </p>
    </div>
  )
}


