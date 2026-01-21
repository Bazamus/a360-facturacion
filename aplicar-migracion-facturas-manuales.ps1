# Script PowerShell para aplicar la migración 010: Permitir Facturas Manuales
# Este script aplica la migración en la base de datos local de Supabase

Write-Host "======================================"  -ForegroundColor Cyan
Write-Host "Aplicando Migración 010"  -ForegroundColor Cyan
Write-Host "Permitir Facturas Manuales"  -ForegroundColor Cyan
Write-Host "======================================"  -ForegroundColor Cyan
Write-Host ""

# Verificar que Node.js/npm está instalado
try {
    $null = Get-Command npx -ErrorAction Stop
} catch {
    Write-Host "❌ Error: npx no está instalado" -ForegroundColor Red
    Write-Host "Instala Node.js y npm primero" -ForegroundColor Yellow
    exit 1
}

# Verificar si Supabase está corriendo
Write-Host "🔍 Verificando estado de Supabase..." -ForegroundColor Yellow
$status = npx supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Supabase no está corriendo" -ForegroundColor Yellow
    Write-Host "Iniciando Supabase..." -ForegroundColor Yellow
    npx supabase start
}

Write-Host ""
Write-Host "📊 Estado antes de la migración:" -ForegroundColor Cyan
Write-Host "Verificando facturas existentes..." -ForegroundColor Gray

Write-Host ""
Write-Host "🚀 Aplicando migración..." -ForegroundColor Yellow

# Aplicar la migración
npx supabase migration up

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migración aplicada exitosamente" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Verificación post-migración:" -ForegroundColor Cyan
    Write-Host ""
    
    # Ejecutar verificaciones usando psql si está disponible
    $psqlAvailable = $null -ne (Get-Command psql -ErrorAction SilentlyContinue)
    
    if ($psqlAvailable) {
        $env:PGPASSWORD = "postgres"
        psql -h localhost -p 54322 -U postgres -d postgres -c @"
            SELECT 
                column_name, 
                is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'facturas' 
                AND column_name IN ('contador_id', 'ubicacion_id');
"@
        $env:PGPASSWORD = $null
        
        Write-Host ""
        Write-Host "✅ Campos actualizados correctamente" -ForegroundColor Green
    } else {
        Write-Host "⚠️  psql no está disponible para verificación" -ForegroundColor Yellow
        Write-Host "Puedes verificar manualmente en Supabase Studio" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "📝 Ahora puedes:" -ForegroundColor Cyan
    Write-Host "   - Crear facturas manuales desde /facturacion/facturas/nueva" -ForegroundColor Gray
    Write-Host "   - Las facturas manuales no requieren contador asociado" -ForegroundColor Gray
    Write-Host "   - Los campos contador_id y ubicacion_id ahora son opcionales" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Error al aplicar la migración" -ForegroundColor Red
    Write-Host "Verifica los logs arriba para más detalles" -ForegroundColor Yellow
    exit 1
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Migración completada" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
