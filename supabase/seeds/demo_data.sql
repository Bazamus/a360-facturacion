-- =====================================================
-- Datos de Demostración - Sistema A360 Facturación
-- Ejecutar después de las migraciones
-- =====================================================

-- =====================================================
-- 1. CONCEPTOS DE FACTURACIÓN
-- =====================================================

INSERT INTO conceptos (id, codigo, nombre, descripcion, tipo, unidad_medida, activo) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'ACS', 'Agua Caliente Sanitaria', 'Consumo de agua caliente sanitaria', 'variable', 'm³', true),
  ('c0000001-0000-0000-0000-000000000002', 'CAL', 'Calefacción', 'Consumo de calefacción', 'variable', 'kWh', true),
  ('c0000001-0000-0000-0000-000000000003', 'CLI', 'Climatización', 'Consumo de climatización (frío/calor)', 'variable', 'kWh', true),
  ('c0000001-0000-0000-0000-000000000004', 'TF', 'Término Fijo', 'Cuota fija mensual por disponibilidad del servicio', 'fijo', '€/mes', true)
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- 2. COMUNIDAD DE DEMOSTRACIÓN: "Residencial Troya 40"
-- =====================================================

INSERT INTO comunidades (id, codigo, nombre, direccion, codigo_postal, ciudad, provincia, cif, nombre_agrupacion, nombre_ubicacion, activa) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'TROYA40', 'Residencial Troya 40', 'Calle Troya, 40', '28001', 'Madrid', 'Madrid', 'H12345678', 'Portal', 'Vivienda', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. AGRUPACIONES (PORTALES)
-- =====================================================

INSERT INTO agrupaciones (id, comunidad_id, nombre, descripcion, orden, activa) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'Portal 1', 'Portal principal', 1, true),
  ('a0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000001', 'Portal 2', 'Portal secundario', 2, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. UBICACIONES (VIVIENDAS)
-- Portal 1: 4 viviendas (1ºA, 1ºB, 2ºA, 2ºB)
-- Portal 2: 4 viviendas (1ºA, 1ºB, 2ºA, 2ºB)
-- =====================================================

-- Portal 1
INSERT INTO ubicaciones (id, agrupacion_id, nombre, descripcion, orden, activa) VALUES
  ('u0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', '1ºA', 'Primero A', 1, true),
  ('u0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', '1ºB', 'Primero B', 2, true),
  ('u0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', '2ºA', 'Segundo A', 3, true),
  ('u0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', '2ºB', 'Segundo B', 4, true)
ON CONFLICT DO NOTHING;

-- Portal 2
INSERT INTO ubicaciones (id, agrupacion_id, nombre, descripcion, orden, activa) VALUES
  ('u0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000002', '1ºA', 'Primero A', 1, true),
  ('u0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000002', '1ºB', 'Primero B', 2, true),
  ('u0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000002', '2ºA', 'Segundo A', 3, true),
  ('u0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000002', '2ºB', 'Segundo B', 4, true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. CLIENTES
-- =====================================================

INSERT INTO clientes (id, tipo, nif, nombre, apellidos, email, telefono, direccion_fiscal, codigo_postal, ciudad, provincia, activo) VALUES
  -- Portal 1
  ('cl000001-0000-0000-0000-000000000001', 'propietario', '12345678A', 'María', 'García López', 'maria.garcia@email.com', '612345678', 'Calle Troya, 40 - 1ºA', '28001', 'Madrid', 'Madrid', true),
  ('cl000001-0000-0000-0000-000000000002', 'propietario', '23456789B', 'Juan', 'Martínez Ruiz', 'juan.martinez@email.com', '623456789', 'Calle Troya, 40 - 1ºB', '28001', 'Madrid', 'Madrid', true),
  ('cl000001-0000-0000-0000-000000000003', 'inquilino', '34567890C', 'Ana', 'López Fernández', 'ana.lopez@email.com', '634567890', 'Calle Troya, 40 - 2ºA', '28001', 'Madrid', 'Madrid', true),
  ('cl000001-0000-0000-0000-000000000004', 'propietario', '45678901D', 'Pedro', 'Sánchez García', 'pedro.sanchez@email.com', '645678901', 'Calle Troya, 40 - 2ºB', '28001', 'Madrid', 'Madrid', true),
  -- Portal 2
  ('cl000001-0000-0000-0000-000000000005', 'propietario', '56789012E', 'Laura', 'Fernández Díaz', 'laura.fernandez@email.com', '656789012', 'Calle Troya, 40 - Portal 2 1ºA', '28001', 'Madrid', 'Madrid', true),
  ('cl000001-0000-0000-0000-000000000006', 'inquilino', '67890123F', 'Carlos', 'Díaz Moreno', 'carlos.diaz@email.com', '667890123', 'Calle Troya, 40 - Portal 2 1ºB', '28001', 'Madrid', 'Madrid', true),
  ('cl000001-0000-0000-0000-000000000007', 'propietario', '78901234G', 'Elena', 'Moreno Castro', 'elena.moreno@email.com', '678901234', 'Calle Troya, 40 - Portal 2 2ºA', '28001', 'Madrid', 'Madrid', true),
  ('cl000001-0000-0000-0000-000000000008', 'propietario', '89012345H', 'Miguel', 'Castro Navarro', 'miguel.castro@email.com', '689012345', 'Calle Troya, 40 - Portal 2 2ºB', '28001', 'Madrid', 'Madrid', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. ASIGNACIÓN DE CLIENTES A UBICACIONES
-- =====================================================

INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual) VALUES
  -- Portal 1
  ('u0000001-0000-0000-0000-000000000001', 'cl000001-0000-0000-0000-000000000001', '2024-01-01', true),
  ('u0000001-0000-0000-0000-000000000002', 'cl000001-0000-0000-0000-000000000002', '2024-01-01', true),
  ('u0000001-0000-0000-0000-000000000003', 'cl000001-0000-0000-0000-000000000003', '2024-06-01', true),
  ('u0000001-0000-0000-0000-000000000004', 'cl000001-0000-0000-0000-000000000004', '2024-01-01', true),
  -- Portal 2
  ('u0000001-0000-0000-0000-000000000005', 'cl000001-0000-0000-0000-000000000005', '2024-01-01', true),
  ('u0000001-0000-0000-0000-000000000006', 'cl000001-0000-0000-0000-000000000006', '2024-03-15', true),
  ('u0000001-0000-0000-0000-000000000007', 'cl000001-0000-0000-0000-000000000007', '2024-01-01', true),
  ('u0000001-0000-0000-0000-000000000008', 'cl000001-0000-0000-0000-000000000008', '2024-01-01', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. CONTADORES
-- Números de serie realistas (8 dígitos)
-- =====================================================

INSERT INTO contadores (id, ubicacion_id, numero_serie, marca, modelo, activo) VALUES
  -- Portal 1
  ('co000001-0000-0000-0000-000000000001', 'u0000001-0000-0000-0000-000000000001', '22804101', 'Zenner', 'Multidata WR3', true),
  ('co000001-0000-0000-0000-000000000002', 'u0000001-0000-0000-0000-000000000002', '22804102', 'Zenner', 'Multidata WR3', true),
  ('co000001-0000-0000-0000-000000000003', 'u0000001-0000-0000-0000-000000000003', '22804103', 'Zenner', 'Multidata WR3', true),
  ('co000001-0000-0000-0000-000000000004', 'u0000001-0000-0000-0000-000000000004', '22804104', 'Zenner', 'Multidata WR3', true),
  -- Portal 2
  ('co000001-0000-0000-0000-000000000005', 'u0000001-0000-0000-0000-000000000005', '22804201', 'Zenner', 'Multidata WR3', true),
  ('co000001-0000-0000-0000-000000000006', 'u0000001-0000-0000-0000-000000000006', '22804202', 'Zenner', 'Multidata WR3', true),
  ('co000001-0000-0000-0000-000000000007', 'u0000001-0000-0000-0000-000000000007', '22804203', 'Zenner', 'Multidata WR3', true),
  ('co000001-0000-0000-0000-000000000008', 'u0000001-0000-0000-0000-000000000008', '22804204', 'Zenner', 'Multidata WR3', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. ASIGNACIÓN DE CONCEPTOS A CONTADORES
-- Cada contador mide ACS y Calefacción
-- =====================================================

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, activo) VALUES
  -- Portal 1 - ACS
  ('co000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 100.0000, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 85.5000, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 120.2500, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 95.0000, '2024-01-01', true),
  -- Portal 1 - Calefacción
  ('co000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 5000.00, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 4500.00, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 5200.00, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000002', 4800.00, '2024-01-01', true),
  -- Portal 2 - ACS
  ('co000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000001', 110.0000, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000001', 92.7500, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000001', 105.5000, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000001', 88.0000, '2024-01-01', true),
  -- Portal 2 - Calefacción
  ('co000001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000002', 5100.00, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000002', 4700.00, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000002', 4900.00, '2024-01-01', true),
  ('co000001-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000002', 5300.00, '2024-01-01', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 9. PRECIOS VIGENTES
-- =====================================================

INSERT INTO precios (comunidad_id, concepto_id, precio_unitario, fecha_inicio, vigente) VALUES
  -- ACS: 6.45 €/m³
  ('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 6.4500, '2024-01-01', true),
  -- Calefacción: 0.085 €/kWh
  ('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 0.0850, '2024-01-01', true),
  -- Término Fijo: 15 €/mes
  ('d0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000004', 15.0000, '2024-01-01', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 10. LECTURAS HISTÓRICAS (últimos 3 meses)
-- Para que el sistema pueda calcular medias y detectar alertas
-- =====================================================

-- Octubre 2024
INSERT INTO lecturas (contador_id, concepto_id, cliente_id, lectura_valor, fecha_lectura, lectura_anterior, fecha_lectura_anterior, consumo, facturada) VALUES
  -- Portal 1 - ACS (Octubre)
  ('co000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'cl000001-0000-0000-0000-000000000001', 102.5000, '2024-10-15', 100.0000, '2024-01-01', 2.5000, true),
  ('co000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'cl000001-0000-0000-0000-000000000002', 88.2500, '2024-10-15', 85.5000, '2024-01-01', 2.7500, true),
  ('co000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'cl000001-0000-0000-0000-000000000003', 122.5000, '2024-10-15', 120.2500, '2024-01-01', 2.2500, true),
  ('co000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'cl000001-0000-0000-0000-000000000004', 97.8000, '2024-10-15', 95.0000, '2024-01-01', 2.8000, true),
  -- Portal 1 - Calefacción (Octubre)
  ('co000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'cl000001-0000-0000-0000-000000000001', 5150.00, '2024-10-15', 5000.00, '2024-01-01', 150.00, true),
  ('co000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'cl000001-0000-0000-0000-000000000002', 4620.00, '2024-10-15', 4500.00, '2024-01-01', 120.00, true),
  ('co000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 'cl000001-0000-0000-0000-000000000003', 5380.00, '2024-10-15', 5200.00, '2024-01-01', 180.00, true),
  ('co000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000002', 'cl000001-0000-0000-0000-000000000004', 4950.00, '2024-10-15', 4800.00, '2024-01-01', 150.00, true)
ON CONFLICT (contador_id, concepto_id, fecha_lectura) DO NOTHING;

-- Noviembre 2024
INSERT INTO lecturas (contador_id, concepto_id, cliente_id, lectura_valor, fecha_lectura, lectura_anterior, fecha_lectura_anterior, consumo, facturada) VALUES
  -- Portal 1 - ACS (Noviembre)
  ('co000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 'cl000001-0000-0000-0000-000000000001', 105.2000, '2024-11-15', 102.5000, '2024-10-15', 2.7000, true),
  ('co000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 'cl000001-0000-0000-0000-000000000002', 91.0000, '2024-11-15', 88.2500, '2024-10-15', 2.7500, true),
  ('co000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 'cl000001-0000-0000-0000-000000000003', 124.8000, '2024-11-15', 122.5000, '2024-10-15', 2.3000, true),
  ('co000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 'cl000001-0000-0000-0000-000000000004', 100.5000, '2024-11-15', 97.8000, '2024-10-15', 2.7000, true),
  -- Portal 1 - Calefacción (Noviembre)
  ('co000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 'cl000001-0000-0000-0000-000000000001', 5350.00, '2024-11-15', 5150.00, '2024-10-15', 200.00, true),
  ('co000001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 'cl000001-0000-0000-0000-000000000002', 4780.00, '2024-11-15', 4620.00, '2024-10-15', 160.00, true),
  ('co000001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 'cl000001-0000-0000-0000-000000000003', 5600.00, '2024-11-15', 5380.00, '2024-10-15', 220.00, true),
  ('co000001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000002', 'cl000001-0000-0000-0000-000000000004', 5150.00, '2024-11-15', 4950.00, '2024-10-15', 200.00, true)
ON CONFLICT (contador_id, concepto_id, fecha_lectura) DO NOTHING;

-- Actualizar lectura_actual en contadores_conceptos
UPDATE contadores_conceptos SET 
  lectura_actual = 105.2000, fecha_lectura_actual = '2024-11-15'
WHERE contador_id = 'co000001-0000-0000-0000-000000000001' AND concepto_id = 'c0000001-0000-0000-0000-000000000001';

UPDATE contadores_conceptos SET 
  lectura_actual = 91.0000, fecha_lectura_actual = '2024-11-15'
WHERE contador_id = 'co000001-0000-0000-0000-000000000002' AND concepto_id = 'c0000001-0000-0000-0000-000000000001';

UPDATE contadores_conceptos SET 
  lectura_actual = 124.8000, fecha_lectura_actual = '2024-11-15'
WHERE contador_id = 'co000001-0000-0000-0000-000000000003' AND concepto_id = 'c0000001-0000-0000-0000-000000000001';

UPDATE contadores_conceptos SET 
  lectura_actual = 100.5000, fecha_lectura_actual = '2024-11-15'
WHERE contador_id = 'co000001-0000-0000-0000-000000000004' AND concepto_id = 'c0000001-0000-0000-0000-000000000001';

UPDATE contadores_conceptos SET 
  lectura_actual = 5350.00, fecha_lectura_actual = '2024-11-15'
WHERE contador_id = 'co000001-0000-0000-0000-000000000001' AND concepto_id = 'c0000001-0000-0000-0000-000000000002';

UPDATE contadores_conceptos SET 
  lectura_actual = 4780.00, fecha_lectura_actual = '2024-11-15'
WHERE contador_id = 'co000001-0000-0000-0000-000000000002' AND concepto_id = 'c0000001-0000-0000-0000-000000000002';

UPDATE contadores_conceptos SET 
  lectura_actual = 5600.00, fecha_lectura_actual = '2024-11-15'
WHERE contador_id = 'co000001-0000-0000-0000-000000000003' AND concepto_id = 'c0000001-0000-0000-0000-000000000002';

UPDATE contadores_conceptos SET 
  lectura_actual = 5150.00, fecha_lectura_actual = '2024-11-15'
WHERE contador_id = 'co000001-0000-0000-0000-000000000004' AND concepto_id = 'c0000001-0000-0000-0000-000000000002';

-- =====================================================
-- RESUMEN DE DATOS CREADOS:
-- =====================================================
-- ✅ 4 Conceptos (ACS, Calefacción, Climatización, Término Fijo)
-- ✅ 1 Comunidad (Residencial Troya 40)
-- ✅ 2 Agrupaciones/Portales
-- ✅ 8 Ubicaciones/Viviendas
-- ✅ 8 Clientes
-- ✅ 8 Contadores con números de serie reales
-- ✅ 16 Contadores-Conceptos (cada contador mide ACS y CAL)
-- ✅ 3 Precios vigentes
-- ✅ Lecturas históricas de Octubre y Noviembre 2024
-- =====================================================

