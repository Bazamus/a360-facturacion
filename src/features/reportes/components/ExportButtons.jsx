import { useState } from 'react'
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react'
import { Button } from '../../../components/ui'

export function ExportButtons({ 
  onExportExcel, 
  onExportCSV, 
  onExportPDF,
  isLoading = false,
  disabled = false,
  showPDF = true
}) {
  const [exportingPDF, setExportingPDF] = useState(false)

  const handlePDFClick = async () => {
    if (!onExportPDF) return
    setExportingPDF(true)
    try {
      await onExportPDF()
    } finally {
      setExportingPDF(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onExportExcel}
        disabled={disabled || isLoading || exportingPDF}
        className="gap-1"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-4 h-4" />
        )}
        Excel
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onExportCSV}
        disabled={disabled || isLoading || exportingPDF}
        className="gap-1"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        CSV
      </Button>
      
      {showPDF && onExportPDF && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePDFClick}
          disabled={disabled || isLoading || exportingPDF}
          className="gap-1"
        >
          {exportingPDF ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          PDF
        </Button>
      )}
    </div>
  )
}



