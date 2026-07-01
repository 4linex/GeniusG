import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute, PublicRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/pages/LoginPage'
import { FormAssessmentDetailPage } from '@/pages/dashboard/FormAssessmentDetailPage'
import { FormStudentResponsePage } from '@/pages/dashboard/FormStudentResponsePage'
import { QuestionsPage } from '@/pages/admin/QuestionsPage'
import { ComponentQuestionsPage } from '@/pages/admin/ComponentQuestionsPage'
import { QuestionFormPage } from '@/pages/admin/QuestionFormPage'
import { GeneralSettingsPage } from '@/pages/admin/GeneralSettingsPage'
import { AdminTrailsPage } from '@/pages/admin/AdminTrailsPage'
import { FormsHubPage } from '@/pages/forms/FormsHubPage'
import { ComponentFormsPage } from '@/pages/forms/ComponentFormsPage'
import { FormViewPage } from '@/pages/forms/FormViewPage'
import { ReportsLayout } from '@/pages/professor/ReportsLayout'
import { ProfessorTrailsPage } from '@/pages/professor/ProfessorTrailsPage'
import { StudentFormAccessPage } from '@/pages/student/StudentFormAccessPage'
import { StudentFormFillPage } from '@/pages/student/StudentFormFillPage'

const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const FormBuilderPage = lazy(() =>
  import('@/pages/forms/FormBuilderPage').then((m) => ({ default: m.FormBuilderPage })),
)
const ResponsesPage = lazy(() =>
  import('@/pages/professor/ResponsesPage').then((m) => ({ default: m.ResponsesPage })),
)
const StudentDetailPage = lazy(() =>
  import('@/pages/professor/StudentDetailPage').then((m) => ({ default: m.StudentDetailPage })),
)
const FormReportPage = lazy(() =>
  import('@/pages/professor/FormReportPage').then((m) => ({ default: m.FormReportPage })),
)
const FormReportDetailPage = lazy(() =>
  import('@/pages/professor/FormReportDetailPage').then((m) => ({
    default: m.FormReportDetailPage,
  })),
)
const SkillsReportPage = lazy(() =>
  import('@/pages/professor/SkillsReportPage').then((m) => ({ default: m.SkillsReportPage })),
)

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
    </div>
  )
}

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

function LazyFormBuilder() {
  return (
    <LazyPage>
      <FormBuilderPage />
    </LazyPage>
  )
}

function RedirectLegacyStudentDetail() {
  const { email } = useParams()
  return <Navigate to={`/professor/relatorios/aluno/${email}`} replace />
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas públicas — aluno */}
          <Route path="/f/:slug" element={<StudentFormAccessPage />} />
          <Route path="/f/:slug/responder" element={<StudentFormFillPage />} />

          {/* Login */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>

          {/* Rotas autenticadas */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route
                path="/dashboard"
                element={
                  <LazyPage>
                    <DashboardPage />
                  </LazyPage>
                }
              />
              <Route path="/dashboard/avaliacoes/:formId" element={<FormAssessmentDetailPage />} />
              <Route
                path="/dashboard/avaliacoes/:formId/resposta/:responseId"
                element={<FormStudentResponsePage />}
              />
              <Route path="/formularios" element={<FormsHubPage />} />
              <Route path="/formularios/componente/:componentSlug" element={<ComponentFormsPage />} />
              <Route path="/formularios/:id/visualizar" element={<FormViewPage />} />

              {/* Admin + Root — criar/editar formulários e questões */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'root']} />}>
                <Route path="/formularios/novo" element={<LazyFormBuilder />} />
                <Route path="/formularios/:id" element={<LazyFormBuilder />} />
                <Route path="/admin/questoes" element={<QuestionsPage />} />
                <Route path="/admin/questoes/componente/:componentSlug" element={<ComponentQuestionsPage />} />
                <Route path="/admin/questoes/nova" element={<QuestionFormPage />} />
                <Route path="/admin/questoes/:id" element={<QuestionFormPage />} />
                <Route path="/admin/configuracoes" element={<GeneralSettingsPage />} />
                <Route path="/admin/professores" element={<Navigate to="/admin/configuracoes" replace />} />
                <Route path="/admin/trilhas" element={<AdminTrailsPage />} />
              </Route>

              {/* Professor, Admin + Root */}
              <Route element={<ProtectedRoute allowedRoles={['professor', 'admin']} />}>
                <Route path="/professor/trilhas" element={<ProfessorTrailsPage />} />
                <Route
                  path="/professor/relatorios/aluno/:email"
                  element={
                    <LazyPage>
                      <StudentDetailPage />
                    </LazyPage>
                  }
                />
                <Route path="/professor/relatorios" element={<ReportsLayout />}>
                  <Route index element={<Navigate to="alunos" replace />} />
                  <Route
                    path="alunos"
                    element={
                      <LazyPage>
                        <ResponsesPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="formulario"
                    element={
                      <LazyPage>
                        <FormReportPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="formulario/:formId"
                    element={
                      <LazyPage>
                        <FormReportDetailPage />
                      </LazyPage>
                    }
                  />
                  <Route
                    path="habilidades"
                    element={
                      <LazyPage>
                        <SkillsReportPage />
                      </LazyPage>
                    }
                  />
                </Route>
                <Route path="/professor/respostas" element={<Navigate to="/professor/relatorios/alunos" replace />} />
                <Route path="/professor/respostas/aluno/:email" element={<RedirectLegacyStudentDetail />} />
                <Route path="/professor/relatorios/individual" element={<Navigate to="/professor/relatorios/alunos" replace />} />
              </Route>

              {/* Redirects legados */}
              <Route path="/admin/formularios/novo" element={<Navigate to="/formularios/novo" replace />} />
              <Route path="/admin/formularios/:id" element={<Navigate to="/formularios/:id" replace />} />
              <Route path="/admin/formularios" element={<Navigate to="/formularios" replace />} />
              <Route path="/professor/links" element={<Navigate to="/formularios" replace />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
