-- Escolas iniciais: Igarassu e Goiana (PE); municípios da Bahia (BA)

INSERT INTO schools (name, municipio, state_uf) VALUES
  ('EMEF Municipal de Igarassu', 'Igarassu', 'PE'),
  ('EMEF Municipal de Goiana', 'Goiana', 'PE'),
  ('EMEF Municipal de Conceição da Feira', 'Conceição da Feira', 'BA'),
  ('EMEF Municipal de Coração de Maria', 'Coração de Maria', 'BA'),
  ('EMEF Municipal de Ipecaetá', 'Ipecaetá', 'BA'),
  ('EMEF Municipal de Uauá', 'Uauá', 'BA')
ON CONFLICT (name, municipio, state_uf) DO NOTHING;
