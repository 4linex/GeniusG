-- Banco de escolas (nome + município/UF) para cadastro de professores e filtros do sistema

CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  municipio TEXT NOT NULL,
  state_uf CHAR(2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, municipio, state_uf)
);

CREATE INDEX idx_schools_municipio ON schools(municipio);
CREATE INDEX idx_schools_state_uf ON schools(state_uf);

COMMENT ON TABLE schools IS 'Escolas cadastradas no sistema com nome e localização (município + UF)';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_school_id ON profiles(school_id);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Root gerenciam schools"
  ON schools FOR ALL TO authenticated
  USING (public.get_user_role() IN ('root', 'admin'))
  WITH CHECK (public.get_user_role() IN ('root', 'admin'));

CREATE POLICY "Leitura schools autenticados"
  ON schools FOR SELECT TO authenticated
  USING (true);
