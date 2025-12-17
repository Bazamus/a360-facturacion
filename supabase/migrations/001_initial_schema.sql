-- =====================================================
-- Migración 001: Esquema Inicial
-- Sistema de Facturación de Gestión Energética A360
-- Fecha: Diciembre 2025
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Tabla: profiles
-- Extiende auth.users con información adicional
-- =====================================================
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre_completo, rol)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'nombre_completo', 'Usuario'),
    'usuario'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- Tabla: configuracion
-- Almacena configuraciones globales en formato clave-valor
-- =====================================================
CREATE TABLE configuracion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,
  valor JSONB NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER configuracion_updated_at
  BEFORE UPDATE ON configuracion
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insertar configuraciones iniciales
INSERT INTO configuracion (clave, valor, descripcion) VALUES
  (
    'serie_facturacion', 
    '{"serie": 2, "ultimo_numero": 230371944}', 
    'Serie y último número de factura emitida'
  ),
  (
    'iva_porcentaje', 
    '21', 
    'Porcentaje de IVA aplicable'
  ),
  (
    'empresa', 
    '{
      "nombre": "A360 Servicios Energéticos S.L.", 
      "cif": "B88313473", 
      "direccion": "C/ Polvoranca Nº 138", 
      "cp": "28923", 
      "ciudad": "Alcorcón", 
      "provincia": "Madrid", 
      "telefono": "91 159 11 70", 
      "email": "clientes@a360se.com", 
      "web": "www.a360se.com"
    }', 
    'Datos de la empresa para facturas'
  );

-- =====================================================
-- Políticas de Seguridad (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Los admins pueden ver todos los perfiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

CREATE POLICY "Los admins pueden modificar todos los perfiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- Políticas para configuracion
CREATE POLICY "Usuarios autenticados pueden leer configuracion"
  ON configuracion FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo admins pueden modificar configuracion"
  ON configuracion FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.rol = 'admin'
    )
  );

-- =====================================================
-- Índices
-- =====================================================
CREATE INDEX idx_profiles_rol ON profiles(rol);
CREATE INDEX idx_profiles_activo ON profiles(activo);
CREATE INDEX idx_configuracion_clave ON configuracion(clave);

