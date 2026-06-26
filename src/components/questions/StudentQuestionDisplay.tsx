import { RichTextContent } from '@/components/ui/RichTextContent'
import { enunciadoHasInlineImage } from '@/lib/richTextImages'
import { getYoutubeEmbedUrl } from '@/lib/youtube'

export interface StudentQuestionDisplayProps {
  title: string
  subtitle?: string | null
  enunciado: string
  imageUrl?: string | null
  youtubeUrl?: string | null
  children?: React.ReactNode
  variant?: 'dark' | 'exam'
}

/** Conteúdo da questão exatamente como o aluno vê — sem pontuação ou metadados. */
export function StudentQuestionDisplay({
  title,
  subtitle,
  enunciado,
  imageUrl,
  youtubeUrl,
  children,
  variant = 'dark',
}: StudentQuestionDisplayProps) {
  const embedUrl = youtubeUrl ? getYoutubeEmbedUrl(youtubeUrl) : null
  const isExam = variant === 'exam'
  const showLegacyImage = imageUrl && !enunciadoHasInlineImage(enunciado, imageUrl)

  return (
    <div className="space-y-4 select-none">
      <div>
        <h3 className={isExam ? 'text-2xl font-bold text-gray-900' : 'text-xl font-bold text-white'}>
          {title || 'Sem título'}
        </h3>
        {subtitle?.trim() && (
          <p className={isExam ? 'text-sm text-gray-500 mt-1' : 'text-sm text-slate-400 mt-1'}>{subtitle}</p>
        )}
        <RichTextContent
          html={enunciado}
          tone={isExam ? 'light' : 'dark'}
          className={isExam ? 'mt-4 text-base' : 'text-slate-300 mt-3'}
          emptyFallback="Sem enunciado"
        />
        {showLegacyImage && (
          <img
            src={imageUrl}
            alt=""
            className={
              isExam
                ? 'mt-4 rounded-xl max-h-64 object-contain border border-gray-200 mx-auto'
                : 'mt-4 rounded-xl max-h-64 object-contain border border-white/10 mx-auto'
            }
          />
        )}
        {embedUrl && (
          <div
            className={
              isExam
                ? 'mt-4 rounded-xl overflow-hidden border border-gray-200 aspect-video'
                : 'mt-4 rounded-xl overflow-hidden border border-white/10 aspect-video'
            }
          >
            <iframe src={embedUrl} title="Vídeo" className="w-full h-full" allowFullScreen />
          </div>
        )}
      </div>
      {children}
    </div>
  )
}
