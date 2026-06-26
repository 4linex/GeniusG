-- Turmas vinculadas às escolas cadastradas

CREATE TABLE school_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, name)
);

CREATE INDEX idx_school_classes_school_id ON school_classes(school_id);

COMMENT ON TABLE school_classes IS 'Turmas cadastradas por escola (ex.: 5º A, 6º matutino)';

ALTER TABLE school_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Root gerenciam school_classes"
  ON school_classes FOR ALL TO authenticated
  USING (public.get_user_role() IN ('root', 'admin'))
  WITH CHECK (public.get_user_role() IN ('root', 'admin'));

CREATE POLICY "Leitura school_classes autenticados"
  ON school_classes FOR SELECT TO authenticated
  USING (true);
