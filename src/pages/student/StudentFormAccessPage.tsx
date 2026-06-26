import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sparkles, Gamepad2 } from 'lucide-react'
import { APP_BADGE } from '@/lib/branding'
import { GamifiedEmojiBackground } from '@/components/student/GamifiedEmojiBackground'
import type { FormMode } from '@/types/database'
import { cn } from '@/lib/utils'
import { requestExamFullscreen } from '@/hooks/useExamLockdown'

export function StudentFormAccessPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [formTitle, setFormTitle] = useState('')
  const [formMode, setFormMode] = useState<FormMode>('padrao')
  const [designAccent, setDesignAccent] = useState('#14b8a6')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: link, error: linkError } = await supabase
        .from('form_links')
        .select('*, form:forms(title, is_active, form_mode, design_accent)')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      if (linkError || !link) {
        setError('Link de formulário inválido ou expirado.')
        setLoading(false)
        return
      }

      const rawForm = link.form
      const form = (Array.isArray(rawForm) ? rawForm[0] : rawForm) as {
        title: string
        is_active: boolean
        form_mode?: FormMode
        design_accent?: string | null
      } | null
      if (!form?.is_active) {
        setError('Este formulário não está mais ativo.')
        setLoading(false)
        return
      }

      setFormTitle(form.title)
      setFormMode(form.form_mode || 'padrao')
      setDesignAccent(form.design_accent || '#14b8a6')
      setLoading(false)
    }
    load()
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChecking(true)
    setError('')

    const { data: link } = await supabase
      .from('form_links')
      .select('form_id')
      .eq('slug', slug)
      .single()

    if (!link) {
      setError('Link inválido')
      setChecking(false)
      return
    }

    const { data: existing } = await supabase
      .from('form_responses')
      .select('id')
      .eq('form_id', link.form_id)
      .eq('student_email', email.toLowerCase().trim())
      .maybeSingle()

    if (existing) {
      setError('Você já respondeu este formulário. Cada aluno pode responder apenas uma vez.')
      setChecking(false)
      return
    }

    sessionStorage.setItem(
      `form_session_${slug}`,
      JSON.stringify({ name: name.trim(), email: email.toLowerCase().trim() }),
    )

    await requestExamFullscreen()
    navigate(`/f/${slug}/responder`)
    setChecking(false)
  }

  const isGamified = formMode === 'gamificado'
  const accent = designAccent

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  return (
    <div
      className={cn('min-h-screen flex items-center justify-center p-4 relative overflow-hidden', !isGamified && 'bg-[#080c14]')}
      style={isGamified ? { background: `linear-gradient(135deg, #080c14 0%, ${accent}15 100%)` } : undefined}
    >
      {isGamified ? (
        <GamifiedEmojiBackground />
      ) : (
        <>
          <div className="absolute inset-0 gradient-bg opacity-10" />
          <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
        </>
      )}

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4',
              isGamified ? 'text-teal-300' : 'bg-primary-500/20 text-primary-300',
            )}
            style={isGamified ? { backgroundColor: `${accent}25` } : undefined}
          >
            {isGamified ? <Gamepad2 size={14} /> : <Sparkles size={14} />}
            {isGamified ? 'Modo gamificado' : APP_BADGE}
          </div>
          {formTitle && (
            <h1 className="text-2xl font-bold text-white mb-2">{formTitle}</h1>
          )}
          <p className="text-slate-400">Informe seus dados para começar</p>
        </div>

        {error && !formTitle ? (
          <div className="glass rounded-2xl p-8 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className={cn('glass rounded-2xl p-8 space-y-5', isGamified && 'border border-white/10')}
            style={isGamified ? { boxShadow: `0 0 40px ${accent}15` } : undefined}
          >
            <Input
              label="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome completo"
              required
            />
            <Input
              label="Seu e-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={checking}
              style={isGamified ? { backgroundColor: accent } : undefined}
            >
              {isGamified ? 'Começar aventura 🚀' : 'Começar'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
