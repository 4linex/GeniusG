ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS school_name TEXT;

COMMENT ON COLUMN forms.school_name IS 'Nome da escola vinculada ao formulário';
