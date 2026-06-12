-- Views student_questions / student_alternatives aparecem como UNRESTRICTED no Supabase
-- porque views sem security_invoker rodam com permissões do owner e ignoram RLS.
-- O app não usa essas views (consulta questions / question_alternatives diretamente).

REVOKE SELECT ON student_alternatives FROM anon;
REVOKE SELECT ON student_questions FROM anon;

DROP VIEW IF EXISTS student_alternatives;
DROP VIEW IF EXISTS student_questions;
