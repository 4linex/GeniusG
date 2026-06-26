import { cn } from '@/lib/utils'
import { looksLikeHtml, normalizeRichTextHtml, stripHtml } from '@/lib/richText'

interface RichTextContentProps {
  html: string
  className?: string
  emptyFallback?: string
  /** `light` = fundo claro (formulário do aluno); padrão = fundo escuro do app */
  tone?: 'dark' | 'light'
}

export function RichTextContent({
  html: rawHtml,
  className,
  emptyFallback = '',
  tone = 'dark',
}: RichTextContentProps) {
  const toneClass = tone === 'light' ? 'rich-text-content--light' : ''

  if (!stripHtml(rawHtml)) {
    return emptyFallback ? (
      <p className={cn('italic', tone === 'light' ? 'text-gray-500' : 'text-slate-500', className)}>
        {emptyFallback}
      </p>
    ) : null
  }

  if (!looksLikeHtml(rawHtml)) {
    return (
      <p className={cn('whitespace-pre-wrap leading-relaxed', toneClass, className)}>{rawHtml}</p>
    )
  }

  const normalized = normalizeRichTextHtml(rawHtml, { stripAllColors: tone === 'light' })

  return (
    <div
      className={cn('rich-text-content leading-relaxed', toneClass, className)}
      dangerouslySetInnerHTML={{ __html: normalized }}
    />
  )
}
