-- Múltiplos municípios, escolas e vínculos por perfil (admin/professor)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS municipios TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS school_names TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS school_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN profiles.municipios IS 'Municípios de atuação (formato "Cidade - UF")';
COMMENT ON COLUMN profiles.school_names IS 'Escolas vinculadas ao perfil';
COMMENT ON COLUMN profiles.school_ids IS 'IDs das escolas vinculadas';

UPDATE profiles
SET
  municipios = CASE
    WHEN municipio IS NOT NULL AND TRIM(municipio) <> '' THEN ARRAY[TRIM(municipio)]
    ELSE municipios
  END,
  school_names = CASE
    WHEN school_name IS NOT NULL AND TRIM(school_name) <> '' THEN ARRAY[TRIM(school_name)]
    ELSE school_names
  END,
  school_ids = CASE
    WHEN school_id IS NOT NULL THEN ARRAY[school_id]
    ELSE school_ids
  END
WHERE
  (municipio IS NOT NULL AND TRIM(municipio) <> '')
  OR (school_name IS NOT NULL AND TRIM(school_name) <> '')
  OR school_id IS NOT NULL;
