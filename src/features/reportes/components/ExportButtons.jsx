import { FileSpreadsheet, FileText, Download } from 'lucide-react'
import { Button } from '../../../components/ui'

export function ExportButtons({ 
  onExportExcel, 
  onExportCSV, 
  onExportPDF,
  isLoading = false,
  disabled = false 
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onExportExcel}
        disabled={disabled || isLoading}
        className="gap-1"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Excel
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onExportCSV}
        disabled={disabled || isLoading}
        className="gap-1"
      >
        <FileText className="w-4 h-4" />
        CSV
      </Button>
      
      {onExportPDF && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExportPDF}
          disabled={disabled || isLoading}
          className="gap-1"
        >
          <Download className="w-4 h-4" />
          PDF
        </Button>
      )}
    </div>
  )
}



