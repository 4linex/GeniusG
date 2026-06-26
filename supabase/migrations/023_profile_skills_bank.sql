-- Local e escola no perfil; banco de habilidades (BNCC, Bloom, SAEB)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS municipio TEXT,
  ADD COLUMN IF NOT EXISTS school_name TEXT;

CREATE TYPE skill_bank_type AS ENUM ('bncc', 'bloom', 'saeb');

CREATE TABLE skill_bank_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type skill_bank_type NOT NULL,
  code TEXT,
  label TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skill_bank_items_type_order ON skill_bank_items(type, order_index);

COMMENT ON TABLE skill_bank_items IS 'Banco de habilidades BNCC, níveis de Bloom e descritores SAEB';

INSERT INTO skill_bank_items (type, label, order_index) VALUES
  ('bloom', 'Lembrar', 0),
  ('bloom', 'Compreender', 1),
  ('bloom', 'Aplicar', 2),
  ('bloom', 'Analisar', 3),
  ('bloom', 'Avaliar', 4),
  ('bloom', 'Criar', 5);

ALTER TABLE skill_bank_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Root gerenciam skill_bank_items"
  ON skill_bank_items FOR ALL TO authenticated
  USING (public.get_user_role() IN ('root', 'admin'))
  WITH CHECK (public.get_user_role() IN ('root', 'admin'));

CREATE POLICY "Leitura skill_bank_items autenticados"
  ON skill_bank_items FOR SELECT TO authenticated
  USING (true);
