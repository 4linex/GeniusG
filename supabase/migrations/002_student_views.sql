-- View pública de questões para alunos (sem metadados pedagógicos)
CREATE OR REPLACE VIEW student_questions AS
SELECT
  id,
  title,
  enunciado,
  image_url
FROM questions;

-- View pública de alternativas (sem is_correct)
CREATE OR REPLACE VIEW student_alternatives AS
SELECT
  id,
  question_id,
  letter,
  text,
  image_url,
  order_index
FROM question_alternatives;

GRANT SELECT ON student_questions TO anon;
GRANT SELECT ON student_alternatives TO anon;
