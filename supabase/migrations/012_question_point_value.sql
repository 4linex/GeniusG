-- Pontuação configurável por questão (peso no cálculo da nota final)
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS point_value DECIMAL(5,2) NOT NULL DEFAULT 1;

COMMENT ON COLUMN questions.point_value IS 'Pontos concedidos ao acertar esta questão';

UPDATE questions SET point_value = 1 WHERE point_value IS NULL;
