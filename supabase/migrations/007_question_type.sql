CREATE TYPE question_type AS ENUM (
  'texto_curto',
  'texto_longo',
  'multipla_escolha',
  'avaliacao',
  'escala_likert',
  'nps',
  'ranking',
  'slider',
  'email',
  'telefone',
  'data',
  'upload_arquivo',
  'resultado'
);

ALTER TABLE questions
  ADD COLUMN question_type question_type NOT NULL DEFAULT 'multipla_escolha';
