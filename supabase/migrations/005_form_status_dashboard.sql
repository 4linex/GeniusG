-- Status do formulário + meta de alunos + correção RLS

CREATE TYPE form_status AS ENUM ('em_andamento', 'concluido');

ALTER TABLE forms
  ADD COLUMN IF NOT EXISTS status form_status NOT NULL DEFAULT 'em_andamento',
  ADD COLUMN IF NOT EXISTS expected_students INTEGER;

COMMENT ON COLUMN forms.status IS 'Em andamento ou concluído';
COMMENT ON COLUMN forms.expected_students IS 'Total esperado de alunos (opcional, para dashboard)';

-- Corrige função de role usada nas policies
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Professor pode ler formulários dos seus links (mesmo inativos)
DROP POLICY IF EXISTS "Professor pode ler formulários ativos" ON forms;

CREATE POLICY "Professor pode ler formulários"
  ON forms FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('root', 'admin')
    OR (
      public.get_user_role() = 'professor'
      AND (
        is_active = true
        OR id IN (SELECT form_id FROM public.form_links WHERE professor_id = auth.uid())
      )
    )
  );

-- Professor pode atualizar status dos formulários que aplicou
CREATE POLICY "Professor atualiza status do formulário"
  ON forms FOR UPDATE TO authenticated
  USING (
    public.get_user_role() IN ('root', 'admin')
    OR id IN (SELECT form_id FROM public.form_links WHERE professor_id = auth.uid())
  )
  WITH CHECK (
    public.get_user_role() IN ('root', 'admin')
    OR id IN (SELECT form_id FROM public.form_links WHERE professor_id = auth.uid())
  );

-- Admin/root leem todas respostas (já parcialmente coberto)
CREATE POLICY "Admin/Root veem todas respostas"
  ON form_responses FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('root', 'admin'));

CREATE POLICY "Admin/Root veem todas respostas individuais"
  ON response_answers FOR SELECT TO authenticated
  USING (public.get_user_role() IN ('root', 'admin'));
