import { RichTextContent } from '@/components/ui/RichTextContent'
import { getYoutubeEmbedUrl } from '@/lib/youtube'

export interface StudentQuestionDisplayProps {
  title: string
  subtitle?: string | null
  enunciado: string
  imageUrl?: string | null
  youtubeUrl?: string | null
  children?: React.ReactNode
}

/** Conteúdo da questão exatamente como o aluno vê — sem pontuação ou metadados. */
export function StudentQuestionDisplay({
  title,
  subtitle,
  enunciado,
  imageUrl,
  youtubeUrl,
  children,
}: StudentQuestionDisplayProps) {
  const embedUrl = youtubeUrl ? getYoutubeEmbedUrl(youtubeUrl) : null

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-bold text-white">{title || 'Sem título'}</h3>
        {subtitle?.trim() && (
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        )}
        <RichTextContent
          html={enunciado}
          className="text-slate-300 mt-3"
          emptyFallback="Sem enunciado"
        />
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="mt-4 rounded-xl max-h-64 object-contain border border-white/10 mx-auto"
          />
        )}
        {embedUrl && (
          <div className="mt-4 rounded-xl overflow-hidden border border-white/10 aspect-video">
            <iframe src={embedUrl} title="Vídeo" className="w-full h-full" allowFullScreen />
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
