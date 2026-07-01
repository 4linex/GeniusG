-- Questões respondidas por alunos não podem ser apagadas (FK em response_answers).
-- Arquivamento remove do banco ativo preservando o histórico de avaliações.

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_questions_archived_at ON questions(archived_at);

COMMENT ON COLUMN questions.archived_at IS
  'Quando preenchido, a questão está arquivada (oculta do banco) mas preserva respostas históricas.';
