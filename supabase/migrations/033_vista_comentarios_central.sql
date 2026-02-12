-- =====================================================
-- MIGRACIÓN: Vista centralizada de comentarios
-- =====================================================
-- Vista enriquecida con nombres de entidades asociadas
-- para la pagina central de Notas (Kanban)
-- =====================================================

CREATE VIEW v_comentarios_central AS
SELECT 
  c.id,
  c.entidad_tipo,
  c.entidad_id,
  c.usuario_id,
  c.contenido,
  c.prioridad,
  c.estado,
  c.etiqueta,
  c.fijado,
  c.created_at,
  c.updated_at,
  p.nombre_completo AS usuario_nombre,
  au.email AS usuario_email,
  CASE 
    WHEN c.entidad_tipo = 'cliente' THEN cli.nombre || ' ' || cli.apellidos
    WHEN c.entidad_tipo = 'comunidad' THEN com.nombre
    ELSE NULL
  END AS entidad_nombre,
  CASE 
    WHEN c.entidad_tipo = 'cliente' THEN cli.codigo_cliente
    WHEN c.entidad_tipo = 'comunidad' THEN com.codigo
    ELSE NULL
  END AS entidad_codigo
FROM comentarios c
JOIN profiles p ON p.id = c.usuario_id
JOIN auth.users au ON au.id = c.usuario_id
LEFT JOIN clientes cli ON c.entidad_tipo = 'cliente' AND cli.id = c.entidad_id
LEFT JOIN comunidades com ON c.entidad_tipo = 'comunidad' AND com.id = c.entidad_id;
