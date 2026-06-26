-- Permite excluir links mesmo com respostas já enviadas (mantém as respostas).

ALTER TABLE form_responses
  DROP CONSTRAINT IF EXISTS form_responses_form_link_id_fkey;

ALTER TABLE form_responses
  ADD CONSTRAINT form_responses_form_link_id_fkey
  FOREIGN KEY (form_link_id) REFERENCES form_links(id) ON DELETE SET NULL;
