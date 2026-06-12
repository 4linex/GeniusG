-- Trilhas por faixa de pontuação + link externo

ALTER TABLE learning_trails
  ADD COLUMN IF NOT EXISTS link_url TEXT;

COMMENT ON COLUMN learning_trails.min_score IS 'Pontuação mínima (inclusiva) para receber esta trilha';
COMMENT ON COLUMN learning_trails.max_score IS 'Pontuação máxima (inclusiva) para receber esta trilha';
COMMENT ON COLUMN learning_trails.link_url IS 'URL externa da trilha (alternativa ou complemento ao PDF)';

UPDATE learning_trails SET min_score = 0 WHERE min_score IS NULL;
UPDATE learning_trails SET max_score = 100 WHERE max_score IS NULL;

-- Faixas padrão do documento técnico (escala ponderada 0–90), se trilhas existirem só com nível
UPDATE learning_trails SET min_score = 0, max_score = 44
WHERE nivel_proficiencia = 'inicial' AND (min_score = 0 AND max_score = 100);

UPDATE learning_trails SET min_score = 45, max_score = 67
WHERE nivel_proficiencia = 'intermediario' AND (min_score = 0 AND max_score = 100);

UPDATE learning_trails SET min_score = 68, max_score = 90
WHERE nivel_proficiencia = 'avancado' AND (min_score = 0 AND max_score = 100);
