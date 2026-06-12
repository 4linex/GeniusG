-- Área pedagógica (professor) separada do conteúdo entregue ao aluno

ALTER TABLE learning_trails
  ADD COLUMN IF NOT EXISTS pedagogical_content TEXT,
  ADD COLUMN IF NOT EXISTS pedagogical_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pedagogical_link_url TEXT,
  ADD COLUMN IF NOT EXISTS pedagogical_objectives TEXT,
  ADD COLUMN IF NOT EXISTS teacher_notes TEXT;

COMMENT ON COLUMN learning_trails.pedagogical_content IS 'Orientações pedagógicas completas para o professor';
COMMENT ON COLUMN learning_trails.pedagogical_pdf_url IS 'PDF da trilha completa (professor)';
COMMENT ON COLUMN learning_trails.pedagogical_link_url IS 'Link de recursos pedagógicos (professor)';
COMMENT ON COLUMN learning_trails.pedagogical_objectives IS 'Objetivos de aprendizagem da trilha';
COMMENT ON COLUMN learning_trails.teacher_notes IS 'Notas e orientações de mediação em sala';

COMMENT ON COLUMN learning_trails.title IS 'Título exibido ao aluno';
COMMENT ON COLUMN learning_trails.description IS 'Descrição exibida ao aluno';
COMMENT ON COLUMN learning_trails.content IS 'Conteúdo/texto exibido ao aluno';
COMMENT ON COLUMN learning_trails.pdf_url IS 'PDF do material entregue ao aluno';
COMMENT ON COLUMN learning_trails.link_url IS 'Link externo entregue ao aluno';

-- Preencher área pedagógica a partir dos dados existentes (migração única)
UPDATE learning_trails
SET pedagogical_content = COALESCE(pedagogical_content, content, description)
WHERE pedagogical_content IS NULL
  AND (content IS NOT NULL OR description IS NOT NULL);

UPDATE learning_trails
SET pedagogical_pdf_url = COALESCE(pedagogical_pdf_url, pdf_url)
WHERE pedagogical_pdf_url IS NULL
  AND pdf_url IS NOT NULL;

UPDATE learning_trails
SET pedagogical_link_url = COALESCE(pedagogical_link_url, link_url)
WHERE pedagogical_link_url IS NULL
  AND link_url IS NOT NULL;

-- Anon só enxerga colunas da trilha do aluno (PostgREST respeita column grants)
REVOKE ALL ON learning_trails FROM anon;
GRANT SELECT (
  id,
  title,
  description,
  pdf_url,
  link_url,
  content,
  created_at
) ON learning_trails TO anon;
