-- Série/ano escolar do item no banco de habilidades (ex.: 5º Ano para descritores SAEB)

ALTER TABLE skill_bank_items
  ADD COLUMN IF NOT EXISTS ano_serie TEXT;

COMMENT ON COLUMN skill_bank_items.ano_serie IS 'Série ou ano escolar do descritor/habilidade (ex.: 5º Ano, 9º Ano)';
