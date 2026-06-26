-- Separação pedagógica: tópico SAEB, Bloom sugerido e relações SAEB ↔ BNCC

ALTER TABLE skill_bank_items
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS bloom_hint TEXT;

CREATE TABLE IF NOT EXISTS skill_bank_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saeb_item_id UUID NOT NULL REFERENCES skill_bank_items(id) ON DELETE CASCADE,
  bncc_item_id UUID NOT NULL REFERENCES skill_bank_items(id) ON DELETE CASCADE,
  is_essential BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (saeb_item_id, bncc_item_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_bank_relations_saeb ON skill_bank_relations(saeb_item_id);
CREATE INDEX IF NOT EXISTS idx_skill_bank_relations_bncc ON skill_bank_relations(bncc_item_id);

ALTER TABLE skill_bank_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/Root gerenciam skill_bank_relations"
  ON skill_bank_relations FOR ALL TO authenticated
  USING (public.get_user_role() IN ('root', 'admin'))
  WITH CHECK (public.get_user_role() IN ('root', 'admin'));

CREATE POLICY "Leitura skill_bank_relations autenticados"
  ON skill_bank_relations FOR SELECT TO authenticated
  USING (true);

COMMENT ON TABLE skill_bank_relations IS 'Cruzamento matriz pedagógica: descritores SAEB e habilidades BNCC';
COMMENT ON COLUMN skill_bank_items.topic IS 'Tópico SAEB (ex.: I. Procedimentos de leitura)';
COMMENT ON COLUMN skill_bank_items.bloom_hint IS 'Nível cognitivo Bloom predominante sugerido para o descritor SAEB';
