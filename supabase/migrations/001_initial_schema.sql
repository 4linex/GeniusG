-- RDA MVP: Schema inicial
-- Foco: 5º Ano · Língua Portuguesa

CREATE TYPE user_role AS ENUM ('root', 'admin', 'professor', 'aluno');

-- Perfis de usuário (vinculados ao auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'aluno',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Questões
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  enunciado TEXT NOT NULL,
  codigo_item TEXT,
  componente_curricular TEXT NOT NULL DEFAULT 'Língua Portuguesa',
  conteudo_programatico TEXT,
  ano_serie TEXT NOT NULL DEFAULT '5º Ano',
  descritor_saeb TEXT,
  habilidade_bncc TEXT,
  nivel_bloom TEXT,
  nivel_dificuldade TEXT,
  tempo_medio_resolucao INTEGER,
  tipo_texto_base TEXT,
  fonte TEXT,
  image_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alternativas das questões
CREATE TABLE question_alternatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  letter TEXT NOT NULL,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Formulários
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relação formulário ↔ questões
CREATE TABLE form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  UNIQUE(form_id, question_id)
);

-- Links de formulário (professor gera para alunos)
CREATE TABLE form_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  professor_id UUID NOT NULL REFERENCES profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Respostas dos alunos (1 por email por formulário)
CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  form_link_id UUID REFERENCES form_links(id),
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  score DECIMAL(5,2),
  total_questions INTEGER,
  correct_answers INTEGER,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(form_id, student_email)
);

-- Respostas individuais por questão
CREATE TABLE response_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  selected_alternative_id UUID REFERENCES question_alternatives(id),
  is_correct BOOLEAN
);

-- Trilhas de recomposição/aprendizagem
CREATE TABLE learning_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  min_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_score DECIMAL(5,2) NOT NULL DEFAULT 100,
  pdf_url TEXT,
  content TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Atribuição de trilha ao aluno após resposta
CREATE TABLE student_trail_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES form_responses(id) ON DELETE CASCADE,
  trail_id UUID NOT NULL REFERENCES learning_trails(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(response_id)
);

-- Índices
CREATE INDEX idx_questions_ano ON questions(ano_serie);
CREATE INDEX idx_form_links_slug ON form_links(slug);
CREATE INDEX idx_form_responses_form ON form_responses(form_id);
CREATE INDEX idx_form_responses_email ON form_responses(student_email);
CREATE INDEX idx_response_answers_response ON response_answers(response_id);

-- Storage bucket para imagens
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_trail_assignments ENABLE ROW LEVEL SECURITY;

-- Helper: obter role do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles
CREATE POLICY "Usuários autenticados podem ver seu perfil"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_role() IN ('root', 'admin'));

CREATE POLICY "Root/Admin podem ver todos os perfis"
  ON profiles FOR SELECT TO authenticated
  USING (get_user_role() IN ('root', 'admin'));

-- Questions: admin/root CRUD, professor read, anon read via form (limited fields via view)
CREATE POLICY "Admin/Root gerenciam questões"
  ON questions FOR ALL TO authenticated
  USING (get_user_role() IN ('root', 'admin'))
  WITH CHECK (get_user_role() IN ('root', 'admin'));

CREATE POLICY "Professor pode ler questões"
  ON questions FOR SELECT TO authenticated
  USING (get_user_role() IN ('root', 'admin', 'professor'));

CREATE POLICY "Anon pode ler questões (campos limitados no frontend)"
  ON questions FOR SELECT TO anon
  USING (true);

-- Alternatives
CREATE POLICY "Admin/Root gerenciam alternativas"
  ON question_alternatives FOR ALL TO authenticated
  USING (get_user_role() IN ('root', 'admin'))
  WITH CHECK (get_user_role() IN ('root', 'admin'));

CREATE POLICY "Anon pode ler alternativas (sem is_correct exposto no frontend)"
  ON question_alternatives FOR SELECT TO anon
  USING (true);

CREATE POLICY "Professor pode ler alternativas"
  ON question_alternatives FOR SELECT TO authenticated
  USING (get_user_role() IN ('root', 'admin', 'professor'));

-- Forms
CREATE POLICY "Admin/Root gerenciam formulários"
  ON forms FOR ALL TO authenticated
  USING (get_user_role() IN ('root', 'admin'))
  WITH CHECK (get_user_role() IN ('root', 'admin'));

CREATE POLICY "Professor pode ler formulários ativos"
  ON forms FOR SELECT TO authenticated
  USING (get_user_role() IN ('root', 'admin', 'professor') AND is_active = true);

CREATE POLICY "Anon pode ler formulários ativos"
  ON forms FOR SELECT TO anon
  USING (is_active = true);

-- Form questions
CREATE POLICY "Admin/Root gerenciam form_questions"
  ON form_questions FOR ALL TO authenticated
  USING (get_user_role() IN ('root', 'admin'))
  WITH CHECK (get_user_role() IN ('root', 'admin'));

CREATE POLICY "Anon pode ler form_questions"
  ON form_questions FOR SELECT TO anon
  USING (true);

CREATE POLICY "Professor pode ler form_questions"
  ON form_questions FOR SELECT TO authenticated
  USING (get_user_role() IN ('root', 'admin', 'professor'));

-- Form links
CREATE POLICY "Professor gerencia seus links"
  ON form_links FOR ALL TO authenticated
  USING (get_user_role() IN ('root', 'admin') OR professor_id = auth.uid())
  WITH CHECK (get_user_role() IN ('root', 'admin') OR professor_id = auth.uid());

CREATE POLICY "Anon pode ler links ativos"
  ON form_links FOR SELECT TO anon
  USING (is_active = true);

-- Form responses
CREATE POLICY "Anon pode inserir respostas"
  ON form_responses FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Anon pode verificar resposta existente"
  ON form_responses FOR SELECT TO anon
  USING (true);

CREATE POLICY "Professor vê respostas dos seus links"
  ON form_responses FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('root', 'admin')
    OR form_link_id IN (SELECT id FROM form_links WHERE professor_id = auth.uid())
  );

-- Response answers
CREATE POLICY "Anon pode inserir respostas individuais"
  ON response_answers FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Professor vê respostas individuais"
  ON response_answers FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('root', 'admin')
    OR response_id IN (
      SELECT fr.id FROM form_responses fr
      JOIN form_links fl ON fr.form_link_id = fl.id
      WHERE fl.professor_id = auth.uid()
    )
  );

-- Learning trails
CREATE POLICY "Admin/Root gerenciam trilhas"
  ON learning_trails FOR ALL TO authenticated
  USING (get_user_role() IN ('root', 'admin'))
  WITH CHECK (get_user_role() IN ('root', 'admin'));

CREATE POLICY "Professor/Anon podem ler trilhas"
  ON learning_trails FOR SELECT TO authenticated, anon
  USING (true);

-- Trail assignments
CREATE POLICY "Anon pode inserir atribuições"
  ON student_trail_assignments FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Professor vê atribuições"
  ON student_trail_assignments FOR SELECT TO authenticated
  USING (get_user_role() IN ('root', 'admin', 'professor'));

-- Storage policies
CREATE POLICY "Admin/Root upload imagens"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'question-images' AND get_user_role() IN ('root', 'admin'));

CREATE POLICY "Todos podem ver imagens"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'question-images');

-- Trigger: criar profile ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'aluno'::public.user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
