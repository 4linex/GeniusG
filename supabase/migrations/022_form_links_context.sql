-- Contexto por link (município, escola, turma) e área do conhecimento no formulário

ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS componente_curricular TEXT NOT NULL DEFAULT 'Língua Portuguesa';

ALTER TABLE form_links
  ADD COLUMN IF NOT EXISTS municipio TEXT,
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS turma TEXT;

ALTER TABLE form_responses
  ADD COLUMN IF NOT EXISTS municipio TEXT,
  ADD COLUMN IF NOT EXISTS school_name TEXT,
  ADD COLUMN IF NOT EXISTS turma TEXT;

COMMENT ON COLUMN forms.componente_curricular IS 'Área do conhecimento do formulário';
COMMENT ON COLUMN form_links.municipio IS 'Município/local de aplicação do link';
COMMENT ON COLUMN form_links.school_name IS 'Escola de aplicação do link';
COMMENT ON COLUMN form_links.turma IS 'Turma de aplicação do link';
COMMENT ON COLUMN form_responses.municipio IS 'Snapshot do município no envio';
COMMENT ON COLUMN form_responses.school_name IS 'Snapshot da escola no envio';
COMMENT ON COLUMN form_responses.turma IS 'Snapshot da turma no envio';
