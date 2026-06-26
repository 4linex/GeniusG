import { normalizeRichTextHtml } from '@/lib/richText'

import { IMAGE_BLOCK_CLASS } from '@/lib/richTextImageResize'

export function createInlineImageHtml(url: string): string {
  return `<div class="${IMAGE_BLOCK_CLASS}" data-align="center" style="text-align: center; width: 100%"><img src="${url}" alt="" class="rich-text-image" style="width: 80%; max-width: 100%; height: auto; display: block; margin: 0.75rem auto; border-radius: 0.75rem" /></div>`
}

/** Questões antigas com image_url separado — incorpora no HTML do enunciado. */
export function mergeLegacyQuestionImage(
  enunciado: string,
  imageUrl?: string | null,
): string {
  if (!imageUrl?.trim()) return enunciado
  if (enunciado.includes(imageUrl)) return enunciado

  const block = createInlineImageHtml(imageUrl)
  if (!enunciado.trim()) return block
  return `${enunciado}${block}`
}

export function enunciadoHasInlineImage(html: string, imageUrl?: string | null): boolean {
  if (!imageUrl?.trim()) return false
  return html.includes(imageUrl)
}

export function normalizeEnunciadoWithImages(html: string): string {
  return normalizeRichTextHtml(html)
}
