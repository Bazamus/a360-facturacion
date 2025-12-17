-- =====================================================
-- Datos de Demostración para A360 Facturación
-- Ejecutar después de las migraciones 001, 002 y 003
-- =====================================================

-- =====================================================
-- 1. CONCEPTOS (Tipos de consumo/servicio)
-- =====================================================

INSERT INTO conceptos (id, codigo, nombre, descripcion, unidad_medida, es_termino_fijo, activo, orden) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'ACS', 'Agua Caliente Sanitaria', 'Consumo de agua caliente para uso doméstico', 'm³', false, true, 1),
  ('c0000002-0000-0000-0000-000000000002', 'CAL', 'Calefacción', 'Consumo de calefacción central', 'kWh', false, true, 2),
  ('c0000003-0000-0000-0000-000000000003', 'CLI', 'Climatización', 'Consumo de aire acondicionado/climatización', 'kWh', false, true, 3),
  ('c0000004-0000-0000-0000-000000000004', 'TF', 'Término Fijo', 'Cuota fija mensual por servicios', '€/mes', true, true, 4)
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- 2. COMUNIDAD: Residencial Troya 40
-- =====================================================

INSERT INTO comunidades (id, codigo, nombre, cif, direccion, codigo_postal, ciudad, provincia, nombre_agrupacion, nombre_ubicacion, activa) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'TRO40', 'Residencial Troya 40', 'H12345678', 'Calle Troya 40', '28001', 'Madrid', 'Madrid', 'Portal', 'Vivienda', true)
ON CONFLICT (codigo) DO NOTHING;

-- Agrupaciones (Portales)
INSERT INTO agrupaciones (id, comunidad_id, nombre, descripcion, orden, activa) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'Portal 1', 'Portal principal', 1, true),
  ('b0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'Portal 2', 'Portal secundario', 2, true)
ON CONFLICT DO NOTHING;

-- Ubicaciones (Viviendas) - Portal 1
INSERT INTO ubicaciones (id, agrupacion_id, nombre, descripcion, orden, activa) VALUES
  ('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', '1ºA', 'Primero A', 1, true),
  ('d0000002-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000001', '1ºB', 'Primero B', 2, true),
  ('d0000003-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000001', '2ºA', 'Segundo A', 3, true),
  ('d0000004-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000001', '2ºB', 'Segundo B', 4, true)
ON CONFLICT DO NOTHING;

-- Ubicaciones (Viviendas) - Portal 2
INSERT INTO ubicaciones (id, agrupacion_id, nombre, descripcion, orden, activa) VALUES
  ('d0000005-0000-0000-0000-000000000005', 'b0000002-0000-0000-0000-000000000002', '1ºA', 'Primero A', 1, true),
  ('d0000006-0000-0000-0000-000000000006', 'b0000002-0000-0000-0000-000000000002', '1ºB', 'Primero B', 2, true),
  ('d0000007-0000-0000-0000-000000000007', 'b0000002-0000-0000-0000-000000000002', '2ºA', 'Segundo A', 3, true),
  ('d0000008-0000-0000-0000-000000000008', 'b0000002-0000-0000-0000-000000000002', '2ºB', 'Segundo B', 4, true)
ON CONFLICT DO NOTHING;

-- Precios para Troya 40
INSERT INTO precios (id, comunidad_id, concepto_id, precio_unitario, fecha_inicio, vigente) VALUES
  ('e0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 6.45, '2025-01-01', true),
  ('e0000002-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'c0000002-0000-0000-0000-000000000002', 0.085, '2025-01-01', true),
  ('e0000003-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'c0000004-0000-0000-0000-000000000004', 25.00, '2025-01-01', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. COMUNIDAD: Edificio Hermes 12
-- =====================================================

INSERT INTO comunidades (id, codigo, nombre, cif, direccion, codigo_postal, ciudad, provincia, nombre_agrupacion, nombre_ubicacion, activa) VALUES
  ('a0000002-0000-0000-0000-000000000002', 'HER12', 'Edificio Hermes 12', 'H87654321', 'Avenida Hermes 12', '28002', 'Madrid', 'Madrid', 'Escalera', 'Apartamento', true)
ON CONFLICT (codigo) DO NOTHING;

-- Agrupaciones (Escaleras)
INSERT INTO agrupaciones (id, comunidad_id, nombre, descripcion, orden, activa) VALUES
  ('b0000003-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000002', 'Escalera A', 'Escalera principal', 1, true)
ON CONFLICT DO NOTHING;

-- Ubicaciones (Apartamentos)
INSERT INTO ubicaciones (id, agrupacion_id, nombre, descripcion, orden, activa) VALUES
  ('d0000009-0000-0000-0000-000000000009', 'b0000003-0000-0000-0000-000000000003', 'Bajo A', 'Planta baja A', 1, true),
  ('d000000a-0000-0000-0000-00000000000a', 'b0000003-0000-0000-0000-000000000003', 'Bajo B', 'Planta baja B', 2, true),
  ('d000000b-0000-0000-0000-00000000000b', 'b0000003-0000-0000-0000-000000000003', '1º A', 'Primero A', 3, true),
  ('d000000c-0000-0000-0000-00000000000c', 'b0000003-0000-0000-0000-000000000003', '1º B', 'Primero B', 4, true)
ON CONFLICT DO NOTHING;

-- Precios para Hermes 12
INSERT INTO precios (id, comunidad_id, concepto_id, precio_unitario, fecha_inicio, vigente) VALUES
  ('e0000004-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 7.20, '2025-01-01', true),
  ('e0000005-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000002', 'c0000003-0000-0000-0000-000000000003', 0.095, '2025-01-01', true),
  ('e0000006-0000-0000-0000-000000000006', 'a0000002-0000-0000-0000-000000000002', 'c0000004-0000-0000-0000-000000000004', 30.00, '2025-01-01', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. CLIENTES
-- =====================================================

-- Clientes para Troya 40 - Portal 1
INSERT INTO clientes (id, tipo_cliente, nombre, apellidos, nif, email, telefono, direccion_fiscal, codigo_postal_fiscal, ciudad_fiscal, iban, activo) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'propietario', 'María', 'García López', '12345678A', 'maria.garcia@email.com', '600111222', 'Calle Troya 40, 1ºA', '28001', 'Madrid', 'ES9121000418450200051332', true),
  ('f0000002-0000-0000-0000-000000000002', 'propietario', 'Juan', 'Martínez Ruiz', '23456789B', 'juan.martinez@email.com', '600222333', 'Calle Troya 40, 1ºB', '28001', 'Madrid', 'ES7921000813610123456789', true),
  ('f0000003-0000-0000-0000-000000000003', 'inquilino', 'Ana', 'Sánchez Pérez', '34567890C', 'ana.sanchez@email.com', '600333444', 'Calle Troya 40, 2ºA', '28001', 'Madrid', NULL, true),
  ('f0000004-0000-0000-0000-000000000004', 'propietario', 'Carlos', 'López Hernández', '45678901D', 'carlos.lopez@email.com', '600444555', 'Calle Troya 40, 2ºB', '28001', 'Madrid', 'ES6000491500051234567892', true)
ON CONFLICT (nif) DO NOTHING;

-- Clientes para Troya 40 - Portal 2
INSERT INTO clientes (id, tipo_cliente, nombre, apellidos, nif, email, telefono, direccion_fiscal, codigo_postal_fiscal, ciudad_fiscal, iban, activo) VALUES
  ('f0000005-0000-0000-0000-000000000005', 'propietario', 'Laura', 'Fernández Gil', '56789012E', 'laura.fernandez@email.com', '600555666', 'Calle Troya 40, P2-1ºA', '28001', 'Madrid', 'ES1720852066623456789011', true),
  ('f0000006-0000-0000-0000-000000000006', 'inquilino', 'Pedro', 'Díaz Torres', '67890123F', 'pedro.diaz@email.com', '600666777', 'Calle Troya 40, P2-1ºB', '28001', 'Madrid', NULL, true),
  ('f0000007-0000-0000-0000-000000000007', 'propietario', 'Elena', 'Moreno Castro', '78901234A', 'elena.moreno@email.com', '600777888', 'Calle Troya 40, P2-2ºA', '28001', 'Madrid', 'ES9000246912501234567891', true),
  ('f0000008-0000-0000-0000-000000000008', 'propietario', 'Miguel', 'Jiménez Vega', '89012345B', 'miguel.jimenez@email.com', '600888999', 'Calle Troya 40, P2-2ºB', '28001', 'Madrid', 'ES3114650100722030876293', true)
ON CONFLICT (nif) DO NOTHING;

-- Clientes para Hermes 12
INSERT INTO clientes (id, tipo_cliente, nombre, apellidos, nif, email, telefono, direccion_fiscal, codigo_postal_fiscal, ciudad_fiscal, iban, activo) VALUES
  ('f0000009-0000-0000-0000-000000000009', 'propietario', 'Sofía', 'Ruiz Martín', '90123456C', 'sofia.ruiz@email.com', '601111222', 'Av. Hermes 12, Bajo A', '28002', 'Madrid', 'ES6621000418401234567891', true),
  ('f000000a-0000-0000-0000-00000000000a', 'inquilino', 'David', 'Navarro Blanco', '01234567D', 'david.navarro@email.com', '601222333', 'Av. Hermes 12, Bajo B', '28002', 'Madrid', NULL, true),
  ('f000000b-0000-0000-0000-00000000000b', 'propietario', 'Carmen', 'Iglesias Ramos', '11234567E', 'carmen.iglesias@email.com', '601333444', 'Av. Hermes 12, 1ºA', '28002', 'Madrid', 'ES0921000418450200051339', true),
  ('f000000c-0000-0000-0000-00000000000c', 'propietario', 'Roberto', 'Herrera Santos', '21234567F', 'roberto.herrera@email.com', '601444555', 'Av. Hermes 12, 1ºB', '28002', 'Madrid', 'ES7620770024003102575766', true)
ON CONFLICT (nif) DO NOTHING;

-- =====================================================
-- 5. ASIGNAR CLIENTES A UBICACIONES
-- =====================================================

-- Troya 40 - Portal 1
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, tipo_ocupacion, fecha_inicio, es_actual) VALUES
  ('10000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 'f0000001-0000-0000-0000-000000000001', 'propietario', '2020-01-01', true),
  ('10000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', 'f0000002-0000-0000-0000-000000000002', 'propietario', '2019-06-15', true),
  ('10000003-0000-0000-0000-000000000003', 'd0000003-0000-0000-0000-000000000003', 'f0000003-0000-0000-0000-000000000003', 'inquilino', '2023-03-01', true),
  ('10000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', 'f0000004-0000-0000-0000-000000000004', 'propietario', '2018-09-01', true)
ON CONFLICT DO NOTHING;

-- Troya 40 - Portal 2
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, tipo_ocupacion, fecha_inicio, es_actual) VALUES
  ('10000005-0000-0000-0000-000000000005', 'd0000005-0000-0000-0000-000000000005', 'f0000005-0000-0000-0000-000000000005', 'propietario', '2021-02-15', true),
  ('10000006-0000-0000-0000-000000000006', 'd0000006-0000-0000-0000-000000000006', 'f0000006-0000-0000-0000-000000000006', 'inquilino', '2024-01-01', true),
  ('10000007-0000-0000-0000-000000000007', 'd0000007-0000-0000-0000-000000000007', 'f0000007-0000-0000-0000-000000000007', 'propietario', '2017-05-01', true),
  ('10000008-0000-0000-0000-000000000008', 'd0000008-0000-0000-0000-000000000008', 'f0000008-0000-0000-0000-000000000008', 'propietario', '2022-08-01', true)
ON CONFLICT DO NOTHING;

-- Hermes 12
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, tipo_ocupacion, fecha_inicio, es_actual) VALUES
  ('10000009-0000-0000-0000-000000000009', 'd0000009-0000-0000-0000-000000000009', 'f0000009-0000-0000-0000-000000000009', 'propietario', '2020-06-01', true),
  ('1000000a-0000-0000-0000-00000000000a', 'd000000a-0000-0000-0000-00000000000a', 'f000000a-0000-0000-0000-00000000000a', 'inquilino', '2024-03-15', true),
  ('1000000b-0000-0000-0000-00000000000b', 'd000000b-0000-0000-0000-00000000000b', 'f000000b-0000-0000-0000-00000000000b', 'propietario', '2019-11-01', true),
  ('1000000c-0000-0000-0000-00000000000c', 'd000000c-0000-0000-0000-00000000000c', 'f000000c-0000-0000-0000-00000000000c', 'propietario', '2021-04-01', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. CONTADORES
-- =====================================================

-- Contadores para Troya 40 - Portal 1
INSERT INTO contadores (id, ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo) VALUES
  ('20000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', '22804101', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('20000002-0000-0000-0000-000000000002', 'd0000002-0000-0000-0000-000000000002', '22804102', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('20000003-0000-0000-0000-000000000003', 'd0000003-0000-0000-0000-000000000003', '22804103', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('20000004-0000-0000-0000-000000000004', 'd0000004-0000-0000-0000-000000000004', '22804104', 'Zenner', 'C5-CMF', '2020-01-15', true)
ON CONFLICT (numero_serie) DO NOTHING;

-- Contadores para Troya 40 - Portal 2
INSERT INTO contadores (id, ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo) VALUES
  ('20000005-0000-0000-0000-000000000005', 'd0000005-0000-0000-0000-000000000005', '22804105', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('20000006-0000-0000-0000-000000000006', 'd0000006-0000-0000-0000-000000000006', '22804106', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('20000007-0000-0000-0000-000000000007', 'd0000007-0000-0000-0000-000000000007', '22804107', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('20000008-0000-0000-0000-000000000008', 'd0000008-0000-0000-0000-000000000008', '22804108', 'Zenner', 'C5-CMF', '2020-01-15', true)
ON CONFLICT (numero_serie) DO NOTHING;

-- Contadores para Hermes 12
INSERT INTO contadores (id, ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo) VALUES
  ('20000009-0000-0000-0000-000000000009', 'd0000009-0000-0000-0000-000000000009', '33901201', 'Kamstrup', 'Multical 303', '2021-06-01', true),
  ('2000000a-0000-0000-0000-00000000000a', 'd000000a-0000-0000-0000-00000000000a', '33901202', 'Kamstrup', 'Multical 303', '2021-06-01', true),
  ('2000000b-0000-0000-0000-00000000000b', 'd000000b-0000-0000-0000-00000000000b', '33901203', 'Kamstrup', 'Multical 303', '2021-06-01', true),
  ('2000000c-0000-0000-0000-00000000000c', 'd000000c-0000-0000-0000-00000000000c', '33901204', 'Kamstrup', 'Multical 303', '2021-06-01', true)
ON CONFLICT (numero_serie) DO NOTHING;

-- =====================================================
-- 7. ASIGNAR CONCEPTOS A CONTADORES
-- =====================================================

-- Troya 40 tiene ACS y CAL
INSERT INTO contadores_conceptos (id, contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo) VALUES
  -- Portal 1 - ACS
  ('30000001-0000-0000-0000-000000000001', '20000001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 45.5, '2025-10-31', true),
  ('30000002-0000-0000-0000-000000000002', '20000002-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 52.3, '2025-10-31', true),
  ('30000003-0000-0000-0000-000000000003', '20000003-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 38.7, '2025-10-31', true),
  ('30000004-0000-0000-0000-000000000004', '20000004-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 61.2, '2025-10-31', true),
  -- Portal 1 - CAL
  ('30000005-0000-0000-0000-000000000005', '20000001-0000-0000-0000-000000000001', 'c0000002-0000-0000-0000-000000000002', 0, '2020-01-15', 1520.5, '2025-10-31', true),
  ('30000006-0000-0000-0000-000000000006', '20000002-0000-0000-0000-000000000002', 'c0000002-0000-0000-0000-000000000002', 0, '2020-01-15', 1380.2, '2025-10-31', true),
  ('30000007-0000-0000-0000-000000000007', '20000003-0000-0000-0000-000000000003', 'c0000002-0000-0000-0000-000000000002', 0, '2020-01-15', 1650.8, '2025-10-31', true),
  ('30000008-0000-0000-0000-000000000008', '20000004-0000-0000-0000-000000000004', 'c0000002-0000-0000-0000-000000000002', 0, '2020-01-15', 1420.0, '2025-10-31', true),
  -- Portal 2 - ACS
  ('30000009-0000-0000-0000-000000000009', '20000005-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 41.8, '2025-10-31', true),
  ('3000000a-0000-0000-0000-00000000000a', '20000006-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 35.2, '2025-10-31', true),
  ('3000000b-0000-0000-0000-00000000000b', '20000007-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 58.9, '2025-10-31', true),
  ('3000000c-0000-0000-0000-00000000000c', '20000008-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 44.6, '2025-10-31', true),
  -- Portal 2 - CAL
  ('3000000d-0000-0000-0000-00000000000d', '20000005-0000-0000-0000-000000000005', 'c0000002-0000-0000-0000-000000000002', 0, '2020-01-15', 1290.3, '2025-10-31', true),
  ('3000000e-0000-0000-0000-00000000000e', '20000006-0000-0000-0000-000000000006', 'c0000002-0000-0000-0000-000000000002', 0, '2020-01-15', 1180.7, '2025-10-31', true),
  ('3000000f-0000-0000-0000-00000000000f', '20000007-0000-0000-0000-000000000007', 'c0000002-0000-0000-0000-000000000002', 0, '2020-01-15', 1550.2, '2025-10-31', true),
  ('30000010-0000-0000-0000-000000000010', '20000008-0000-0000-0000-000000000008', 'c0000002-0000-0000-0000-000000000002', 0, '2020-01-15', 1320.5, '2025-10-31', true)
ON CONFLICT DO NOTHING;

-- Hermes 12 tiene ACS y CLI
INSERT INTO contadores_conceptos (id, contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo) VALUES
  -- ACS
  ('30000011-0000-0000-0000-000000000011', '20000009-0000-0000-0000-000000000009', 'c0000001-0000-0000-0000-000000000001', 0, '2021-06-01', 32.4, '2025-10-31', true),
  ('30000012-0000-0000-0000-000000000012', '2000000a-0000-0000-0000-00000000000a', 'c0000001-0000-0000-0000-000000000001', 0, '2021-06-01', 28.7, '2025-10-31', true),
  ('30000013-0000-0000-0000-000000000013', '2000000b-0000-0000-0000-00000000000b', 'c0000001-0000-0000-0000-000000000001', 0, '2021-06-01', 41.2, '2025-10-31', true),
  ('30000014-0000-0000-0000-000000000014', '2000000c-0000-0000-0000-00000000000c', 'c0000001-0000-0000-0000-000000000001', 0, '2021-06-01', 36.8, '2025-10-31', true),
  -- CLI
  ('30000015-0000-0000-0000-000000000015', '20000009-0000-0000-0000-000000000009', 'c0000003-0000-0000-0000-000000000003', 0, '2021-06-01', 890.5, '2025-10-31', true),
  ('30000016-0000-0000-0000-000000000016', '2000000a-0000-0000-0000-00000000000a', 'c0000003-0000-0000-0000-000000000003', 0, '2021-06-01', 720.3, '2025-10-31', true),
  ('30000017-0000-0000-0000-000000000017', '2000000b-0000-0000-0000-00000000000b', 'c0000003-0000-0000-0000-000000000003', 0, '2021-06-01', 1050.8, '2025-10-31', true),
  ('30000018-0000-0000-0000-000000000018', '2000000c-0000-0000-0000-00000000000c', 'c0000003-0000-0000-0000-000000000003', 0, '2021-06-01', 980.2, '2025-10-31', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 8. VERIFICACIÓN
-- =====================================================

SELECT 
  'Datos de demostración insertados correctamente' AS mensaje,
  (SELECT COUNT(*) FROM comunidades) AS comunidades,
  (SELECT COUNT(*) FROM agrupaciones) AS agrupaciones,
  (SELECT COUNT(*) FROM ubicaciones) AS ubicaciones,
  (SELECT COUNT(*) FROM clientes) AS clientes,
  (SELECT COUNT(*) FROM contadores) AS contadores,
  (SELECT COUNT(*) FROM contadores_conceptos) AS contadores_conceptos,
  (SELECT COUNT(*) FROM precios) AS precios;
