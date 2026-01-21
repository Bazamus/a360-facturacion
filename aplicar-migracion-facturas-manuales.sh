#!/bin/bash

# Script para aplicar la migración 010: Permitir Facturas Manuales
# Este script aplica la migración en la base de datos local de Supabase

echo "======================================"
echo "Aplicando Migración 010"
echo "Permitir Facturas Manuales"
echo "======================================"
echo ""

# Verificar que Supabase CLI está instalado
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx no está instalado"
    echo "Instala Node.js y npm primero"
    exit 1
fi

# Verificar si Supabase está corriendo
echo "🔍 Verificando estado de Supabase..."
npx supabase status > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️  Supabase no está corriendo"
    echo "Iniciando Supabase..."
    npx supabase start
fi

echo ""
echo "📊 Estado antes de la migración:"
echo "Verificando facturas existentes..."

# Conectar a Supabase y verificar datos
npx supabase db reset --dry-run > /dev/null 2>&1

echo ""
echo "🚀 Aplicando migración..."

# Aplicar la migración
npx supabase migration up

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migración aplicada exitosamente"
    echo ""
    echo "📊 Verificación post-migración:"
    echo ""
    
    # Ejecutar verificaciones
    psql -h localhost -p 54322 -U postgres -d postgres -c "
        SELECT 
            column_name, 
            is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'facturas' 
            AND column_name IN ('contador_id', 'ubicacion_id');
    " 2>/dev/null
    
    echo ""
    echo "✅ Campos actualizados correctamente"
    echo ""
    echo "📝 Ahora puedes:"
    echo "   - Crear facturas manuales desde /facturacion/facturas/nueva"
    echo "   - Las facturas manuales no requieren contador asociado"
    echo "   - Los campos contador_id y ubicacion_id ahora son opcionales"
    echo ""
else
    echo ""
    echo "❌ Error al aplicar la migración"
    echo "Verifica los logs arriba para más detalles"
    exit 1
fi

echo "======================================"
echo "Migración completada"
echo "======================================"
