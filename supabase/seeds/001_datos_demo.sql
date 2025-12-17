-- =====================================================
-- Datos de Demostración para A360 Facturación
-- Ejecutar después de las migraciones 001, 002 y 003
-- =====================================================

-- =====================================================
-- 1. CONCEPTOS (Tipos de consumo/servicio)
-- =====================================================

INSERT INTO conceptos (id, codigo, nombre, descripcion, unidad_medida, es_termino_fijo, activo, orden) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'ACS', 'Agua Caliente Sanitaria', 'Consumo de agua caliente para uso doméstico', 'm³', false, true, 1),
  ('c0000001-0000-0000-0000-000000000002', 'CAL', 'Calefacción', 'Consumo de calefacción central', 'kWh', false, true, 2),
  ('c0000001-0000-0000-0000-000000000003', 'CLI', 'Climatización', 'Consumo de aire acondicionado/climatización', 'kWh', false, true, 3),
  ('c0000001-0000-0000-0000-000000000004', 'TF', 'Término Fijo', 'Cuota fija mensual por servicios', '€/mes', true, true, 4)
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- 2. COMUNIDAD: Residencial Troya 40
-- =====================================================

INSERT INTO comunidades (id, codigo, nombre, cif, direccion, codigo_postal, ciudad, provincia, nombre_agrupacion, nombre_ubicacion, activa) VALUES
  ('com00001-0000-0000-0000-000000000001', 'TRO40', 'Residencial Troya 40', 'H12345678', 'Calle Troya 40', '28001', 'Madrid', 'Madrid', 'Portal', 'Vivienda', true)
ON CONFLICT (codigo) DO NOTHING;

-- Agrupaciones (Portales)
INSERT INTO agrupaciones (id, comunidad_id, nombre, descripcion, orden, activa) VALUES
  ('agr00001-0000-0000-0000-000000000001', 'com00001-0000-0000-0000-000000000001', 'Portal 1', 'Portal principal', 1, true),
  ('agr00001-0000-0000-0000-000000000002', 'com00001-0000-0000-0000-000000000001', 'Portal 2', 'Portal secundario', 2, true)
ON CONFLICT DO NOTHING;

-- Ubicaciones (Viviendas) - Portal 1
INSERT INTO ubicaciones (id, agrupacion_id, nombre, descripcion, orden, activa) VALUES
  ('ubi00001-0000-0000-0000-000000000001', 'agr00001-0000-0000-0000-000000000001', '1ºA', 'Primero A', 1, true),
  ('ubi00001-0000-0000-0000-000000000002', 'agr00001-0000-0000-0000-000000000001', '1ºB', 'Primero B', 2, true),
  ('ubi00001-0000-0000-0000-000000000003', 'agr00001-0000-0000-0000-000000000001', '2ºA', 'Segundo A', 3, true),
  ('ubi00001-0000-0000-0000-000000000004', 'agr00001-0000-0000-0000-000000000001', '2ºB', 'Segundo B', 4, true)
ON CONFLICT DO NOTHING;

-- Ubicaciones (Viviendas) - Portal 2
INSERT INTO ubicaciones (id, agrupacion_id, nombre, descripcion, orden, activa) VALUES
  ('ubi00001-0000-0000-0000-000000000005', 'agr00001-0000-0000-0000-000000000002', '1ºA', 'Primero A', 1, true),
  ('ubi00001-0000-0000-0000-000000000006', 'agr00001-0000-0000-0000-000000000002', '1ºB', 'Primero B', 2, true),
  ('ubi00001-0000-0000-0000-000000000007', 'agr00001-0000-0000-0000-000000000002', '2ºA', 'Segundo A', 3, true),
  ('ubi00001-0000-0000-0000-000000000008', 'agr00001-0000-0000-0000-000000000002', '2ºB', 'Segundo B', 4, true)
ON CONFLICT DO NOTHING;

-- Precios para Troya 40
INSERT INTO precios (id, comunidad_id, concepto_id, precio_unitario, fecha_inicio, vigente) VALUES
  ('pre00001-0000-0000-0000-000000000001', 'com00001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 6.45, '2025-01-01', true),
  ('pre00001-0000-0000-0000-000000000002', 'com00001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 0.085, '2025-01-01', true),
  ('pre00001-0000-0000-0000-000000000003', 'com00001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000004', 25.00, '2025-01-01', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. COMUNIDAD: Edificio Hermes 12
-- =====================================================

INSERT INTO comunidades (id, codigo, nombre, cif, direccion, codigo_postal, ciudad, provincia, nombre_agrupacion, nombre_ubicacion, activa) VALUES
  ('com00001-0000-0000-0000-000000000002', 'HER12', 'Edificio Hermes 12', 'H87654321', 'Avenida Hermes 12', '28002', 'Madrid', 'Madrid', 'Escalera', 'Apartamento', true)
ON CONFLICT (codigo) DO NOTHING;

-- Agrupaciones (Escaleras)
INSERT INTO agrupaciones (id, comunidad_id, nombre, descripcion, orden, activa) VALUES
  ('agr00001-0000-0000-0000-000000000003', 'com00001-0000-0000-0000-000000000002', 'Escalera A', 'Escalera principal', 1, true)
ON CONFLICT DO NOTHING;

-- Ubicaciones (Apartamentos)
INSERT INTO ubicaciones (id, agrupacion_id, nombre, descripcion, orden, activa) VALUES
  ('ubi00001-0000-0000-0000-000000000009', 'agr00001-0000-0000-0000-000000000003', 'Bajo A', 'Planta baja A', 1, true),
  ('ubi00001-0000-0000-0000-000000000010', 'agr00001-0000-0000-0000-000000000003', 'Bajo B', 'Planta baja B', 2, true),
  ('ubi00001-0000-0000-0000-000000000011', 'agr00001-0000-0000-0000-000000000003', '1º A', 'Primero A', 3, true),
  ('ubi00001-0000-0000-0000-000000000012', 'agr00001-0000-0000-0000-000000000003', '1º B', 'Primero B', 4, true)
ON CONFLICT DO NOTHING;

-- Precios para Hermes 12
INSERT INTO precios (id, comunidad_id, concepto_id, precio_unitario, fecha_inicio, vigente) VALUES
  ('pre00001-0000-0000-0000-000000000004', 'com00001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 7.20, '2025-01-01', true),
  ('pre00001-0000-0000-0000-000000000005', 'com00001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000003', 0.095, '2025-01-01', true),
  ('pre00001-0000-0000-0000-000000000006', 'com00001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000004', 30.00, '2025-01-01', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 4. CLIENTES
-- =====================================================

-- Clientes para Troya 40 - Portal 1
INSERT INTO clientes (id, tipo_cliente, nombre, apellidos, nif, email, telefono, direccion_fiscal, codigo_postal_fiscal, ciudad_fiscal, iban, activo) VALUES
  ('cli00001-0000-0000-0000-000000000001', 'propietario', 'María', 'García López', '12345678A', 'maria.garcia@email.com', '600111222', 'Calle Troya 40, 1ºA', '28001', 'Madrid', 'ES9121000418450200051332', true),
  ('cli00001-0000-0000-0000-000000000002', 'propietario', 'Juan', 'Martínez Ruiz', '23456789B', 'juan.martinez@email.com', '600222333', 'Calle Troya 40, 1ºB', '28001', 'Madrid', 'ES7921000813610123456789', true),
  ('cli00001-0000-0000-0000-000000000003', 'inquilino', 'Ana', 'Sánchez Pérez', '34567890C', 'ana.sanchez@email.com', '600333444', 'Calle Troya 40, 2ºA', '28001', 'Madrid', NULL, true),
  ('cli00001-0000-0000-0000-000000000004', 'propietario', 'Carlos', 'López Hernández', '45678901D', 'carlos.lopez@email.com', '600444555', 'Calle Troya 40, 2ºB', '28001', 'Madrid', 'ES6000491500051234567892', true)
ON CONFLICT (nif) DO NOTHING;

-- Clientes para Troya 40 - Portal 2
INSERT INTO clientes (id, tipo_cliente, nombre, apellidos, nif, email, telefono, direccion_fiscal, codigo_postal_fiscal, ciudad_fiscal, iban, activo) VALUES
  ('cli00001-0000-0000-0000-000000000005', 'propietario', 'Laura', 'Fernández Gil', '56789012E', 'laura.fernandez@email.com', '600555666', 'Calle Troya 40, P2-1ºA', '28001', 'Madrid', 'ES1720852066623456789011', true),
  ('cli00001-0000-0000-0000-000000000006', 'inquilino', 'Pedro', 'Díaz Torres', '67890123F', 'pedro.diaz@email.com', '600666777', 'Calle Troya 40, P2-1ºB', '28001', 'Madrid', NULL, true),
  ('cli00001-0000-0000-0000-000000000007', 'propietario', 'Elena', 'Moreno Castro', '78901234G', 'elena.moreno@email.com', '600777888', 'Calle Troya 40, P2-2ºA', '28001', 'Madrid', 'ES9000246912501234567891', true),
  ('cli00001-0000-0000-0000-000000000008', 'propietario', 'Miguel', 'Jiménez Vega', '89012345H', 'miguel.jimenez@email.com', '600888999', 'Calle Troya 40, P2-2ºB', '28001', 'Madrid', 'ES3114650100722030876293', true)
ON CONFLICT (nif) DO NOTHING;

-- Clientes para Hermes 12
INSERT INTO clientes (id, tipo_cliente, nombre, apellidos, nif, email, telefono, direccion_fiscal, codigo_postal_fiscal, ciudad_fiscal, iban, activo) VALUES
  ('cli00001-0000-0000-0000-000000000009', 'propietario', 'Sofía', 'Ruiz Martín', '90123456I', 'sofia.ruiz@email.com', '601111222', 'Av. Hermes 12, Bajo A', '28002', 'Madrid', 'ES6621000418401234567891', true),
  ('cli00001-0000-0000-0000-000000000010', 'inquilino', 'David', 'Navarro Blanco', '01234567J', 'david.navarro@email.com', '601222333', 'Av. Hermes 12, Bajo B', '28002', 'Madrid', NULL, true),
  ('cli00001-0000-0000-0000-000000000011', 'propietario', 'Carmen', 'Iglesias Ramos', '11234567K', 'carmen.iglesias@email.com', '601333444', 'Av. Hermes 12, 1ºA', '28002', 'Madrid', 'ES0921000418450200051339', true),
  ('cli00001-0000-0000-0000-000000000012', 'propietario', 'Roberto', 'Herrera Santos', '21234567L', 'roberto.herrera@email.com', '601444555', 'Av. Hermes 12, 1ºB', '28002', 'Madrid', 'ES7620770024003102575766', true)
ON CONFLICT (nif) DO NOTHING;

-- =====================================================
-- 5. ASIGNAR CLIENTES A UBICACIONES
-- =====================================================

-- Troya 40 - Portal 1
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, tipo_ocupacion, fecha_inicio, es_actual) VALUES
  ('ucl00001-0000-0000-0000-000000000001', 'ubi00001-0000-0000-0000-000000000001', 'cli00001-0000-0000-0000-000000000001', 'propietario', '2020-01-01', true),
  ('ucl00001-0000-0000-0000-000000000002', 'ubi00001-0000-0000-0000-000000000002', 'cli00001-0000-0000-0000-000000000002', 'propietario', '2019-06-15', true),
  ('ucl00001-0000-0000-0000-000000000003', 'ubi00001-0000-0000-0000-000000000003', 'cli00001-0000-0000-0000-000000000003', 'inquilino', '2023-03-01', true),
  ('ucl00001-0000-0000-0000-000000000004', 'ubi00001-0000-0000-0000-000000000004', 'cli00001-0000-0000-0000-000000000004', 'propietario', '2018-09-01', true)
ON CONFLICT DO NOTHING;

-- Troya 40 - Portal 2
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, tipo_ocupacion, fecha_inicio, es_actual) VALUES
  ('ucl00001-0000-0000-0000-000000000005', 'ubi00001-0000-0000-0000-000000000005', 'cli00001-0000-0000-0000-000000000005', 'propietario', '2021-02-15', true),
  ('ucl00001-0000-0000-0000-000000000006', 'ubi00001-0000-0000-0000-000000000006', 'cli00001-0000-0000-0000-000000000006', 'inquilino', '2024-01-01', true),
  ('ucl00001-0000-0000-0000-000000000007', 'ubi00001-0000-0000-0000-000000000007', 'cli00001-0000-0000-0000-000000000007', 'propietario', '2017-05-01', true),
  ('ucl00001-0000-0000-0000-000000000008', 'ubi00001-0000-0000-0000-000000000008', 'cli00001-0000-0000-0000-000000000008', 'propietario', '2022-08-01', true)
ON CONFLICT DO NOTHING;

-- Hermes 12
INSERT INTO ubicaciones_clientes (id, ubicacion_id, cliente_id, tipo_ocupacion, fecha_inicio, es_actual) VALUES
  ('ucl00001-0000-0000-0000-000000000009', 'ubi00001-0000-0000-0000-000000000009', 'cli00001-0000-0000-0000-000000000009', 'propietario', '2020-06-01', true),
  ('ucl00001-0000-0000-0000-000000000010', 'ubi00001-0000-0000-0000-000000000010', 'cli00001-0000-0000-0000-000000000010', 'inquilino', '2024-03-15', true),
  ('ucl00001-0000-0000-0000-000000000011', 'ubi00001-0000-0000-0000-000000000011', 'cli00001-0000-0000-0000-000000000011', 'propietario', '2019-11-01', true),
  ('ucl00001-0000-0000-0000-000000000012', 'ubi00001-0000-0000-0000-000000000012', 'cli00001-0000-0000-0000-000000000012', 'propietario', '2021-04-01', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. CONTADORES
-- =====================================================

-- Contadores para Troya 40 - Portal 1
INSERT INTO contadores (id, ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo) VALUES
  ('cnt00001-0000-0000-0000-000000000001', 'ubi00001-0000-0000-0000-000000000001', '22804101', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('cnt00001-0000-0000-0000-000000000002', 'ubi00001-0000-0000-0000-000000000002', '22804102', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('cnt00001-0000-0000-0000-000000000003', 'ubi00001-0000-0000-0000-000000000003', '22804103', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('cnt00001-0000-0000-0000-000000000004', 'ubi00001-0000-0000-0000-000000000004', '22804104', 'Zenner', 'C5-CMF', '2020-01-15', true)
ON CONFLICT (numero_serie) DO NOTHING;

-- Contadores para Troya 40 - Portal 2
INSERT INTO contadores (id, ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo) VALUES
  ('cnt00001-0000-0000-0000-000000000005', 'ubi00001-0000-0000-0000-000000000005', '22804105', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('cnt00001-0000-0000-0000-000000000006', 'ubi00001-0000-0000-0000-000000000006', '22804106', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('cnt00001-0000-0000-0000-000000000007', 'ubi00001-0000-0000-0000-000000000007', '22804107', 'Zenner', 'C5-CMF', '2020-01-15', true),
  ('cnt00001-0000-0000-0000-000000000008', 'ubi00001-0000-0000-0000-000000000008', '22804108', 'Zenner', 'C5-CMF', '2020-01-15', true)
ON CONFLICT (numero_serie) DO NOTHING;

-- Contadores para Hermes 12
INSERT INTO contadores (id, ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo) VALUES
  ('cnt00001-0000-0000-0000-000000000009', 'ubi00001-0000-0000-0000-000000000009', '33901201', 'Kamstrup', 'Multical 303', '2021-06-01', true),
  ('cnt00001-0000-0000-0000-000000000010', 'ubi00001-0000-0000-0000-000000000010', '33901202', 'Kamstrup', 'Multical 303', '2021-06-01', true),
  ('cnt00001-0000-0000-0000-000000000011', 'ubi00001-0000-0000-0000-000000000011', '33901203', 'Kamstrup', 'Multical 303', '2021-06-01', true),
  ('cnt00001-0000-0000-0000-000000000012', 'ubi00001-0000-0000-0000-000000000012', '33901204', 'Kamstrup', 'Multical 303', '2021-06-01', true)
ON CONFLICT (numero_serie) DO NOTHING;

-- =====================================================
-- 7. ASIGNAR CONCEPTOS A CONTADORES
-- =====================================================

-- Troya 40 tiene ACS y CAL
INSERT INTO contadores_conceptos (id, contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo) VALUES
  -- Portal 1 - ACS
  ('cc000001-0000-0000-0000-000000000001', 'cnt00001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 45.5, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000002', 'cnt00001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 52.3, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000003', 'cnt00001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 38.7, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000004', 'cnt00001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 61.2, '2025-10-31', true),
  -- Portal 1 - CAL
  ('cc000001-0000-0000-0000-000000000005', 'cnt00001-0000-0000-0000-000000000001', 'c0000001-0000-0000-0000-000000000002', 0, '2020-01-15', 1520.5, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000006', 'cnt00001-0000-0000-0000-000000000002', 'c0000001-0000-0000-0000-000000000002', 0, '2020-01-15', 1380.2, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000007', 'cnt00001-0000-0000-0000-000000000003', 'c0000001-0000-0000-0000-000000000002', 0, '2020-01-15', 1650.8, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000008', 'cnt00001-0000-0000-0000-000000000004', 'c0000001-0000-0000-0000-000000000002', 0, '2020-01-15', 1420.0, '2025-10-31', true),
  -- Portal 2 - ACS
  ('cc000001-0000-0000-0000-000000000009', 'cnt00001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 41.8, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000010', 'cnt00001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 35.2, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000011', 'cnt00001-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 58.9, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000012', 'cnt00001-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000001', 0, '2020-01-15', 44.6, '2025-10-31', true),
  -- Portal 2 - CAL
  ('cc000001-0000-0000-0000-000000000013', 'cnt00001-0000-0000-0000-000000000005', 'c0000001-0000-0000-0000-000000000002', 0, '2020-01-15', 1290.3, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000014', 'cnt00001-0000-0000-0000-000000000006', 'c0000001-0000-0000-0000-000000000002', 0, '2020-01-15', 1180.7, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000015', 'cnt00001-0000-0000-0000-000000000007', 'c0000001-0000-0000-0000-000000000002', 0, '2020-01-15', 1550.2, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000016', 'cnt00001-0000-0000-0000-000000000008', 'c0000001-0000-0000-0000-000000000002', 0, '2020-01-15', 1320.5, '2025-10-31', true)
ON CONFLICT DO NOTHING;

-- Hermes 12 tiene ACS y CLI
INSERT INTO contadores_conceptos (id, contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo) VALUES
  -- ACS
  ('cc000001-0000-0000-0000-000000000017', 'cnt00001-0000-0000-0000-000000000009', 'c0000001-0000-0000-0000-000000000001', 0, '2021-06-01', 32.4, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000018', 'cnt00001-0000-0000-0000-000000000010', 'c0000001-0000-0000-0000-000000000001', 0, '2021-06-01', 28.7, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000019', 'cnt00001-0000-0000-0000-000000000011', 'c0000001-0000-0000-0000-000000000001', 0, '2021-06-01', 41.2, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000020', 'cnt00001-0000-0000-0000-000000000012', 'c0000001-0000-0000-0000-000000000001', 0, '2021-06-01', 36.8, '2025-10-31', true),
  -- CLI
  ('cc000001-0000-0000-0000-000000000021', 'cnt00001-0000-0000-0000-000000000009', 'c0000001-0000-0000-0000-000000000003', 0, '2021-06-01', 890.5, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000022', 'cnt00001-0000-0000-0000-000000000010', 'c0000001-0000-0000-0000-000000000003', 0, '2021-06-01', 720.3, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000023', 'cnt00001-0000-0000-0000-000000000011', 'c0000001-0000-0000-0000-000000000003', 0, '2021-06-01', 1050.8, '2025-10-31', true),
  ('cc000001-0000-0000-0000-000000000024', 'cnt00001-0000-0000-0000-000000000012', 'c0000001-0000-0000-0000-000000000003', 0, '2021-06-01', 980.2, '2025-10-31', true)
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
