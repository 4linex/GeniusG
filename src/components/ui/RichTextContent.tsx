import { cn } from '@/lib/utils'
import { looksLikeHtml, normalizeRichTextHtml, stripHtml } from '@/lib/richText'

interface RichTextContentProps {
  html: string
  className?: string
  emptyFallback?: string
}

export function RichTextContent({
  html: rawHtml,
  className,
  emptyFallback = '',
}: RichTextContentProps) {
  if (!stripHtml(rawHtml)) {
    return emptyFallback ? (
      <p className={cn('text-slate-500 italic', className)}>{emptyFallback}</p>
    ) : null
  }

  if (!looksLikeHtml(rawHtml)) {
    return (
      <p className={cn('whitespace-pre-wrap leading-relaxed', className)}>{rawHtml}</p>
    )
  }

  const normalized = normalizeRichTextHtml(rawHtml)

  return (
    <div
      className={cn('rich-text-content leading-relaxed', className)}
      dangerouslySetInnerHTML={{ __html: normalized }}
    />
  )
}
