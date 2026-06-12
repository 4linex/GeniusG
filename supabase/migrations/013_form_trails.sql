-- Trilhas de recomposição por formulário (faixas de % de acerto)

CREATE TYPE trail_difficulty AS ENUM ('facil', 'medio', 'dificil');

CREATE TABLE form_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  difficulty trail_difficulty NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  min_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_percent DECIMAL(5,2) NOT NULL DEFAULT 100,
  pdf_url TEXT,
  link_url TEXT,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(form_id, difficulty)
);

CREATE INDEX idx_form_trails_form ON form_trails(form_id);

COMMENT ON TABLE form_trails IS 'Trilhas de aprendizagem configuradas por formulário, por faixa de % de acerto';
COMMENT ON COLUMN form_trails.min_percent IS 'Percentual mínimo de acerto (inclusivo) para receber esta trilha';
COMMENT ON COLUMN form_trails.max_percent IS 'Percentual máximo de acerto (inclusivo) para receber esta trilha';

ALTER TABLE student_trail_assignments
  ADD COLUMN IF NOT EXISTS form_trail_id UUID REFERENCES form_trails(id) ON DELETE CASCADE;

ALTER TABLE student_trail_assignments
  ALTER COLUMN trail_id DROP NOT NULL;

ALTER TABLE student_trail_assignments
  DROP CONSTRAINT IF EXISTS student_trail_assignments_trail_required;

ALTER TABLE student_trail_assignments
  ADD CONSTRAINT student_trail_assignments_trail_ref_check
  CHECK (trail_id IS NOT NULL OR form_trail_id IS NOT NULL);

ALTER TABLE form_trails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gerenciam form_trails"
  ON form_trails FOR ALL TO authenticated
  USING (
    public.get_user_role() IN ('root', 'admin')
    OR form_id IN (SELECT id FROM forms WHERE created_by = auth.uid())
    OR form_id IN (SELECT form_id FROM form_links WHERE professor_id = auth.uid())
  )
  WITH CHECK (
    public.get_user_role() IN ('root', 'admin')
    OR form_id IN (SELECT id FROM forms WHERE created_by = auth.uid())
    OR form_id IN (SELECT form_id FROM form_links WHERE professor_id = auth.uid())
  );

CREATE POLICY "Leitura form_trails autenticados e anon"
  ON form_trails FOR SELECT TO authenticated, anon
  USING (true);
