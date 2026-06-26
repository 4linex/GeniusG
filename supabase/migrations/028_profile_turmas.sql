-- Turmas vinculadas ao perfil do professor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS turmas TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN profiles.turmas IS 'Turmas do professor na escola vinculada (nomes cadastrados em school_classes)';
