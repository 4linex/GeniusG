-- Limita pontuação padrão dos níveis de dificuldade entre 1 e 100

UPDATE difficulty_levels
SET point_value = 1
WHERE point_value < 1;

UPDATE difficulty_levels
SET point_value = 100
WHERE point_value > 100;

ALTER TABLE difficulty_levels
  DROP CONSTRAINT IF EXISTS difficulty_levels_point_value_check;

ALTER TABLE difficulty_levels
  ADD CONSTRAINT difficulty_levels_point_value_check
  CHECK (point_value >= 1 AND point_value <= 100);
