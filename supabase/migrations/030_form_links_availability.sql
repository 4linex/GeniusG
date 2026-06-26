-- Janela de disponibilidade opcional por link (início e fim)

ALTER TABLE form_links
  ADD COLUMN IF NOT EXISTS available_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS available_until TIMESTAMPTZ;

COMMENT ON COLUMN form_links.available_from IS 'Data/hora a partir da qual o link aceita respostas (null = imediato)';
COMMENT ON COLUMN form_links.available_until IS 'Data/hora até a qual o link aceita respostas (null = sem prazo)';
