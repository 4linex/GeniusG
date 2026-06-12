-- Vincula trilhas do formulário ao banco global (learning_trails)

ALTER TABLE form_trails
  ADD COLUMN IF NOT EXISTS learning_trail_id UUID REFERENCES learning_trails(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_form_trails_learning_trail ON form_trails(learning_trail_id);

ALTER TABLE form_trails
  ALTER COLUMN title DROP NOT NULL;

COMMENT ON COLUMN form_trails.learning_trail_id IS 'Trilha do banco global — conteúdo vem de learning_trails';
COMMENT ON TABLE learning_trails IS 'Banco de trilhas — cadastro simples; faixas de % são definidas por formulário em form_trails';

COMMENT ON COLUMN learning_trails.min_score IS 'Legado — não usado; faixas ficam em form_trails';
COMMENT ON COLUMN learning_trails.max_score IS 'Legado — não usado; faixas ficam em form_trails';
