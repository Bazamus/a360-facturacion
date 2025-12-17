-- =====================================================
-- Datos de Demostración para A360 Facturación
-- Ejecutar después de las migraciones 001, 002 y 003
-- =====================================================

-- =====================================================
-- 1. CONCEPTOS (Tipos de consumo/servicio)
-- =====================================================

INSERT INTO conceptos (codigo, nombre, descripcion, unidad_medida, es_termino_fijo, activo, orden) VALUES
  ('ACS', 'Agua Caliente Sanitaria', 'Consumo de agua caliente para uso doméstico', 'm³', false, true, 1),
  ('CAL', 'Calefacción', 'Consumo de calefacción central', 'kWh', false, true, 2),
  ('CLI', 'Climatización', 'Consumo de aire acondicionado/climatización', 'kWh', false, true, 3),
  ('TF', 'Término Fijo', 'Cuota fija mensual por servicios', '€/mes', true, true, 4)
ON CONFLICT (codigo) DO UPDATE SET 
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion;

-- =====================================================
-- 2. COMUNIDAD: Residencial Troya 40
-- =====================================================

INSERT INTO comunidades (codigo, nombre, cif, direccion, codigo_postal, ciudad, provincia, nombre_agrupacion, nombre_ubicacion, activa) VALUES
  ('TRO40', 'Residencial Troya 40', 'H12345678', 'Calle Troya 40', '28001', 'Madrid', 'Madrid', 'Portal', 'Vivienda', true)
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

-- Agrupaciones (Portales) para Troya 40
INSERT INTO agrupaciones (comunidad_id, nombre, descripcion, orden, activa) 
SELECT c.id, 'Portal 1', 'Portal principal', 1, true
FROM comunidades c WHERE c.codigo = 'TRO40'
;

INSERT INTO agrupaciones (comunidad_id, nombre, descripcion, orden, activa) 
SELECT c.id, 'Portal 2', 'Portal secundario', 2, true
FROM comunidades c WHERE c.codigo = 'TRO40'
;

-- Ubicaciones (Viviendas) - Portal 1
INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, '1ºA', 'Primero A', 1, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1'
;

INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, '1ºB', 'Primero B', 2, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1'
;

INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, '2ºA', 'Segundo A', 3, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1'
;

INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, '2ºB', 'Segundo B', 4, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1'
;

-- Ubicaciones (Viviendas) - Portal 2
INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, '1ºA', 'Primero A', 1, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2'
;

INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, '1ºB', 'Primero B', 2, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2'
;

INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, '2ºA', 'Segundo A', 3, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2'
;

INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, '2ºB', 'Segundo B', 4, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2'
;

-- Precios para Troya 40
INSERT INTO precios (comunidad_id, concepto_id, precio_unitario, fecha_inicio, activo)
SELECT c.id, co.id, 6.45, '2025-01-01', true
FROM comunidades c, conceptos co 
WHERE c.codigo = 'TRO40' AND co.codigo = 'ACS';

INSERT INTO precios (comunidad_id, concepto_id, precio_unitario, fecha_inicio, activo)
SELECT c.id, co.id, 0.085, '2025-01-01', true
FROM comunidades c, conceptos co 
WHERE c.codigo = 'TRO40' AND co.codigo = 'CAL';

INSERT INTO precios (comunidad_id, concepto_id, precio_unitario, fecha_inicio, activo)
SELECT c.id, co.id, 25.00, '2025-01-01', true
FROM comunidades c, conceptos co 
WHERE c.codigo = 'TRO40' AND co.codigo = 'TF';

-- =====================================================
-- 3. COMUNIDAD: Edificio Hermes 12
-- =====================================================

INSERT INTO comunidades (codigo, nombre, cif, direccion, codigo_postal, ciudad, provincia, nombre_agrupacion, nombre_ubicacion, activa) VALUES
  ('HER12', 'Edificio Hermes 12', 'H87654321', 'Avenida Hermes 12', '28002', 'Madrid', 'Madrid', 'Escalera', 'Apartamento', true)
ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;

-- Agrupaciones (Escaleras) para Hermes 12
INSERT INTO agrupaciones (comunidad_id, nombre, descripcion, orden, activa) 
SELECT c.id, 'Escalera A', 'Escalera principal', 1, true
FROM comunidades c WHERE c.codigo = 'HER12'
;

-- Ubicaciones (Apartamentos) para Hermes 12
INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, 'Bajo A', 'Planta baja A', 1, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A'
;

INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, 'Bajo B', 'Planta baja B', 2, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A'
;

INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, '1º A', 'Primero A', 3, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A'
;

INSERT INTO ubicaciones (agrupacion_id, nombre, descripcion, orden, activa)
SELECT a.id, '1º B', 'Primero B', 4, true
FROM agrupaciones a 
JOIN comunidades c ON a.comunidad_id = c.id 
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A'
;

-- Precios para Hermes 12
INSERT INTO precios (comunidad_id, concepto_id, precio_unitario, fecha_inicio, activo)
SELECT c.id, co.id, 7.20, '2025-01-01', true
FROM comunidades c, conceptos co 
WHERE c.codigo = 'HER12' AND co.codigo = 'ACS';

INSERT INTO precios (comunidad_id, concepto_id, precio_unitario, fecha_inicio, activo)
SELECT c.id, co.id, 0.095, '2025-01-01', true
FROM comunidades c, conceptos co 
WHERE c.codigo = 'HER12' AND co.codigo = 'CLI';

INSERT INTO precios (comunidad_id, concepto_id, precio_unitario, fecha_inicio, activo)
SELECT c.id, co.id, 30.00, '2025-01-01', true
FROM comunidades c, conceptos co 
WHERE c.codigo = 'HER12' AND co.codigo = 'TF';

-- =====================================================
-- 4. CLIENTES
-- =====================================================

INSERT INTO clientes (tipo, nombre, apellidos, nif, email, telefono, direccion_correspondencia, cp_correspondencia, ciudad_correspondencia, iban, activo) VALUES
  ('propietario', 'María', 'García López', '12345678A', 'maria.garcia@email.com', '600111222', 'Calle Troya 40, 1ºA', '28001', 'Madrid', 'ES9121000418450200051332', true),
  ('propietario', 'Juan', 'Martínez Ruiz', '23456789B', 'juan.martinez@email.com', '600222333', 'Calle Troya 40, 1ºB', '28001', 'Madrid', 'ES7921000813610123456789', true),
  ('inquilino', 'Ana', 'Sánchez Pérez', '34567890C', 'ana.sanchez@email.com', '600333444', 'Calle Troya 40, 2ºA', '28001', 'Madrid', NULL, true),
  ('propietario', 'Carlos', 'López Hernández', '45678901D', 'carlos.lopez@email.com', '600444555', 'Calle Troya 40, 2ºB', '28001', 'Madrid', 'ES6000491500051234567892', true),
  ('propietario', 'Laura', 'Fernández Gil', '56789012E', 'laura.fernandez@email.com', '600555666', 'Calle Troya 40, P2-1ºA', '28001', 'Madrid', 'ES1720852066623456789011', true),
  ('inquilino', 'Pedro', 'Díaz Torres', '67890123F', 'pedro.diaz@email.com', '600666777', 'Calle Troya 40, P2-1ºB', '28001', 'Madrid', NULL, true),
  ('propietario', 'Elena', 'Moreno Castro', '78901234A', 'elena.moreno@email.com', '600777888', 'Calle Troya 40, P2-2ºA', '28001', 'Madrid', 'ES9000246912501234567891', true),
  ('propietario', 'Miguel', 'Jiménez Vega', '89012345B', 'miguel.jimenez@email.com', '600888999', 'Calle Troya 40, P2-2ºB', '28001', 'Madrid', 'ES3114650100722030876293', true),
  ('propietario', 'Sofía', 'Ruiz Martín', '90123456C', 'sofia.ruiz@email.com', '601111222', 'Av. Hermes 12, Bajo A', '28002', 'Madrid', 'ES6621000418401234567891', true),
  ('inquilino', 'David', 'Navarro Blanco', '01234567D', 'david.navarro@email.com', '601222333', 'Av. Hermes 12, Bajo B', '28002', 'Madrid', NULL, true),
  ('propietario', 'Carmen', 'Iglesias Ramos', '11234567E', 'carmen.iglesias@email.com', '601333444', 'Av. Hermes 12, 1ºA', '28002', 'Madrid', 'ES0921000418450200051339', true),
  ('propietario', 'Roberto', 'Herrera Santos', '21234567F', 'roberto.herrera@email.com', '601444555', 'Av. Hermes 12, 1ºB', '28002', 'Madrid', 'ES7620770024003102575766', true)
;

-- =====================================================
-- 5. ASIGNAR CLIENTES A UBICACIONES
-- =====================================================

-- Troya 40 - Portal 1
INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2020-01-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '12345678A'
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1' AND u.nombre = '1ºA';

INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2019-06-15', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '23456789B'
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1' AND u.nombre = '1ºB';

INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2023-03-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '34567890C'
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1' AND u.nombre = '2ºA';

INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2018-09-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '45678901D'
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1' AND u.nombre = '2ºB';

-- Troya 40 - Portal 2
INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2021-02-15', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '56789012E'
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2' AND u.nombre = '1ºA';

INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2024-01-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '67890123F'
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2' AND u.nombre = '1ºB';

INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2017-05-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '78901234A'
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2' AND u.nombre = '2ºA';

INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2022-08-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '89012345B'
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2' AND u.nombre = '2ºB';

-- Hermes 12
INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2020-06-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '90123456C'
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A' AND u.nombre = 'Bajo A';

INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2024-03-15', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '01234567D'
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A' AND u.nombre = 'Bajo B';

INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2019-11-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '11234567E'
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A' AND u.nombre = '1º A';

INSERT INTO ubicaciones_clientes (ubicacion_id, cliente_id, fecha_inicio, es_actual)
SELECT u.id, cl.id, '2021-04-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
JOIN clientes cl ON cl.nif = '21234567F'
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A' AND u.nombre = '1º B';

-- =====================================================
-- 6. CONTADORES
-- =====================================================

-- Troya 40 - Portal 1
INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '22804101', 'Zenner', 'C5-CMF', '2020-01-15', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1' AND u.nombre = '1ºA'
;

INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '22804102', 'Zenner', 'C5-CMF', '2020-01-15', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1' AND u.nombre = '1ºB'
;

INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '22804103', 'Zenner', 'C5-CMF', '2020-01-15', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1' AND u.nombre = '2ºA'
;

INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '22804104', 'Zenner', 'C5-CMF', '2020-01-15', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 1' AND u.nombre = '2ºB'
;

-- Troya 40 - Portal 2
INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '22804105', 'Zenner', 'C5-CMF', '2020-01-15', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2' AND u.nombre = '1ºA'
;

INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '22804106', 'Zenner', 'C5-CMF', '2020-01-15', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2' AND u.nombre = '1ºB'
;

INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '22804107', 'Zenner', 'C5-CMF', '2020-01-15', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2' AND u.nombre = '2ºA'
;

INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '22804108', 'Zenner', 'C5-CMF', '2020-01-15', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'TRO40' AND a.nombre = 'Portal 2' AND u.nombre = '2ºB'
;

-- Hermes 12
INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '33901201', 'Kamstrup', 'Multical 303', '2021-06-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A' AND u.nombre = 'Bajo A'
;

INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '33901202', 'Kamstrup', 'Multical 303', '2021-06-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A' AND u.nombre = 'Bajo B'
;

INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '33901203', 'Kamstrup', 'Multical 303', '2021-06-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A' AND u.nombre = '1º A'
;

INSERT INTO contadores (ubicacion_id, numero_serie, marca, modelo, fecha_instalacion, activo)
SELECT u.id, '33901204', 'Kamstrup', 'Multical 303', '2021-06-01', true
FROM ubicaciones u
JOIN agrupaciones a ON u.agrupacion_id = a.id
JOIN comunidades c ON a.comunidad_id = c.id
WHERE c.codigo = 'HER12' AND a.nombre = 'Escalera A' AND u.nombre = '1º B'
;

-- =====================================================
-- 7. ASIGNAR CONCEPTOS A CONTADORES
-- =====================================================

-- Troya 40 - ACS y CAL para cada contador
INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 45.5, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '22804101'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 1520.5, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CAL'
WHERE cnt.numero_serie = '22804101'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 52.3, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '22804102'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 1380.2, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CAL'
WHERE cnt.numero_serie = '22804102'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 38.7, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '22804103'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 1650.8, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CAL'
WHERE cnt.numero_serie = '22804103'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 61.2, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '22804104'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 1420.0, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CAL'
WHERE cnt.numero_serie = '22804104'
;

-- Portal 2
INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 41.8, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '22804105'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 1290.3, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CAL'
WHERE cnt.numero_serie = '22804105'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 35.2, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '22804106'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 1180.7, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CAL'
WHERE cnt.numero_serie = '22804106'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 58.9, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '22804107'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 1550.2, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CAL'
WHERE cnt.numero_serie = '22804107'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 44.6, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '22804108'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2020-01-15', 1320.5, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CAL'
WHERE cnt.numero_serie = '22804108'
;

-- Hermes 12 - ACS y CLI
INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2021-06-01', 32.4, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '33901201'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2021-06-01', 890.5, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CLI'
WHERE cnt.numero_serie = '33901201'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2021-06-01', 28.7, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '33901202'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2021-06-01', 720.3, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CLI'
WHERE cnt.numero_serie = '33901202'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2021-06-01', 41.2, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '33901203'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2021-06-01', 1050.8, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CLI'
WHERE cnt.numero_serie = '33901203'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2021-06-01', 36.8, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'ACS'
WHERE cnt.numero_serie = '33901204'
;

INSERT INTO contadores_conceptos (contador_id, concepto_id, lectura_inicial, fecha_lectura_inicial, lectura_actual, fecha_lectura_actual, activo)
SELECT cnt.id, co.id, 0, '2021-06-01', 980.2, '2025-10-31', true
FROM contadores cnt
JOIN conceptos co ON co.codigo = 'CLI'
WHERE cnt.numero_serie = '33901204'
;

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
