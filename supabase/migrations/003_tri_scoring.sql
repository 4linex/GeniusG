-- Parâmetros TRI (3PL) nas questões e proficiência nas respostas

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS param_dificuldade DECIMAL(6,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS param_discriminacao DECIMAL(6,3) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS param_acerto_caso DECIMAL(4,3) DEFAULT 0.25;

COMMENT ON COLUMN questions.param_dificuldade IS 'Parâmetro b (dificuldade) — TRI 3PL';
COMMENT ON COLUMN questions.param_discriminacao IS 'Parâmetro a (discriminação) — TRI 3PL';
COMMENT ON COLUMN questions.param_acerto_caso IS 'Parâmetro c (acerto ao acaso) — TRI 3PL';

CREATE TYPE nivel_proficiencia AS ENUM ('inicial', 'intermediario', 'avancado');

ALTER TABLE form_responses
  ADD COLUMN IF NOT EXISTS percentual_acerto DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS theta DECIMAL(6,3),
  ADD COLUMN IF NOT EXISTS nivel_proficiencia nivel_proficiencia;

-- Migrar score existente para percentual_acerto
UPDATE form_responses SET percentual_acerto = score WHERE percentual_acerto IS NULL AND score IS NOT NULL;

-- Trilhas vinculadas ao nível de proficiência (PRD Épico 3.3 / 4.1)
ALTER TABLE learning_trails
  ADD COLUMN IF NOT EXISTS nivel_proficiencia nivel_proficiencia;

-- Remover dependência de faixa percentual como critério principal
ALTER TABLE learning_trails
  ALTER COLUMN min_score DROP NOT NULL,
  ALTER COLUMN max_score DROP NOT NULL;

-- Bucket para PDFs de trilhas (upload pelo admin)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trail-pdfs', 'trail-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin/Root upload PDFs trilhas"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'trail-pdfs' AND get_user_role() IN ('root', 'admin'));

CREATE POLICY "Autenticados veem PDFs trilhas"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'trail-pdfs');
