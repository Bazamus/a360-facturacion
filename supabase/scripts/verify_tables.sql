-- Verificar qué tablas existen relacionadas con envíos y remesas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('envios', 'remesas', 'remesas_detalles', 'plantillas_email')
ORDER BY table_name;
