-- Migración: Añadir campo es_test a la tabla envios_email
-- Fecha: 2026-01-12
-- Descripción: Permite identificar envíos realizados en modo test (direcciones delivered+X@resend.dev)

-- Añadir campo es_test a la tabla envios_email
ALTER TABLE envios_email
ADD COLUMN es_test BOOLEAN DEFAULT FALSE NOT NULL;

-- Crear índice para filtrar envíos de prueba eficientemente
CREATE INDEX idx_envios_email_es_test ON envios_email(es_test);

-- Añadir comentario explicativo al campo
COMMENT ON COLUMN envios_email.es_test IS
'Indica si el envío fue realizado en modo test. Los envíos en modo test utilizan direcciones delivered+X@resend.dev de Resend en lugar de los emails reales de los clientes.';
