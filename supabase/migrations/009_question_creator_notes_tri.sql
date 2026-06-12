ALTER TABLE questions
  ADD COLUMN creator_notes TEXT,
  ADD COLUMN tri_calibrated_at TIMESTAMPTZ,
  ADD COLUMN tri_response_count INTEGER DEFAULT 0;

COMMENT ON COLUMN questions.creator_notes IS 'Anotações privadas do criador (gabarito, resolução) — visível apenas ao criador e admin/root';
COMMENT ON COLUMN questions.tri_calibrated_at IS 'Data da última calibração TRI automática com base nas respostas';
COMMENT ON COLUMN questions.tri_response_count IS 'Número de respostas usadas na calibração TRI';
