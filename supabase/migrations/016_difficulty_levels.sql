-- Níveis de dificuldade configuráveis (nome + pontuação padrão)

CREATE TABLE difficulty_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  point_value DECIMAL(5,2) NOT NULL DEFAULT 1 CHECK (point_value >= 0),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_difficulty_levels_order ON difficulty_levels(order_index);

COMMENT ON TABLE difficulty_levels IS 'Níveis de dificuldade do sistema — nome e pontuação padrão por acerto';
COMMENT ON COLUMN difficulty_levels.point_value IS 'Pontos padrão atribuídos a questões deste nível';

INSERT INTO difficulty_levels (name, point_value, order_index) VALUES
  ('Fácil', 1, 0),
  ('Médio', 2, 1),
  ('Difícil', 3, 2)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE difficulty_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Root gerenciam difficulty_levels"
  ON difficulty_levels FOR ALL TO authenticated
  USING (public.get_user_role() IN ('root', 'admin'))
  WITH CHECK (public.get_user_role() IN ('root', 'admin'));

CREATE POLICY "Leitura difficulty_levels autenticados"
  ON difficulty_levels FOR SELECT TO authenticated
  USING (true);
