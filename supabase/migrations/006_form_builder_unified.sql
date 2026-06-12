-- Modo do formulário, metadados de turma e configurações de design/tela final
CREATE TYPE form_mode AS ENUM ('padrao', 'gamificado');

ALTER TABLE forms
  ADD COLUMN form_mode form_mode NOT NULL DEFAULT 'padrao',
  ADD COLUMN turma TEXT NOT NULL DEFAULT '5º Ano',
  ADD COLUMN final_screen_title TEXT DEFAULT 'Obrigado!',
  ADD COLUMN final_screen_message TEXT DEFAULT 'Suas respostas foram registradas com sucesso. Seu professor receberá o diagnóstico completo.',
  ADD COLUMN design_accent TEXT DEFAULT '#14b8a6';

-- Questões criadas diretamente no builder (não aparecem no banco geral)
ALTER TABLE questions
  ADD COLUMN is_form_exclusive BOOLEAN NOT NULL DEFAULT false;
