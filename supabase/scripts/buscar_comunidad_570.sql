-- =====================================================
-- SCRIPT PARA BUSCAR LA COMUNIDAD CORRECTA
-- =====================================================
-- Busca comunidades que contengan "570" o "GETAFE"
-- para identificar el nombre exacto

-- Búsqueda 1: Comunidades que contengan "570"
SELECT 
  id,
  nombre,
  created_at,
  LENGTH(nombre) as longitud_nombre,
  -- Mostrar espacios ocultos
  REPLACE(nombre, ' ', '·') as nombre_con_espacios_visibles
FROM comunidades
WHERE nombre ILIKE '%570%'
ORDER BY nombre;

-- Búsqueda 2: Comunidades que contengan "GETAFE"
SELECT 
  id,
  nombre,
  created_at,
  LENGTH(nombre) as longitud_nombre,
  REPLACE(nombre, ' ', '·') as nombre_con_espacios_visibles
FROM comunidades
WHERE nombre ILIKE '%GETAFE%'
ORDER BY nombre;

-- Búsqueda 3: Comunidades que contengan "262"
SELECT 
  id,
  nombre,
  created_at,
  LENGTH(nombre) as longitud_nombre,
  REPLACE(nombre, ' ', '·') as nombre_con_espacios_visibles
FROM comunidades
WHERE nombre ILIKE '%262%'
ORDER BY nombre;

-- Búsqueda 4: TODAS las comunidades (por si el nombre es muy diferente)
SELECT 
  id,
  nombre,
  created_at,
  -- Contar datos asociados
  (SELECT COUNT(*) FROM agrupaciones WHERE comunidad_id = comunidades.id) as num_agrupaciones,
  (SELECT COUNT(*) FROM facturas WHERE comunidad_id = comunidades.id AND estado = 'borrador') as num_facturas_borrador
FROM comunidades
ORDER BY created_at DESC
LIMIT 50;

-- Búsqueda 5: Estadísticas por comunidad
SELECT 
  c.id,
  c.nombre,
  COUNT(DISTINCT a.id) as agrupaciones,
  COUNT(DISTINCT u.id) as ubicaciones,
  COUNT(DISTINCT cont.id) as contadores,
  COUNT(DISTINCT l.id) as lecturas,
  (SELECT COUNT(*) FROM facturas f WHERE f.comunidad_id = c.id AND f.estado = 'borrador') as facturas_borrador
FROM comunidades c
LEFT JOIN agrupaciones a ON a.comunidad_id = c.id
LEFT JOIN ubicaciones u ON u.agrupacion_id = a.id
LEFT JOIN contadores cont ON cont.ubicacion_id = u.id
LEFT JOIN lecturas l ON l.contador_id = cont.id
GROUP BY c.id, c.nombre
HAVING COUNT(DISTINCT a.id) > 0  -- Solo comunidades con datos
ORDER BY c.created_at DESC;
