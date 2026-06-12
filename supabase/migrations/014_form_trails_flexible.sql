-- Trilhas flexíveis por formulário: faixas de % definidas pelo criador

ALTER TABLE form_trails DROP CONSTRAINT IF EXISTS form_trails_form_id_difficulty_key;

ALTER TABLE form_trails
  ALTER COLUMN difficulty DROP NOT NULL;

ALTER TABLE form_trails
  ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN form_trails.min_percent IS 'Percentual mínimo de acerto (inclusivo) — definido pelo criador do formulário';
COMMENT ON COLUMN form_trails.max_percent IS 'Percentual máximo de acerto (inclusivo) — definido pelo criador do formulário';
